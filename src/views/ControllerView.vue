<template>
  <div class="controller-view min-h-screen bg-gray-900 text-white">
    <!-- Loading state -->
    <div v-if="!scoreboard.gameState" class="flex items-center justify-center min-h-screen">
      <div class="text-white text-xl">Cargando controlador...</div>
    </div>
    
    <div v-else>
      <!-- Header -->
      <header class="bg-gray-800 border-b border-gray-700 p-4">
        <div class="container mx-auto flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <h1 class="text-2xl font-bold text-blue-400">🏐 Panel de Control</h1>
            <div class="text-sm text-gray-400">
              Volleyball Scoreboard Controller
            </div>
          </div>
        <div class="flex items-center space-x-4">
          <button
            @click="scoreboard.resetGame"
            class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            🔄 Reiniciar Juego
          </button>
          <router-link
            to="/overlay"
            target="_blank"
            class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
          >
            📺 Abrir Overlay
          </router-link>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="container mx-auto p-6">
      <!-- Game Status -->
      <div class="mb-8 bg-gray-800 rounded-lg p-6">
        <h2 class="text-xl font-semibold mb-4">Estado del Juego</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="text-center">
            <div class="text-sm text-gray-400">Set Actual</div>
            <div class="text-2xl font-bold text-blue-400">{{ scoreboard.currentSet }}</div>
          </div>
          <div class="text-center">
            <div class="text-sm text-gray-400">Tiempo de Juego</div>
            <div class="text-2xl font-bold text-green-400">{{ formatGameTime }}</div>
          </div>
          <div class="text-center">
            <div class="text-sm text-gray-400">Saque</div>
            <div class="text-2xl font-bold text-yellow-400">
              {{ scoreboard.currentTeamServing === 'local' ? scoreboard.gameState.local.name : scoreboard.gameState.visitor.name }}
            </div>
          </div>
        </div>
      </div>

      <!-- Teams Control -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <!-- Local Team -->
        <div class="bg-gray-800 rounded-lg p-6">
          <h3 class="text-lg font-semibold mb-4 text-blue-400">Equipo Local</h3>
          <div class="space-y-4">
            <input
              v-model="scoreboard.gameState.local.name"
              @blur="scoreboard.updateTeamName('local', scoreboard.gameState.local.name)"
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              placeholder="Nombre del equipo local"
            />
            <div class="flex items-center justify-between">
              <div class="text-4xl font-bold text-blue-400">
                {{ scoreboard.gameState.local.score }}
              </div>
              <div class="flex space-x-2">
                <button
                  @click="scoreboard.scorePoint('local')"
                  class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                >
                  +1
                </button>
                <button
                  @click="scoreboard.removePoint('local')"
                  class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  -1
                </button>
              </div>
            </div>
            <div class="text-sm text-gray-400">
              Sets ganados: {{ scoreboard.gameState.local.sets }}
            </div>
          </div>
        </div>

        <!-- Visitor Team -->
        <div class="bg-gray-800 rounded-lg p-6">
          <h3 class="text-lg font-semibold mb-4 text-red-400">Equipo Visitante</h3>
          <div class="space-y-4">
            <input
              v-model="scoreboard.gameState.visitor.name"
              @blur="scoreboard.updateTeamName('visitor', scoreboard.gameState.visitor.name)"
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              placeholder="Nombre del equipo visitante"
            />
            <div class="flex items-center justify-between">
              <div class="text-4xl font-bold text-red-400">
                {{ scoreboard.gameState.visitor.score }}
              </div>
              <div class="flex space-x-2">
                <button
                  @click="scoreboard.scorePoint('visitor')"
                  class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                >
                  +1
                </button>
                <button
                  @click="scoreboard.removePoint('visitor')"
                  class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  -1
                </button>
              </div>
            </div>
            <div class="text-sm text-gray-400">
              Sets ganados: {{ scoreboard.gameState.visitor.sets }}
            </div>
          </div>
        </div>
      </div>

      <!-- Game Controls -->
      <div class="bg-gray-800 rounded-lg p-6 mb-8">
        <h3 class="text-lg font-semibold mb-4">Controles del Juego</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            @click="scoreboard.toggleServe"
            class="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors"
          >
            🔄 Cambiar Saque
          </button>
          <button
            @click="scoreboard.nextSet"
            :disabled="!canAdvanceSet"
            class="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            ➡️ Siguiente Set
          </button>
          <button
            @click="scoreboard.rotateTeam('local')"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            🔄 Rotar Local
          </button>
          <button
            @click="scoreboard.rotateTeam('visitor')"
            class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            🔄 Rotar Visitante
          </button>
        </div>
      </div>

      <!-- Game History -->
      <div class="bg-gray-800 rounded-lg p-6">
        <h3 class="text-lg font-semibold mb-4">Historial del Juego</h3>
        <div class="max-h-64 overflow-y-auto space-y-2">
          <div
            v-for="event in scoreboard.gameState.history.slice(-10)"
            :key="event.id"
            class="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
          >
            <div class="flex items-center space-x-3">
              <span class="text-sm text-gray-400">{{ formatTime(typeof event.timestamp === 'number' ? event.timestamp : Date.now()) }}</span>
              <span class="text-sm">{{ event.message }}</span>
            </div>
            <span :class="getEventTypeClass(event.type)" class="text-xs px-2 py-1 rounded">
              {{ event.type }}
            </span>
          </div>
        </div>
      </div>
    </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useScoreboardStore } from '@/stores/scoreboard'
import { useCommunication } from '@/composables/useCommunication'
import { KEYBOARD_SHORTCUTS } from '@/utils/constants'

const scoreboard = useScoreboardStore()
const communication = useCommunication()

// Initialize game if not started
onMounted(() => {
  if (!scoreboard.gameState) {
    scoreboard.initializeGame()
  }
})

// Computed properties
const formatGameTime = computed(() => {
  if (!scoreboard.gameState?.startTime) return '00:00'
  const startTime = typeof scoreboard.gameState.startTime === 'string' ? new Date(scoreboard.gameState.startTime).getTime() : scoreboard.gameState.startTime.getTime()
  const elapsed = Date.now() - startTime
  const minutes = Math.floor(elapsed / 60000)
  const seconds = Math.floor((elapsed % 60000) / 1000)
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
})

const canAdvanceSet = computed(() => {
  if (!scoreboard.gameState) return false
  const local = scoreboard.gameState.local.score
  const visitor = scoreboard.gameState.visitor.score
  const minPoints = (scoreboard.currentSet || 1) === 5 ? 15 : 25
  const minAdvantage = 2
  
  return (local >= minPoints && local - visitor >= minAdvantage) || 
         (visitor >= minPoints && visitor - local >= minAdvantage)
})

// Utility functions
const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const getEventTypeClass = (type: string) => {
  const classes = {
    info: 'bg-blue-600 text-blue-100',
    success: 'bg-green-600 text-green-100',
    warning: 'bg-yellow-600 text-yellow-100',
    error: 'bg-red-600 text-red-100',
    local: 'bg-blue-600 text-blue-100',
    visitor: 'bg-red-600 text-red-100',
    winner: 'bg-purple-600 text-purple-100'
  }
  return classes[type as keyof typeof classes] || 'bg-gray-600 text-gray-100'
}

// Keyboard shortcuts
const handleKeydown = (event: KeyboardEvent) => {
  if (event.ctrlKey && event.code === KEYBOARD_SHORTCUTS.RESET_GAME) {
    event.preventDefault()
    scoreboard.resetGame()
    return
  }

  switch (event.code) {
    case KEYBOARD_SHORTCUTS.SCORE_LOCAL:
      event.preventDefault()
      scoreboard.scorePoint('local')
      break
    case KEYBOARD_SHORTCUTS.SCORE_VISITOR:
      event.preventDefault()
      scoreboard.scorePoint('visitor')
      break
    case KEYBOARD_SHORTCUTS.REMOVE_LOCAL:
      event.preventDefault()
      scoreboard.removePoint('local')
      break
    case KEYBOARD_SHORTCUTS.REMOVE_VISITOR:
      event.preventDefault()
      scoreboard.removePoint('visitor')
      break
    case KEYBOARD_SHORTCUTS.ROTATE_LOCAL:
      event.preventDefault()
      scoreboard.rotateTeam('local')
      break
    case KEYBOARD_SHORTCUTS.ROTATE_VISITOR:
      event.preventDefault()
      scoreboard.rotateTeam('visitor')
      break
    case KEYBOARD_SHORTCUTS.NEXT_SET:
      event.preventDefault()
      if (canAdvanceSet.value) scoreboard.nextSet()
      break
    case KEYBOARD_SHORTCUTS.TOGGLE_SERVE:
      event.preventDefault()
      scoreboard.toggleServe()
      break
  }
}

// Lifecycle
onMounted(() => {
  communication.listen((state) => {
    // Handle communication state updates if needed
    console.log('Communication state updated:', state)
  })
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
/* Animaciones personalizadas */
@keyframes scoreUpdate {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.score-animation {
  animation: scoreUpdate 0.3s ease-in-out;
}
</style>