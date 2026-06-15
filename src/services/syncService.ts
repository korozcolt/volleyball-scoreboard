import { COMMUNICATION_CONFIG } from '@/utils/constants'
import type { SyncEnvelope } from '@/types/game.types'

type Listener<T> = (payload: T, envelope: SyncEnvelope<T>) => void

export interface SyncAdapter<T> {
  publish: (payload: T) => void
  subscribe: (listener: Listener<T>) => () => void
  read: () => T | null
}

export function createLocalSyncAdapter<T>(channel: string, storageKey: string): SyncAdapter<T> {
  let broadcastChannel: BroadcastChannel | null = null
  let socket: WebSocket | null = null
  let reconnectTimer: number | undefined
  const socketQueue: Array<SyncEnvelope<T> & { sourceId: string }> = []
  const supportsBroadcastChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  const sourceId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`

  const createEnvelope = (payload: T): SyncEnvelope<T> & { sourceId: string } => ({
    channel,
    version: COMMUNICATION_CONFIG.STORAGE_VERSION,
    timestamp: Date.now(),
    payload,
    sourceId,
  })

  const getSocketUrl = () => {
    const configuredUrl = import.meta.env.VITE_SYNC_WS_URL
    if (configuredUrl) return configuredUrl

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const isProd = import.meta.env.PROD
    return isProd ? `${protocol}//${window.location.host}/ws` : `${protocol}//${window.location.hostname}:3010`
  }

  const parseEnvelope = (raw: string | null): SyncEnvelope<T> | null => {
    if (!raw) return null

    try {
      const envelope = JSON.parse(raw) as SyncEnvelope<T>
      if (envelope.channel !== channel || !envelope.payload) return null
      if (envelope.version !== COMMUNICATION_CONFIG.STORAGE_VERSION) return null
      return envelope
    } catch (error) {
      console.warn(`No se pudo leer el canal ${channel}`, error)
      return null
    }
  }

  return {
    publish(payload: T) {
      if (typeof window === 'undefined') return

      const envelope = createEnvelope(payload)
      localStorage.setItem(storageKey, JSON.stringify(envelope))
      window.dispatchEvent(new CustomEvent(channel, { detail: envelope }))
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(envelope))
      } else {
        socketQueue.push(envelope)
        if (socketQueue.length > 5) socketQueue.shift()
      }

      if (supportsBroadcastChannel) {
        const publisher = new BroadcastChannel(channel)
        publisher.postMessage(envelope)
        publisher.close()
      }
    },

    subscribe(listener: Listener<T>) {
      if (typeof window === 'undefined') return () => undefined

      const customHandler = (event: Event) => {
        const detail = (event as CustomEvent<SyncEnvelope<T>>).detail
        if (detail?.channel === channel && (detail as SyncEnvelope<T> & { sourceId?: string }).sourceId !== sourceId) {
          listener(detail.payload, detail)
        }
      }

      const storageHandler = (event: StorageEvent) => {
        if (event.key !== storageKey) return
        const envelope = parseEnvelope(event.newValue)
        if (envelope) listener(envelope.payload, envelope)
      }

      window.addEventListener(channel, customHandler)
      window.addEventListener('storage', storageHandler)

      const connectSocket = () => {
        if (
          socket &&
          (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
        ) {
          return
        }

        socket = new WebSocket(getSocketUrl())

        socket.onopen = () => {
          while (socketQueue.length && socket?.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(socketQueue.shift()))
          }
        }

        socket.onmessage = (event) => {
          try {
            const envelope = JSON.parse(event.data) as SyncEnvelope<T> & { sourceId?: string }
            if (
              envelope.channel === channel &&
              envelope.version === COMMUNICATION_CONFIG.STORAGE_VERSION &&
              envelope.sourceId !== sourceId
            ) {
              localStorage.setItem(storageKey, JSON.stringify(envelope))
              listener(envelope.payload, envelope)
            }
          } catch (error) {
            console.warn(`No se pudo procesar websocket ${channel}`, error)
          }
        }

        socket.onclose = () => {
          reconnectTimer = window.setTimeout(connectSocket, 1200)
        }

        socket.onerror = () => {
          socket?.close()
        }
      }

      connectSocket()

      if (supportsBroadcastChannel) {
        broadcastChannel = new BroadcastChannel(channel)
        broadcastChannel.onmessage = (event: MessageEvent<SyncEnvelope<T>>) => {
          if (
            event.data?.channel === channel &&
            (event.data as SyncEnvelope<T> & { sourceId?: string }).sourceId !== sourceId
          ) {
            listener(event.data.payload, event.data)
          }
        }
      }

      return () => {
        window.removeEventListener(channel, customHandler)
        window.removeEventListener('storage', storageHandler)
        if (reconnectTimer) window.clearTimeout(reconnectTimer)
        socket?.close()
        socket = null
        broadcastChannel?.close()
        broadcastChannel = null
      }
    },

    read() {
      if (typeof window === 'undefined') return null
      return parseEnvelope(localStorage.getItem(storageKey))?.payload ?? null
    },
  }
}
