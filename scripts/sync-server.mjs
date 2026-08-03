import { WebSocketServer } from 'ws'

const port = Number(process.env.VOLLEYSTREAM_SYNC_PORT ?? 3010)
const server = new WebSocketServer({ port, host: '0.0.0.0' })
const lastByChannel = new Map()

// Sin esto, cada canal (4 por partido: match/broadcastConfig/overlayControl/statistics) queda
// para siempre en memoria aunque el partido termine hace días — fuga lenta pero indefinida.
const CHANNEL_TTL_MS = 12 * 60 * 60 * 1000
const pruneStaleChannels = () => {
  const cutoff = Date.now() - CHANNEL_TTL_MS
  for (const [channel, envelope] of lastByChannel) {
    if ((envelope.timestamp ?? 0) < cutoff) lastByChannel.delete(channel)
  }
}
setInterval(pruneStaleChannels, 30 * 60 * 1000).unref()

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
