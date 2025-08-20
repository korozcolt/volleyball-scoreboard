import { COMMUNICATION_CONFIG, STORAGE_KEYS } from '@utils/constants'
import type { CommunicationState, GameState, UseCommunicationReturn } from '../types/game.types'
import { onMounted, onUnmounted, ref } from 'vue'

import { debounce } from 'lodash-es'

/**
 * Composable para manejar la comunicación en tiempo real entre controlador y overlay
 */
export function useCommunication(): UseCommunicationReturn {
  const isConnected = ref(false)
  const lastUpdate = ref<Date | null>(null)
  const connectionStatus = ref<'connected' | 'disconnected' | 'reconnecting'>('disconnected')
  const listeners = ref<Array<(state: CommunicationState) => void>>([])

  /**
   * Broadcast del estado del juego a otros componentes
   */
  const broadcast = (gameState: GameState) => {
    try {
      const stateData: CommunicationState = {
        ...gameState,
        timestamp: Date.now(),
        version: COMMUNICATION_CONFIG.STORAGE_VERSION,
      }

      // Limpiar localStorage si está lleno
      try {
        const testKey = 'test_storage_quota'
        localStorage.setItem(testKey, 'test')
        localStorage.removeItem(testKey)
      } catch {
        // Si hay error de quota, limpiar datos antiguos
        console.warn('LocalStorage quota exceeded, cleaning old data...')
        cleanOldStorageData()
      }

      // Intentar guardar en localStorage con manejo de errores
      try {
        const stateString = JSON.stringify(stateData)
        localStorage.setItem(STORAGE_KEYS.GAME_STATE, stateString)
      } catch {
        console.warn('Failed to save to localStorage, using alternative communication')
        // Continuar con otros métodos de comunicación
      }

      // Emitir evento personalizado para comunicación en la misma pestaña
      window.dispatchEvent(
        new CustomEvent('scoreboardUpdate', {
          detail: stateData,
        })
      )

      // Usar BroadcastChannel para comunicación entre pestañas (moderno)
      if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel('volleyball-scoreboard')
        channel.postMessage(stateData)
        channel.close()
      }

      isConnected.value = true
      lastUpdate.value = new Date()
      connectionStatus.value = 'connected'
    } catch (error) {
      console.error('Error broadcasting state:', error)
      isConnected.value = false
      connectionStatus.value = 'disconnected'
    }
  }

  /**
   * Limpiar datos antiguos del localStorage
   */
  const cleanOldStorageData = () => {
    try {
      // Limpiar datos de configuración antiguos si existen
      const keysToCheck = ['volleyball-scoreboard-settings', 'volleyball_scoreboard_state']
      keysToCheck.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key)
        }
      })

      // Limpiar otros datos no esenciales
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('volleyball') && key !== STORAGE_KEYS.GAME_STATE) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.error('Error cleaning localStorage:', error)
    }
  }

  /**
   * Escuchar cambios de estado desde otros componentes
   */
  const listen = (callback: (state: CommunicationState) => void) => {
    // Debounce del callback para evitar actualizaciones excesivas
    const debouncedCallback = debounce(callback, COMMUNICATION_CONFIG.DEBOUNCE_DELAY)

    // Agregar a la lista de listeners
    listeners.value.push(debouncedCallback)

    // Handler para eventos de localStorage (entre pestañas diferentes)
    const storageHandler = (event: StorageEvent) => {
      if (event.key === STORAGE_KEYS.GAME_STATE && event.newValue) {
        try {
          const newState = JSON.parse(event.newValue) as CommunicationState
          validateState(newState)
          debouncedCallback(newState)
          connectionStatus.value = 'connected'
        } catch (error) {
          console.error('Error parsing state from storage:', error)
          connectionStatus.value = 'disconnected'
        }
      }
    }

    // Handler para eventos personalizados (misma pestaña)
    const customHandler = (event: CustomEvent) => {
      try {
        validateState(event.detail)
        debouncedCallback(event.detail)
        connectionStatus.value = 'connected'
      } catch (error) {
        console.error('Error handling custom event:', error)
        connectionStatus.value = 'disconnected'
      }
    }

    // Handler para BroadcastChannel (moderno)
    let broadcastChannel: BroadcastChannel | null = null
    if ('BroadcastChannel' in window) {
      broadcastChannel = new BroadcastChannel('volleyball-scoreboard')
      broadcastChannel.onmessage = (event) => {
        try {
          validateState(event.data)
          debouncedCallback(event.data)
          connectionStatus.value = 'connected'
        } catch (error) {
          console.error('Error handling broadcast channel message:', error)
          connectionStatus.value = 'disconnected'
        }
      }
    }

    // Registrar listeners
    window.addEventListener('storage', storageHandler)
    window.addEventListener('scoreboardUpdate', customHandler as EventListener)

    // Función de cleanup
    return () => {
      window.removeEventListener('storage', storageHandler)
      window.removeEventListener('scoreboardUpdate', customHandler as EventListener)
      if (broadcastChannel) {
        broadcastChannel.close()
      }

      // Remover de la lista de listeners
      const index = listeners.value.indexOf(debouncedCallback)
      if (index > -1) {
        listeners.value.splice(index, 1)
      }
    }
  }

  /**
   * Obtener el estado actual desde localStorage
   */
  const getCurrentState = (): CommunicationState | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.GAME_STATE)
      if (!stored) return null

      const state = JSON.parse(stored) as CommunicationState
      validateState(state)
      return state
    } catch (error) {
      console.error('Error getting current state:', error)
      return null
    }
  }

  /**
   * Validar que el estado recibido sea válido
   */
  const validateState: (state: unknown) => asserts state is CommunicationState = (state: unknown): asserts state is CommunicationState => {
    if (!state || typeof state !== 'object') {
      throw new Error('Invalid state: not an object')
    }

    const stateObj = state as Record<string, unknown>

    if (!stateObj.local || !stateObj.visitor) {
      throw new Error('Invalid state: missing team data')
    }

    if (typeof stateObj.currentSet !== 'number' || stateObj.currentSet < 1) {
      throw new Error('Invalid state: invalid currentSet')
    }

    if (!Array.isArray(stateObj.history)) {
      throw new Error('Invalid state: invalid history')
    }

    // Validar timestamp
    if (typeof stateObj.timestamp !== 'number') {
      throw new Error('Invalid state: missing timestamp')
    }

    // Verificar que el timestamp no sea muy antiguo (más de 1 hora)
    const now = Date.now()
    if (now - stateObj.timestamp > 3600000) {
      console.warn('State timestamp is very old, might be stale')
    }
  }

  /**
   * Limpiar estados antiguos del localStorage
   */
  const cleanup = () => {
    try {
      const currentState = getCurrentState()
      if (!currentState) return

      const now = Date.now()
      const stateAge = now - currentState.timestamp

      // Si el estado tiene más de 1 hora, eliminarlo
      if (stateAge > 3600000) {
        localStorage.removeItem(STORAGE_KEYS.GAME_STATE)
        console.log('Cleaned up old state from localStorage')
      }
    } catch (error) {
      console.error('Error during cleanup:', error)
    }
  }

  /**
   * Verificar la conectividad con polling
   */
  const startConnectivityCheck = () => {
    const checkInterval = setInterval(() => {
      const currentState = getCurrentState()
      if (currentState) {
        const now = Date.now()
        const timeSinceUpdate = now - currentState.timestamp

        // Si no hay actualizaciones en los últimos 30 segundos, marcar como desconectado
        if (timeSinceUpdate > 30000) {
          connectionStatus.value = 'disconnected'
          isConnected.value = false
        } else {
          connectionStatus.value = 'connected'
          isConnected.value = true
          lastUpdate.value = new Date(currentState.timestamp)
        }
      } else {
        connectionStatus.value = 'disconnected'
        isConnected.value = false
      }
    }, COMMUNICATION_CONFIG.POLLING_INTERVAL)

    return () => {
      clearInterval(checkInterval)
    }
  }

  /**
   * Sincronizar con el estado existente al inicializar
   */
  const syncWithExistingState = () => {
    const existingState = getCurrentState()
    if (existingState && listeners.value.length > 0) {
      // Notificar a todos los listeners del estado existente
      listeners.value.forEach(listener => {
        try {
          listener(existingState)
        } catch (error) {
          console.error('Error notifying listener of existing state:', error)
        }
      })
    }
  }

  /**
   * Obtener estadísticas de la comunicación
   */
  const getConnectionStats = () => {
    return {
      isConnected: isConnected.value,
      lastUpdate: lastUpdate.value,
      status: connectionStatus.value,
      activeListeners: listeners.value.length,
      supportsModernAPI: 'BroadcastChannel' in window,
    }
  }

  // Lifecycle hooks
  let cleanupConnectivityCheck: (() => void) | null = null

  onMounted(() => {
    cleanup()
    cleanupConnectivityCheck = startConnectivityCheck()

    // Sincronizar con estado existente después de un pequeño delay
    setTimeout(syncWithExistingState, 100)
  })

  onUnmounted(() => {
    if (cleanupConnectivityCheck) {
      cleanupConnectivityCheck()
    }
  })

  return {
    // Funciones principales
    broadcast,
    listen,
    getCurrentState,

    // Estado de la conexión
    isConnected,
    lastUpdate,
    connectionStatus,

    // Utilidades
    cleanup,
    syncWithExistingState,
    getConnectionStats,
  }
}

/**
 * Composable especializado para el controlador
 */
export function useControllerCommunication() {
  const communication = useCommunication()

  // El controlador es el que principalmente envía datos
  return {
    ...communication,
    // Función helper para broadcast automático
    autoBroadcast: (gameState: GameState) => {
      communication.broadcast(gameState)
    },
  }
}

/**
 * Composable especializado para el overlay
 */
export function useOverlayCommunication() {
  const communication = useCommunication()

  // El overlay principalmente escucha datos
  return {
    ...communication,
    // Función helper para escuchar con reconexión automática
    autoListen: (callback: (state: CommunicationState) => void) => {
      const cleanup = communication.listen(callback)

      // Intentar reconectar si se pierde la conexión
      const reconnectInterval = setInterval(() => {
        if (communication.connectionStatus.value === 'disconnected') {
          communication.syncWithExistingState()
        }
      }, 5000)

      return () => {
        cleanup()
        clearInterval(reconnectInterval)
      }
    },
  }
}
