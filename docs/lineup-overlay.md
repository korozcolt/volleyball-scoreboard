# Line up overlay (`/lineup/:matchId`)

Vista: `src/views/LineupOverlayView.vue` (rediseñada el 2026-10-20 para el LXIII Campeonato Nacional U17 Femenino).
Es una página de **1920×1080** que se escala al tamaño de la ventana (`scale = min(w/1920, h/1080)`), pensada como fuente de navegador de OBS.

## Cómo se activa
Todo viene del store `overlayControl` (mismo canal de sincronización que el resto del overlay):

| Campo | Efecto |
|---|---|
| `lineupVisible` | muestra u oculta el panel (con `v-if`; oculto = página transparente) |
| `lineupMode` | `court` (cancha) o `list` (lista) |

El controlador (`/controller/:id`) alterna ambos. Los datos salen de `match.gameState` (equipos, `roster`, `rotation`, `serving`, `metadata`, `headCoach`).

## Qué muestra
- **Encabezado:** "ALINEACIÓN", torneo (`metadata.tournament`), fase · cancha · set; logo de liga y de patrocinador si están en `broadcastConfig`.
- **Tarjeta por equipo** (local a la izquierda): logo (o código), nombre, `DT · <headCoach>` si existe.
- **Modo cancha:** cancha de 800×500 con red y línea de ataque; zonas 4-3-2 / 5-6-1 a partir de `rotation[i]` = dorsal en la posición `i+1`; cada titular con número, nombre (primer y último nombre) y rol; marca de saque en la zona 1 solo si `team.serving`; fichas de **líberos** (dorado) y **banca** debajo.
- **Modo lista:** `TITULARES` (orden de rotación P1–P6), `LÍBEROS`, `BANCA` (por dorsal). La altura de fila (`--row-h`) se calcula para que 12–18 jugadoras quepan en el lienzo (antes 13 jugadoras se salían de la pantalla).
- Los nombres se muestran **siempre** (ya no dependen de `settings.enablePlayerNames`).

## Compatibilidad con OBS (importante)
El navegador de OBS 30.2.3 es **Chromium 103**: no soporta `color-mix()`, `:has()` ni CSS reciente. Por eso los tonos de cada equipo se calculan en JS
(`teamVars()`: `--tc`, `--tc-a30…a70`, `--tc-light`, `--tc-deep`, `--tc-card-top`, `--court-top/bot`) y se pasan como variables CSS.
No usar `color-mix()` en vistas que se carguen en OBS. Verificar siempre dentro de OBS: una fuente de navegador **inactiva** (escena fuera de programa)
devuelve capturas vacías, hay que activar la escena.

## Probarlo en local (sin tocar producción)
```bash
npx vue-tsc --noEmit -p tsconfig.app.json && npx vite build
DATA_DIR=/tmp/lu-data PORT=3100 node scripts/production-server.mjs &
# sembrar una sesión copiada de producción (POST /api/match-sessions con id, state, config, overlay {lineupVisible:true, lineupMode:'court'|'list'})
# y capturar http://localhost:3100/lineup/<id> con Playwright a 1920×1080
```
Se usó una sesión archivada como lienzo de pruebas (`session_1792503132789_7ebba94357a54`); no usar sesiones de partidos reales para pruebas.

## Relación con el estudio (OBS)
Escena `Alineacion` de `kronnos-studio` (fuente `overlay_lineup`, 1920×1080 escalada 2/3, sobre `bg_inicio`).
Ver `kronnos-studio/docs/EVENTO-SUCRE-U17-2026.md` §12.

## Notas de datos
- Perfil de equipo usado para Sucre: `team_sucre_u17` ("Sucre U17", código SUC). El perfil antiguo "Sucre" tiene el plantel U13.
- Los rivales usan plantillas genéricas "Jugadora 1…14". El aviso rojo "Falta cargar el roster" del controlador solo salta con los nombres de relleno exactos "Jugador N".
- Cambiar datos por fuera de la app exige **cerrar las pestañas del partido** y reemplazar el mensaje de sincronización guardado (`kronnos-studio/ops/sync-push-state.mjs`): el servidor `/ws` reenvía durante 12 h el último estado a cada pestaña nueva.
