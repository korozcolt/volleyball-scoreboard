# Auditoría de usabilidad — operador único, dos equipos (ref. DataVolley 4)

> Fecha: 2026-10-06. Caso real: partido Sucre vs Risaralda (II Nacional U13), sesión
> `session_1791291029165_34fb03f232ef1` en `score.kronnos.dev`. Una sola persona llevando marcador y
> estadísticas de ambos equipos. Complementa `docs/audit-roadmap.md` (reglas/sockets), esto es solo UX de captura.

## Decisiones del usuario

- Dispositivo: **laptop (teclado) y tablet (táctil) por igual** → toda acción debe existir como botón grande
  y como atajo de teclado.
- Detalle mínimo por jugadora: **solo cómo terminó cada punto** (quién anotó/erró y de qué forma). Recepción y
  defensa son opcionales, nunca bloquean.
- Rotación: **mostrar el sacador esperado y confirmar con un toque** (un toque si sacó otra jugadora = falta de
  rotación). Sin comparación automática.

## Evidencia del partido real

| Dato | Resultado |
|---|---|
| Puntos sin clasificar (`manual`) | Sucre 24/67 (36%), Risaralda 26/69 (38%) |
| Roster Risaralda | Nunca cargado: "Jugador 1–6" (stats por jugadora inservibles) |
| Recepciones + / − / defensas | 0 registradas |
| Faltas de rotación | 0 registradas |
| Eventos guardados | 60 (tope `MAX_HISTORY_ITEMS`) de ~136 puntos; `playerStatsFor` y `sideoutRating` se calculan sobre eso |
| Marcador vs estadísticas | Coinciden (136 puntos): lo que falló fue clasificar/atribuir, no el conteo |

## Hallazgos de interfaz (por qué no se podía ir a la par)

1. Los controles de juego están al final de `ControllerView.vue`, tras vista previa OBS, accesos directos,
   overlays, roster y asignación de posiciones. Cada `TeamControlPanel` apila ~11 secciones → scroll durante el juego.
2. `+1 Punto` (h-24) domina; las causas (h-10) son pequeñas → el camino fácil es no clasificar.
3. Errores (ataque/saque/recepción) y la falta de rotación están dentro de "Estadística avanzada" plegada.
4. "Jugador en jugada" es una selección persistente (se puede atribuir a la jugadora equivocada) y son 6
   botones de texto sin cancha.
5. Un punto sin clasificar no se puede reclasificar después.
6. Rotación: fila de números; nada pide confirmar el sacador; "Rotación" (falta) oculto.
7. Sin chequeo previo de rosters cargados.
8. Defectos asociados: tope de 60 eventos; "-1 Punto" no restaura saque/rotación/racha; el punto que cierra un
   set no se puede deshacer; ícono `Settings` sin importar en `ControllerView.vue`; atajos de teclado se
   disparan con Cmd/Ctrl y teclas repetidas; `confirm()` nativo.

## Diseño propuesto

### Modo Partido (una pantalla, sin scroll)
- Barra superior: marcador, set, saque, tiempo, Deshacer global.
- Dos columnas (local | visitante), cada una con la **cancha de 6 posiciones** (botones grandes con dorsal),
  sacadora marcada, líbero identificado.
- Flujo de 2 toques / 2 teclas: **jugadora → acción** (Ataque, Bloqueo, Ace, Error propio de ataque/saque/
  recepción/otro, Error rival). La selección se limpia sola tras cada punto.
- Todo lo de OBS/overlays/roster/configuración sale a una pestaña "Transmisión" (no visible durante el juego).

### Cola de pendientes
- `+1 Punto` rápido sigue existiendo pero crea un evento **pendiente**; se clasifica después (timeouts, entre
  sets) desde una lista editable. Cubre el 37% manual del partido real.

### Rotación asistida
- Al inicio de cada saque: sacador esperado en grande por equipo. Un toque "Sacó otra" = falta de rotación
  (punto al rival, queda en log). Botón visible, no escondido.

### Antes del partido
- Lista de verificación: ambos rosters reales, 6 titulares por equipo, líbero(s). Sin eso no se inicia el set.

### Captura opcional (nivel 2)
- Recepción +/−, defensa, bloqueo tocado: fila secundaria, nunca obligatoria.

### Atajos (convención tipo DataVolley)
- Prefijo de equipo + dorsal + letra de acción (p. ej. `1`/`2` equipo, dorsal, `A` ataque, `B` bloqueo,
  `S` ace, `E` error). Ignorar teclas con Cmd/Ctrl/Alt y repeticiones. Detalle exacto a definir en la fase 2.

## Plan por fases

- **Fase A — [x] cerrada (commit 79c9ee6)** — correcciones previas (bloquean la captura fiable):** tope de 60 eventos, "-1 Punto" completo
  (saque/rotación/racha) + Deshacer global, ícono `Settings`, guardas del teclado, chequeo de rosters.
- **Fase B — [x] cerrada** — Modo Partido (`/live/:matchId`, `LiveScoutView.vue` + `ScoutTeamColumn.vue`). Verificado en navegador a 1280×800 y 1024×768 sin scroll. Pendiente de B: el selector de dorsal por teclado (queda en Fase D). nueva vista sin scroll con cancha por equipo y flujo jugadora → acción;
  rotación asistida.
- **Fase C — [x] cerrada** — Pendientes y edición (`PendingPointsPanel.vue`, `statistics.reclassifyPoint`): cola de "+1 sin clasificar" y pestaña Corregir; no toca marcador ni puntos totales; respeta ace/error de saque/error de recepción según quién tenía el saque. Antes era: cola de puntos sin clasificar, edición/reasignación de eventos pasados.
- **Fase D — [x] cerrada** — Teclado y táctil. Código `L/V + dorsal + letra` (`useScoutKeyboard.ts`, ayuda con `?`): A ataque · B bloqueo · S ace · E+A/S/R error · X rival erró · P pendiente · F falta rotación · O tiempo · D defensa · T bloqueo tocado · +/− recepción. Botones y teclado comparten reglas (`ScoutTeamColumn` expone `run*`). Bloqueo anti doble toque (450 ms), objetivos ≥44 px, sin scroll en 6 tamaños (laptop/tablet, horizontal/vertical). Antes era: atajos por código, tamaño de objetivos táctiles, pruebas en tablet.
- **Fase E — Estadísticas por jugadora:** líderes, errores por jugadora y reportes (después de que la captura
  sea fiable).

## Validación

- Re-jugar el partido real (eventos del log) en el nuevo modo para medir toques por punto.
- Meta: ≤ 2 toques por punto clasificado, 0 scroll durante el juego, < 5% de puntos sin clasificar al final.
