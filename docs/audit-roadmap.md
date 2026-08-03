# Roadmap de auditoría — reglas FIVB, sockets, estadísticas, visual

> Generado a partir de una auditoría completa pedida por el usuario (funcional + visual), con foco explícito en:
> reglas oficiales de voleibol (FIVB) para rotación/posicionamiento/sustituciones, la arquitectura de sincronización
> en tiempo real (WebSockets), y la exactitud de las estadísticas del partido.
>
> Este documento es la fuente de verdad para retomar el trabajo en una sesión nueva sin necesitar el contexto de
> la conversación original. Cada ítem tiene: qué se encontró, dónde, por qué importa, y qué implica corregirlo.
> Marca `[x]` según se vaya completando y añade la fecha/commit al cerrar cada ítem.

## Contexto del proyecto

- App: marcador de voleibol para transmisión (Vue 3 + Pinia + Vite), backend propio en `scripts/production-server.mjs`
  (Node + better-sqlite3, sin framework), sync en tiempo real vía WebSocket (`scripts/sync-server.mjs` en dev,
  WS embebido en `production-server.mjs` en prod) + `BroadcastChannel` + `localStorage` como respaldo.
- Despliegue: servidor `korserver` (Dokploy), contenedor `marcadorvolleyball-app-rcr5xs`, dominio público
  `score.kronnos.dev`. Base de datos SQLite en `/app/data/volleystream.sqlite` dentro del contenedor.
- Cada partido es una "sesión" (`match_sessions`) con `state`, `config`, `statistics`, `overlay` serializados en
  columnas JSON — todas las stores de Pinia (`match`, `broadcastConfig`, `overlayControl`, `statistics`) se
  "scopean" a un `matchId` vía `useMatchScope()` (`src/composables/useMatchScope.ts`), que llama a
  `setMatchScope()` en cada store al montar cualquier vista.

## Fase 0 — Ya completado en esta sesión (referencia, no repetir)

- [x] **Overlays nuevos de Roster/Formación** (`/roster/:matchId/:team`, `/formation/:matchId/:team`) —
  `src/views/RosterOverlayView.vue`, `src/views/FormationOverlayView.vue`, más campos `headCoach`/`assistantCoach`
  en `Team`/`BroadcastTeamConfig`. Commit `1566146`.
- [x] **Bug de hidratación sin scope (race de sockets)** — las 4 stores llamaban `hydrate()+subscribe()` de forma
  eager y sin scope al crearse, antes de que `useMatchScope()` las scopeara al `matchId` real. Podía sobrescribir
  (y persistir) datos por defecto sobre un partido real recién cargado. Se quitaron esas llamadas eager de
  `src/stores/match.ts`, `broadcastConfig.ts`, `overlayControl.ts`, `statistics.ts`. Commit `1566146`.
- [x] **Números de camiseta guardados como "12.0" en vez de "12"** — `upsertPlayer` en
  `scripts/production-server.mjs` ataba un `Number` de JS directo a una columna TEXT; SQLite lo formateaba como
  REAL→TEXT. Envolver en `String(...)`. Commit `bed239a`. *(Nota: este fix está en el código fuente y en la BD de
  producción vía parche directo, pero el contenedor desplegado no se ha reconstruido con el nuevo código — ver
  Fase 1.0 abajo.)*
- [x] **Bug de menú lateral activo (reportado por el usuario)** — `isActive()` comparaba contra el `href`
  calculado, que colapsa a `/matches` para todos los enlaces cuando no hay `matchId` activo → los 4 ítems se
  resaltaban a la vez en `/matches`. Corregido para comparar contra la ruta base semántica.
  `src/components/layout/BroadcastLayout.vue`. Commit `43f6fe8`.
- [x] Datos de producción reseteados: equipos "Athletic Sincelejo" y "Caribe Volley" con roster completo cargados
  directamente en la base de datos del contenedor (no en el repo — esto era configuración de la instancia, no
  código).

---

## Fase 1 — Crítico (antes del próximo partido en vivo)

### 1.0 Redesplegar el contenedor de producción con los últimos commits
- **Por qué:** los commits `1566146`, `bed239a`, `43f6fe8` están en `origin/main` pero el contenedor
  `marcadorvolleyball-app-rcr5xs` en `korserver` sigue corriendo el build viejo (solo se parchó la BD a mano para
  el bug de "12.0"). Sin redeploy, ninguno de los fixes de esta fase ni las features de overlays nuevas están
  realmente en producción.
- **Acción:** disparar rebuild/redeploy en Dokploy (o `git pull && npm run build` + reinicio del contenedor vía
  SSH si el pipeline no es automático). Verificar después con `curl` a `/api/teams` y una revisión visual en
  `score.kronnos.dev`.

### 1.1 Socket zombie: reconexión no cancelada al cambiar de partido sin recargar — [x] cerrado, commit `e458883`
- **Dónde:** `src/services/syncService.ts`, función `subscribe()` (el handler `onclose` ~línea 126-132, y la
  función de limpieza retornada ~línea 149-157).
- **Qué pasa:** `onclose` siempre reprograma `reconnectTimer = setTimeout(connectSocket, 1200)`. La limpieza llama
  `socket?.close()`, pero el evento `close` real llega *después* de forma asíncrona, así que su `onclose` alcanza
  a reprogramar una reconexión que nadie cancela. `connectSocket()` abre un WebSocket nuevo apuntando al **canal
  viejo** con el **listener viejo** (el callback de la store del partido anterior).
- **Cómo se dispara:** navegar de un partido a otro dentro de la SPA sin recargar la página (`watch(matchId,
  activateScope)` en `useMatchScope.ts:53` dispara un re-scope). ~1.2s después, el socket zombie se reconecta al
  canal del partido A; si alguien más sigue anotando el partido A, sus cambios se aplican silenciosamente sobre
  el partido B que tienes abierto ahora.
- **Fix propuesto:** antes de llamar `socket?.close()` en la función de limpieza, marcar el socket como cerrado
  intencionalmente (ej. `socket.onclose = null` o un flag `closedByUs = true` que `onclose` revise antes de
  reprogramar `reconnectTimer`). Aplica a los 4 stores por igual ya que todas usan el mismo adaptador.
- **Cómo probar:** dos pestañas apuntando a partidos distintos; anotar en la pestaña A, cambiar la pestaña B de
  partido sin recargar, esperar >1.2s, seguir anotando en A, confirmar que B ya NO recibe esos cambios.

### 1.2 "-1 Punto" no revierte la estadística asociada — [x] cerrado, commit `e458883`
- **Dónde:** `src/stores/match.ts` función `removePoint` (~línea 271-275, solo hace
  `gameState.value[team].score -= 1`); `src/stores/statistics.ts` (no tiene ningún método de "deshacer evento");
  `src/components/controller/TeamControlPanel.vue` (emite `'remove'`, línea ~194).
- **Qué pasa:** anotar "Ataque" registra `+1` en el marcador y `attackPoints += 1` en estadísticas más un evento
  en el log. Si el marcador se corrige con "-1 Punto", el score baja pero `attackPoints` y el evento en el log
  quedan intactos para siempre. La única forma de "arreglarlo" es "Reiniciar estadísticas", que borra TODO el
  partido, no solo el evento erróneo.
- **Fix propuesto:** implementar un "deshacer último evento" real: al hacer `removePoint(team)`, buscar y revertir
  el último `StatisticEvent` de ese equipo que corresponda (decrementar el contador específico — `attackPoints`,
  `blockPoints`, `aces`, `opponentErrors`, o el error/skill que sea — y sacarlo de `events[]`). Alternativa más
  simple si se prefiere: exponer un botón explícito "Deshacer último punto" que revierta score + stat + evento en
  una sola acción, en vez de depender de que "-1 Punto" adivine qué revertir cuando hay múltiples razones posibles
  acumuladas.
- **Decisión del usuario (tomada):** "-1 Punto" revierte automáticamente el último evento de ESE equipo.
  Implementado como `removePointWithRevert()` en `src/stores/statistics.ts` — decrementa el contador específico
  (`attackPoints`/`blockPoints`/`aces`/`opponentErrors`/errores/habilidades) y saca el evento de `events[]`.
  Los 4 call sites que usaban `match.removePoint` directo (`ControllerView.vue`: 2 atajos de teclado + 2 `@remove`
  de `TeamControlPanel`) se movieron a `statistics.removePointWithRevert`. No toca `currentRun`/`biggestRun`
  (ver 2.2, bug separado).

### 1.3 Líbero: sin tope de plantel y sin restricción de saque/ataque/bloqueo — [x] cerrado (fix mínimo), commit `e458883`
- **Dónde:** `MatchTeamPlayer.isLibero` (`src/types/game.types.ts`), checkbox libre en
  `src/views/SettingsView.vue` (líneas ~381, ~429); `src/components/controller/TeamControlPanel.vue`
  (`canUseScoringAction`, `canUseSkillAction` — no filtran por líbero); `src/stores/statistics.ts`
  (`scorePointWithReason`/`recordSkill` no verifican `isLibero`).
- **Qué pasa:** cualquier cantidad de jugadoras puede marcarse como líbero (FIVB permite máx. 1-2 por plantel), y
  una vez en cancha, el líbero puede recibir crédito de ataque, bloqueo o ace — ilegal por reglamento (el líbero
  no puede rematar por encima de la red, ni bloquear/intentar bloquear, y en la mayoría de variantes de reglas
  vigentes no saca salvo en una posición específica).
- **Fix mínimo viable (rápido, sin rediseño grande):**
  1. Tope de 2 liberos al marcar el checkbox en `SettingsView.vue` (mensaje de validación si se intenta un 3°).
  2. Si el jugador en la zona de saque actual (`currentPlayer`) es líbero, deshabilitar el botón "Ace" para ese
     equipo (ya existe la lógica de `canUseScoringAction` para extenderla).
  3. Esto requiere saber SI el líbero está actualmente en la posición de saque/ataque — como hoy no hay
     atribución por jugador en las estadísticas (ver 3.3), este fix mínimo solo puede chequear "¿hay un líbero
     asignado a la zona 1 (saque) ahora mismo?" usando `team.rotation` + `team.roster`, no un "quién anotó qué".
- **Nota:** la implementación *completa* de reglas de líbero (zona de reemplazo, sustituciones ilimitadas que no
  cuentan contra el límite de 6) es trabajo de Fase 3 — no factible como "fix rápido".
- **Implementado:** tope de 2 líberos en `SettingsView.vue` (`liberoCapReached()`, valida en `savePlayer` y en el
  nuevo `toggleLibero()`, checkbox/botón se deshabilitan al llegar al máximo). Botón "Ace" deshabilitado en
  `TeamControlPanel.vue` cuando `team.currentPlayer` (sacador actual) es líbero (`currentServerIsLibero`), con
  tooltip explicativo. No se restringió ataque/bloqueo a nivel de equipo porque, sin atribución por jugador (3.3),
  no hay forma de saber quién remató/bloqueó — bloquear el botón para todo el equipo por tener un líbero sacando
  sería incorrecto.

---

## Fase 2 — Moderado (siguiente iteración, no bloquea un partido)

### 2.1 Botón "Rotar" manual sin restricción durante el set en vivo — [x] cerrado, commit `4f9cd61`
- **Dónde:** `src/components/controller/TeamControlPanel.vue` (botón Rotar, solo deshabilitado en
  `gameFinished`); `src/stores/match.ts` `rotateTeam` (línea ~405).
- **Qué pasa:** además de la rotación automática por cambio de saque (`scorePoint`), el botón manual puede rotar
  en cualquier momento — riesgo de rotar dos veces para un mismo side-out, o rotar sin que haya ocurrido un
  side-out real, desincronizando lo que se ve en el overlay de lo que realmente pasa en cancha.
- **Fix propuesto:** o bien ocultar/deshabilitar "Rotar" mientras `status === 'live'` (dejarlo solo como
  herramienta de corrección con partido pausado/`idle`), o añadir una confirmación explícita ("¿Corregir rotación
  manualmente? Esto es una corrección, no una rotación de juego normal.").
- **Decisión del usuario (tomada):** deshabilitar en vivo. Implementado en `TeamControlPanel.vue`
  (`canRotateManually`, nuevo prop `status`) — el botón se deshabilita mientras `status === 'live'`, con tooltip
  explicando la alternativa (pausar el set).

### 2.2 "Racha actual" no se reinicia al empezar un set nuevo — [x] cerrado, commit `4f9cd61`
- **Dónde:** `src/stores/statistics.ts`, función `updateRun` (usa `state.value.lastScoringTeam`, nunca reseteado);
  `src/stores/match.ts` `advanceToNextSet` (línea ~339) no toca la store de estadísticas.
- **Qué pasa:** si el equipo A cierra el set 1 con una racha de 4 puntos, y anota el primer punto del set 2, la UI
  muestra "Racha actual: 5" en vez de 1.
- **Fix propuesto:** en `advanceToNextSet` (y en `resetSet`), llamar a un nuevo método de `statistics` store que
  resetee `currentRun` y `lastScoringTeam` a sus valores iniciales (NO tocar `biggestRun`, que es acumulado de
  todo el partido correctamente).
- **Implementado:** para evitar import circular (`statistics.ts` ya importa `match.ts`), se agregó un pub-sub a
  nivel de módulo en `match.ts` (`onSetStart`/`notifySetStart`), disparado desde `advanceToNextSet` y `resetSet`.
  `statistics.ts` se suscribe una vez con `resetRun()`, que resetea `currentRun`/`lastScoringTeam` sin tocar
  `biggestRun`.

### 2.3 "Eficiencia" mezcla habilidades no relacionadas en un solo número — [x] cerrado, commit `4f9cd61`
- **Dónde:** `src/stores/statistics.ts`, función `teamEfficiency` (línea ~220-226).
- **Qué pasa:** `(attackPoints + blockPoints + aces) / (positivos + attackErrors + serveErrors +
  negativeReceptions)`. Ninguna métrica real de voleibol combina ataque, bloqueo, saque y recepción en un solo
  ratio — cada una se lleva por separado (% de ataque, eficiencia de bloqueo, ace/error ratio, rating de
  recepción). Además es fácil de inflar (ej. un ace sin intentos de ataque = "100% de eficiencia").
- **Fix propuesto:** decisión de producto pendiente con el usuario — ¿mostrar 3-4 métricas separadas (más fiel al
  reglamento/convención de scouting) o mantener un número compuesto pero renombrarlo/explicarlo mejor para no
  aparentar ser una métrica estándar? Requiere ajustar `StatisticsPanel.vue` y `StatisticsView.vue` además de la
  store.
- **Decisión del usuario (tomada):** separar en 3-4 métricas reales. `statistics.ts` reemplaza `teamEfficiency`
  por `attackEfficiency` (kills/(kills+errores ataque)), `blockEfficiency` (total bloqueos punto, sin conteo de
  bloqueos fallidos disponible), `serveEfficiency` (aces/(aces+errores saque)), `receptionRating`
  (recepciones+/(recepciones+ + recepciones-)). `StatisticsPanel.vue` (panel de control, con espacio) muestra las
  4. `OverlayStats.vue`/`OverlayScoreboard.vue` (gráfico de broadcast, tamaño fijo) mantienen un solo número por
  espacio, pero ahora es `attackEfficiency` real (la métrica más reconocible en transmisión), relabeleado
  "ATQ%" en vez del genérico "EFF" engañoso.

### 2.4 "Reiniciar estadísticas" desincroniza del historial de sets — [x] cerrado, commit `4f9cd61`
- **Dónde:** `src/stores/statistics.ts` `resetMatchStats` (línea ~216-218); `gameState.completedSets` en
  `match.ts` no se toca.
- **Qué pasa:** tras usar "Reiniciar estadísticas" a mitad de partido, "Historial de sets" sigue mostrando
  marcadores reales (ej. 25-20) mientras "Estadísticas" muestra todo en cero para esos mismos sets — reporte
  inconsistente para quien revise el partido después.
- **Fix propuesto:** o bien advertir explícitamente en el diálogo de confirmación que esto NO afecta el historial
  de sets (documentar la asimetría), o bloquear el reset una vez que `completedSets.length > 0` y ofrecer en su
  lugar "Reiniciar solo el set actual" (que ya existe como acción separada — verificar si cubre este caso).
- **Decisión del usuario (tomada):** advertir en el diálogo. `ControllerView.vue` y `StatisticsView.vue` ahora
  muestran un `confirm()` explícito: "Esto NO afecta el marcador ni el historial de sets ya completados".

### 2.5 Botón "Custom" de fondo sin indicador de selección — [x] cerrado, commit `4f9cd61`
- **Dónde:** `src/views/SettingsView.vue`, ~línea 603-609 (botones "Clásico"/"Acero"/"Custom").
- **Fix:** añadir la misma clase condicional `border-broadcast-accent` que ya tienen los otros dos botones cuando
  `broadcast.config.backgroundStyle === 'custom'`.

### 2.6 Triple lógica de nav-activo duplicada (mismo patrón que el bug ya corregido) — [x] cerrado, commit `4f9cd61`
- **Dónde:** `src/components/layout/BroadcastLayout.vue` — además del sidebar desktop y el menú móvil (ya
  corregidos, comparten `isActive()`/`navItems`), hay un **tercer** nav en el header (líneas ~49-77) con su propia
  lógica inline de `route.path.startsWith(...)`, y le faltan enlaces a "Estadísticas" y "Partidos".
- **Fix propuesto:** extraer un solo `navItems` + `isActive` compartido y reusarlo en los tres sitios de render,
  para que un futuro cambio en uno no vuelva a desincronizar a los otros dos (que es exactamente lo que causó el
  bug original).
- **Implementado:** el nav del header ahora itera `navItems` con `isActive()` compartido, igual que el sidebar y
  el menú móvil — agrega los enlaces que faltaban ("Estadísticas", "Partidos").

---

## Fase 3 — Trabajo grande / requiere decisiones de producto (no son "bugs", son features ausentes)

### 3.1 Sistema real de sustituciones — [x] cerrado, commit `d311265`
- **Estado actual:** no existe el concepto. `setCourtPositions` (`match.ts:469`) reescribe la alineación completa
  en cualquier momento, sin importar `status` (`idle`/`live`), sin contador, sin distinguir "corrección de
  configuración" de "sustitución real durante el partido". Mismo problema en `applyRosterToMatch` en
  `SettingsView.vue` (línea ~161).
- **Qué implica construirlo:** modelar un `SubstitutionEvent` (titular que sale, suplente que entra, número de
  set), un contador por equipo por set con tope de 6 (reglamento FIVB), y decidir si se bloquea o solo se advierte
  al intentar una 7ª sustitución. Requiere decisión de UX: ¿el contador es informativo (el anotador es quien
  decide si es válido, como en un partido real) o bloqueante?
- **Decisiones del usuario (tomadas):** contador informativo (no bloqueante), flujo con selector "Sale"/"Entra".
  Implementado: `SubstitutionEvent` en `game.types.ts` (`Team.substitutions`, opcional + fallback defensivo en
  todo punto de lectura/escritura porque las sesiones de partido ya persistidas no tienen el campo — sin el
  fallback, cargarlas rompía la app). `match.ts` → `substitutePlayer(team, playerOut, playerIn)` reemplaza en
  `team.rotation` y registra el evento con el set actual; `substitutionCount(team)` cuenta sustituciones no-líbero
  del set actual. `TeamControlPanel.vue` tiene una sección colapsable con los selectores y el contador "X/6".

### 3.2 Reglas completas de líbero — [x] cerrado (alcance reducido por decisión del usuario)
- Más allá del fix mínimo de la Fase 1: zona de reemplazo de líbero como concepto explícito, sustituciones de
  líbero ilimitadas que NO cuentan contra el límite de 6, y decisión sobre la regla de saque del líbero (ha
  cambiado entre ciclos de reglamento FIVB — confirmar cuál rige para las competencias del usuario antes de
  implementar la restricción).
- **Decisiones del usuario (tomadas):** (1) el líbero nunca saca — ya cubierto por el fix de 3.3 (el botón Ace se
  bloquea siempre que el jugador seleccionado sea líbero, sin excepción de zona). (2) la zona de reemplazo queda
  solo informativa — no se valida en código, se confía en el anotador. Con eso, lo único pendiente de 3.2 es que
  las sustituciones de líbero no cuenten contra el límite de 6 — eso se resuelve como parte del diseño de 3.1
  (el contador de sustituciones), no como trabajo separado.

### 3.3 Atribución de estadísticas por jugador
- **Por qué importa:** bloquea 1.3 (líbero no puede anotar ataque/bloqueo) y 3.2 de forma completa, y es lo que
  la mayoría de anotadores esperan de una app de estadísticas real (kills por jugadora, errores por jugadora,
  etc.). Hoy `ScoringReason`/`StatErrorType`/`StatSkillType` son solo a nivel de equipo.
- **Alcance:** añadir selector de dorsal antes de registrar ataque/bloqueo/error/habilidad, añadir `playerId` a
  `StatisticEvent`, y una vista de "líderes" por jugadora (ya existe `leaders` a nivel de equipo en
  `statistics.ts`, se puede extender el patrón).

### 3.4 Categorías de estadísticas faltantes
- Toques de bloqueo no anotadores (distinto de bloqueo punto), errores de recepción/manejo, sanciones
  (tarjetas amarilla/roja, afectan el marcador), % de sideout. Evaluar cuáles priorizar según lo que el usuario
  realmente lleva en sus partidos reales — no implementar todo a ciegas.

---

## Fase 4 — Infraestructura / bajo riesgo, sin urgencia

### 4.1 `lastByChannel` crece sin límite en el servidor de sync
- **Dónde:** `scripts/sync-server.mjs:5` y `scripts/production-server.mjs:616`. Un entry por canal único (4 por
  partido: match/broadcastConfig/overlayControl/statistics), nunca se limpia, sin TTL.
- **Fix propuesto:** limpiar entries cuando un `match_session` se archiva/borra, o poner un TTL simple basado en
  `updated_at`. Baja urgencia — fuga de memoria lenta, no un problema para uso normal a corto plazo.

### 4.2 Sin resolución de conflictos entre escritores simultáneos
- **Dónde:** `syncService.ts` — cada envelope lleva `timestamp` pero nada lo usa; gana el último mensaje
  *entregado*, no el más reciente *editado*.
- **Escenario:** dos pestañas de control para el mismo partido (laptop del anotador + tablet de respaldo).
- **Fix propuesto (si el usuario confirma que usa múltiples dispositivos de control a la vez):** rechazar/ignorar
  un envelope entrante si su `timestamp` es más viejo que el último aplicado localmente.

### 4.3 Pestaña en segundo plano puede reconectarse con estado obsoleto
- Relacionado con 1.1 y 4.2 — una pestaña suspendida por el navegador que despierta y publica su copia en memoria
  (desactualizada) puede sobrescribir el partido en vivo. Mitigar junto con el fix de 1.1 (una vez que la
  reconexión esté bien controlada, considerar comparar timestamp/versión antes de aceptar la reconexión como
  fuente de verdad).

---

## Cómo retomar esto en una sesión nueva

1. Lee este archivo completo antes de tocar código.
2. Confirma con el usuario en qué fase está parado (revisa los checkboxes `[x]`).
3. Antes de implementar Fase 3 (sustituciones, líbero completo, atribución por jugador), estas requieren
   decisiones de producto explícitas marcadas arriba — pregunta antes de construir, no asumas.
3. Al cerrar cada ítem: marca `[x]`, anota el commit, y si tocó producción, recuerda el paso de redeploy
   (ver 1.0) — el contenedor NO se actualiza solo con `git push`.
