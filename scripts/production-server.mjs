import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { WebSocketServer } from 'ws'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const rootDir = resolve(__dirname, '..')
const distDir = join(rootDir, 'dist')
const port = Number(process.env.PORT ?? 3000)

const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.woff2', 'font/woff2'],
])

const resolveStaticPath = (url) => {
  const pathname = decodeURIComponent(new URL(url, 'http://localhost').pathname)
  const requestedPath = normalize(pathname).replace(/^(\.\.[/\\])+/, '')
  const filePath = join(distDir, requestedPath)

  if (filePath.startsWith(distDir) && existsSync(filePath) && statSync(filePath).isFile()) {
    return filePath
  }

  return join(distDir, 'index.html')
}

const server = createServer((request, response) => {
  if (!existsSync(distDir)) {
    response.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('Build no encontrado. Ejecuta npm run build antes de iniciar producción.')
    return
  }

  const filePath = resolveStaticPath(request.url ?? '/')
  const contentType = mimeTypes.get(extname(filePath)) ?? 'application/octet-stream'

  response.writeHead(200, {
    'cache-control': filePath.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
    'content-type': contentType,
  })
  createReadStream(filePath).pipe(response)
})

const syncServer = new WebSocketServer({ server, path: '/ws' })
const lastByChannel = new Map()

syncServer.on('connection', (socket) => {
  for (const envelope of lastByChannel.values()) {
    socket.send(JSON.stringify(envelope))
  }

  socket.on('message', (data) => {
    try {
      const envelope = JSON.parse(data.toString())
      if (!envelope?.channel || !envelope?.payload) return

      lastByChannel.set(envelope.channel, envelope)

      for (const client of syncServer.clients) {
        if (client.readyState === client.OPEN) {
          client.send(JSON.stringify(envelope))
        }
      }
    } catch (error) {
      console.warn('Invalid sync message:', error)
    }
  })
})

server.listen(port, '0.0.0.0', () => {
  console.log(`VolleyStream production server listening on http://0.0.0.0:${port}`)
  console.log(`VolleyStream sync websocket available at ws://0.0.0.0:${port}/ws`)
})
