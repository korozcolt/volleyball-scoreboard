# Seguridad y clave de operador

## Clave de operador (`ADMIN_TOKEN`)

El servidor de producción (`scripts/production-server.mjs`) puede exigir una clave para **escribir**:

- Con la variable de entorno `ADMIN_TOKEN` definida: todo `POST/PUT/PATCH/DELETE` en `/api` y todo mensaje por
  WebSocket exigen la clave. Las lecturas (`GET`) y los **overlays de OBS siguen abiertos** y nunca la piden.
- Sin la variable: el servidor funciona como antes (abierto) y lo avisa en el log al arrancar.

El operador escribe la clave una vez en el navegador (diálogo "Clave de operador", se guarda en ese navegador).
Quien no la tenga puede elegir "Solo ver". Cada dispositivo de control (laptop, tablet) la pide una vez.

### Activarla en producción (Dokploy)

1. Genera una clave larga: `openssl rand -base64 24`
2. Dokploy → app `marcadorvolleyball` → Environment → agrega `ADMIN_TOKEN=<la clave>` → redeploy.
3. Abre `/controller/...` o `/live/...`, escribe la clave en el diálogo.

Para rotarla: cambia la variable, redeploy y vuelve a escribirla en cada dispositivo.

## Otras protecciones del servidor

- Límite de tamaño: JSON 5 MB (`MAX_JSON_MB`), imágenes (`MAX_IMAGE_MB`), WebSocket 2 MB (`MAX_WS_MB`); 413 si se excede.
- JSON inválido → 400; URL malformada → 400 (antes tumbaba el proceso).
- WebSocket: canales validados, tope de canales en memoria, TTL con hora del servidor, límite de mensajes por
  segundo, latido para cerrar conexiones muertas; sin clave solo se recibe.
- Subidas: los SVG con scripts/manejadores se rechazan y `/uploads` se sirve con `Content-Security-Policy: sandbox`
  y `nosniff`.
- Renumerar una jugadora (`PATCH`) hace `UPDATE` explícito y responde 409 si el dorsal está ocupado.
- La migración de `team_players` corre en transacción (todo o nada).

## Datos

- `data/` (SQLite y subidas) ya **no se versiona**. Los datos reales viven en el volumen `DataImagesAndData`
  montado en `/app/data` del contenedor.
- Las versiones anteriores del repo contienen `data/volleystream.sqlite` en el historial de git. Si ese archivo
  tuvo datos reales (nombres de jugadoras), considera reescribir el historial o tratar el repo como privado.

## Pendiente conocido

- `PRAGMA foreign_keys` sigue apagado (los `ON DELETE CASCADE` no actúan); activarlo exige validar antes los datos existentes.
- Sin control de versiones por partido: dos operadores escribiendo a la vez siguen en modo "gana el último".
- 10 avisos de `npm audit` en herramientas de desarrollo (no en producción) requieren actualizaciones mayores.
