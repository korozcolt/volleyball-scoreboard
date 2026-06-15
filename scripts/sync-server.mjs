import { WebSocketServer } from 'ws'

const port = Number(process.env.VOLLEYSTREAM_SYNC_PORT ?? 3010)
const server = new WebSocketServer({ port, host: '0.0.0.0' })
const lastByChannel = new Map()

server.on('connection', (socket) => {
  for (const envelope of lastByChannel.values()) {
    socket.send(JSON.stringify(envelope))
  }

  socket.on('message', (data) => {
    try {
      const envelope = JSON.parse(data.toString())
      if (!envelope?.channel || !envelope?.payload) return

      lastByChannel.set(envelope.channel, envelope)

      for (const client of server.clients) {
        if (client.readyState === client.OPEN) {
          client.send(JSON.stringify(envelope))
        }
      }
    } catch (error) {
      console.warn('Invalid sync message:', error)
    }
  })
})

server.on('listening', () => {
  console.log(`VolleyStream sync server listening on ws://localhost:${port}`)
})
