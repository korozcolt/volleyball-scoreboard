<template>
  <div class="overlay-view w-full h-full bg-transparent text-white font-sans overflow-hidden">
    <!-- Loading state -->
    <div v-if="!scoreboard.gameState" class="flex items-center justify-center h-full">
      <div class="text-white text-xl">Cargando...</div>
    </div>

    <!-- Centered Professional Scoreboard -->
    <div
      v-else
      class="scoreboard-container fixed inset-0 flex flex-col items-center justify-center z-50"
    >
      <!-- Sets Information Above Scoreboard - Centered Format -->
      <div class="sets-info w-full bg-transparent py-4 px-8 flex justify-center text-center mb-2">
        <div class="sets-display text-white text-5xl font-bold uppercase tracking-wider">
          <span class="text-blue-400">{{ scoreboard.gameState.local.sets }}</span>
          <span class="mx-6 text-6xl">SET</span>
          <span class="text-red-400">{{ scoreboard.gameState.visitor.sets }}</span>
        </div>
      </div>

      <div
        class="centered-scoreboard w-full bg-gradient-to-r from-gray-900 via-black to-gray-900 shadow-lg"
      >
        <!-- Main Scoreboard Bar -->
        <div class="scoreboard-bar h-44 px-8 flex items-center justify-between">
          <!-- Local Team Section -->
          <div class="team-section local-team flex items-center space-x-6 flex-1 min-w-0">
            <!-- Team Logo -->
            <div class="team-logo-container w-32 h-32 flex-shrink-0 relative">
              <div v-if="getTeamLogo('local')" class="team-logo w-full h-full">
                <img
                  :src="getTeamLogo('local')"
                  :alt="scoreboard.gameState.local.name"
                  class="w-full h-full object-contain"
                />
              </div>
              <div
                v-else
                class="team-logo-placeholder w-full h-full bg-blue-600 flex items-center justify-center text-white font-bold text-4xl"
              >
                {{ getTeamInitials(scoreboard.gameState.local.name) }}
              </div>
              <!-- Serve Indicator -->
              <div
                v-if="scoreboard.gameState.local.serving"
                class="serve-indicator absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-pulse"
              >
                <span class="text-black text-sm font-bold">🏐</span>
              </div>
            </div>

            <!-- Team Info -->
            <div class="team-info flex-grow mx-4">
              <div
                class="team-name text-white text-5xl font-black uppercase tracking-wider"
                style="transform: scaleX(2.2); transform-origin: left"
              >
                {{ scoreboard.gameState.local.name || 'ATHLETIC' }}
              </div>
            </div>
          </div>

          <!-- Center Score Section -->
          <div class="score-section flex items-center space-x-8 px-12">
            <!-- Local Score -->
            <div class="score-display">
              <div
                class="score-number local-score text-white text-9xl font-black px-8 py-6 bg-blue-600 min-w-[160px] text-center transition-all duration-300"
                :class="{ 'score-flash': localScoreChanged }"
              >
                {{ scoreboard.gameState.local.score }}
              </div>
            </div>

            <!-- Center Logo/Divider -->
            <div class="center-element flex flex-col items-center space-y-4">
              <div class="league-logo-container w-24 h-24">
                <div v-if="getLeagueLogo()" class="league-logo w-full h-full">
                  <img
                    :src="getLeagueLogo()"
                    alt="Liga"
                    class="w-full h-full object-contain opacity-90"
                  />
                </div>
                <div
                  v-else
                  class="volleyball-icon w-full h-full text-white/50 flex items-center justify-center text-6xl"
                >
                  🏐
                </div>
              </div>
              <div
                class="score-divider w-24 h-1 bg-gradient-to-r from-transparent via-gray-400 to-transparent"
              ></div>
            </div>

            <!-- Visitor Score -->
            <div class="score-display">
              <div
                class="score-number visitor-score text-white text-9xl font-black px-8 py-6 bg-red-600 min-w-[160px] text-center transition-all duration-300"
                :class="{ 'score-flash': visitorScoreChanged }"
              >
                {{ scoreboard.gameState.visitor.score }}
              </div>
            </div>
          </div>

          <!-- Visitor Team Section -->
          <div
            class="team-section visitor-team flex items-center space-x-6 flex-1 min-w-0 justify-end"
          >
            <!-- Team Info -->
            <div class="team-info flex-grow mx-4 text-right">
              <div
                class="team-name text-white text-5xl font-black uppercase tracking-wider"
                style="transform: scaleX(2.2); transform-origin: right"
              >
                {{ scoreboard.gameState.visitor.name || 'INTER UNIDOS' }}
              </div>
            </div>

            <!-- Team Logo -->
            <div class="team-logo-container w-32 h-32 flex-shrink-0 relative">
              <div v-if="getTeamLogo('visitor')" class="team-logo w-full h-full">
                <img
                  :src="getTeamLogo('visitor')"
                  :alt="scoreboard.gameState.visitor.name"
                  class="w-full h-full object-contain"
                />
              </div>
              <div
                v-else
                class="team-logo-placeholder w-full h-full bg-red-600 flex items-center justify-center text-white font-bold text-4xl"
              >
                {{ getTeamInitials(scoreboard.gameState.visitor.name) }}
              </div>
              <!-- Serve Indicator -->
              <div
                v-if="scoreboard.gameState.visitor.serving"
                class="serve-indicator absolute -top-2 -left-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-pulse"
              >
                <span class="text-black text-sm font-bold">🏐</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Game Status Overlay -->
    <div
      v-if="scoreboard.gameState.gameFinished || isSetFinished"
      class="game-status-overlay fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50"
    >
      <div
        class="status-message bg-gradient-to-r from-yellow-600 to-yellow-500 text-black px-8 py-4 rounded-2xl shadow-2xl border-4 border-yellow-300"
      >
        <div
          v-if="scoreboard.gameState.gameFinished"
          class="text-3xl font-bold text-center animate-bounce"
        >
          🏆 {{ getWinner() }} GANA EL PARTIDO! 🏆
        </div>
        <div v-else-if="isSetFinished" class="text-2xl font-bold text-center">
          🎉 {{ getSetWinner() }} gana el Set {{ scoreboard.currentSet }}!
        </div>
      </div>
    </div>

    <!-- Notification System -->
    <div class="notifications fixed top-4 right-4 space-y-2 z-50">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        class="notification bg-gray-900/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg shadow-lg border border-gray-700 animate-slide-in"
        :class="getNotificationClass(notification.type)"
      >
        {{ notification.message }}
      </div>
    </div>

    <!-- Score History Component -->
    <ScoreHistory
      :is-visible="showScoreHistory"
      :local-team-name="scoreboard.gameState?.local.name || 'Local'"
      :visitor-team-name="scoreboard.gameState?.visitor.name || 'Visitante'"
      @hide="hideScoreHistory"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useScoreboardStore } from '@/stores/scoreboard'
import { useCommunication } from '@/composables/useCommunication'
import ScoreHistory from '@/components/overlay/ScoreHistory.vue'

const scoreboard = useScoreboardStore()
const communication = useCommunication()

// Reactive state for animations
const localScoreChanged = ref(false)
const visitorScoreChanged = ref(false)
const notifications = ref<Array<{ id: string; message: string; type: string }>>([])

// Estado para el historial de puntos
const showScoreHistory = ref(false)

// Initialize game on mount
onMounted(() => {
  if (!scoreboard.gameState) {
    scoreboard.initializeGame()
  }

  // Start listening for state changes
  communication.listen((newState) => {
    // Apply received state to the scoreboard
    if (newState) {
      scoreboard.restoreGameState(newState)
      console.log('Overlay state updated:', newState)
    }
  })

  // Listen for show score history event
  window.addEventListener('showScoreHistory', showScoreHistoryPanel)
})

// Cleanup is handled automatically by the communication composable
onUnmounted(() => {
  // Remove event listener
  window.removeEventListener('showScoreHistory', showScoreHistoryPanel)
})

// Watch for score changes to trigger animations
watch(
  () => scoreboard.gameState?.local.score,
  () => {
    localScoreChanged.value = true
    setTimeout(() => {
      localScoreChanged.value = false
    }, 1000)
  },
)

watch(
  () => scoreboard.gameState?.visitor.score,
  () => {
    visitorScoreChanged.value = true
    setTimeout(() => {
      visitorScoreChanged.value = false
    }, 1000)
  },
)

// Computed properties

const isSetFinished = computed(() => {
  if (!scoreboard.gameState) return false

  const local = scoreboard.gameState.local
  const visitor = scoreboard.gameState.visitor
  const settings = scoreboard.gameState.settings

  return (
    (local.score >= settings.pointsToWin && local.score - visitor.score >= 2) ||
    (visitor.score >= settings.pointsToWin && visitor.score - local.score >= 2)
  )
})

// Removed unused computed property

// Helper functions
const getTeamInitials = (teamName: string): string => {
  if (!teamName) return '??'
  return teamName
    .split(' ')
    .map((word) => word.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase()
}

const getTeamLogo = (team: 'local' | 'visitor'): string | undefined => {
  const settings = scoreboard.settingsManager?.settings
  if (!settings) return undefined

  return settings.teamLogos[team] || undefined
}

const getLeagueLogo = (): string | undefined => {
  const settings = scoreboard.settingsManager?.settings
  if (!settings) return undefined

  return settings.leagueLogo || undefined
}

const getWinner = (): string => {
  if (!scoreboard.gameState) return ''

  const local = scoreboard.gameState.local
  const visitor = scoreboard.gameState.visitor

  if (local.sets > visitor.sets) {
    return local.name
  } else if (visitor.sets > local.sets) {
    return visitor.name
  }

  return 'EMPATE'
}

const getSetWinner = (): string => {
  if (!scoreboard.gameState) return ''

  const local = scoreboard.gameState.local
  const visitor = scoreboard.gameState.visitor

  if (local.score > visitor.score) {
    return local.name
  } else if (visitor.score > local.score) {
    return visitor.name
  }

  return 'EMPATE'
}

const getNotificationClass = (type: string): string => {
  switch (type) {
    case 'success':
      return 'border-green-500 bg-green-900/90'
    case 'warning':
      return 'border-yellow-500 bg-yellow-900/90'
    case 'error':
      return 'border-red-500 bg-red-900/90'
    default:
      return 'border-blue-500 bg-blue-900/90'
  }
}

// Funciones para el historial de puntos
const showScoreHistoryPanel = () => {
  showScoreHistory.value = true
}

const hideScoreHistory = () => {
  showScoreHistory.value = false
}

// Exponer función para uso externo
defineExpose({
  showScoreHistoryPanel,
})
</script>

<style scoped>
/* Centered Professional Scoreboard Styles */
.overlay-view {
  font-family: 'Inter', 'Roboto', 'Helvetica Neue', sans-serif;
  font-weight: 600;
}

/* Centered Scoreboard Container */
.centered-scoreboard {
  position: relative;
  backdrop-filter: blur(8px);
  border-radius: 0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
  margin: 0;
}

/* Main Scoreboard Bar */
.scoreboard-bar {
  background: linear-gradient(180deg, rgba(17, 24, 39, 0.98) 0%, rgba(0, 0, 0, 0.98) 100%);
  border-radius: 0;
  min-height: 176px;
}

/* Team Sections */
.team-section {
  min-width: 0;
  flex: 1;
}

.team-info {
  min-width: 0;
}

/* Team Names */
.team-name {
  font-family: 'Inter', 'Roboto', sans-serif;
  font-weight: 900;
  letter-spacing: 0em;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
  font-size: 1.5rem;
}

/* Team Sets */
.team-sets {
  font-family: 'Inter', 'Roboto', sans-serif;
  font-weight: 900;
  letter-spacing: 0.15em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
}

/* Team Logos */
.team-logo-container {
  flex-shrink: 0;
}

.team-logo {
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.4));
  transition: all 0.3s ease;
}

.team-logo:hover {
  transform: scale(1.05);
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.6));
}

.team-logo-placeholder {
  border: none;
  border-radius: 0;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.4));
}

/* Score Section */
.score-section {
  flex-shrink: 0;
}

/* Score Numbers */
.score-number {
  font-family: 'Inter', 'Roboto', sans-serif;
  font-weight: 900;
  letter-spacing: -0.05em;
  border: none;
  border-radius: 0;
  box-shadow:
    inset 0 2px 4px rgba(0, 0, 0, 0.3),
    0 4px 12px rgba(0, 0, 0, 0.4);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.home-score,
.local-score {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
}

.away-score,
.visitor-score {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
}

/* Score Animation */
.score-flash {
  animation: scoreFlash 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

@keyframes scoreFlash {
  0% {
    transform: scale(1);
    box-shadow:
      inset 0 2px 4px rgba(0, 0, 0, 0.3),
      0 4px 12px rgba(0, 0, 0, 0.4);
  }
  25% {
    transform: scale(1.08);
    box-shadow:
      inset 0 2px 4px rgba(0, 0, 0, 0.3),
      0 8px 24px rgba(255, 255, 255, 0.3),
      0 0 20px rgba(255, 255, 255, 0.2);
  }
  100% {
    transform: scale(1);
    box-shadow:
      inset 0 2px 4px rgba(0, 0, 0, 0.3),
      0 4px 12px rgba(0, 0, 0, 0.4);
  }
}

/* Center Element */
.center-element {
  flex-shrink: 0;
}

.league-logo-container {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
}

.league-logo {
  transition: all 0.3s ease;
}

.volleyball-icon {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
}

.score-divider {
  opacity: 0.7;
}

/* Notification Styles */
.animate-slide-in {
  animation: slideIn 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

@keyframes slideIn {
  from {
    transform: translateX(100%) translateY(-10px);
    opacity: 0;
  }
  to {
    transform: translateX(0) translateY(0);
    opacity: 1;
  }
}

.notification {
  font-family: 'Inter', 'Roboto', sans-serif;
  font-weight: 600;
}

/* Responsive Design */
@media (max-width: 1200px) {
  .scoreboard-bar {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }

  .score-section {
    padding-left: 2rem;
    padding-right: 2rem;
  }

  .team-section {
    gap: 1rem;
  }
}

@media (max-width: 768px) {
  .scoreboard-bar {
    height: 3.5rem;
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .score-section {
    gap: 1.5rem;
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }

  .score-number {
    font-size: 3rem;
    padding: 0.5rem 1rem;
    min-width: 80px;
  }

  .team-name {
    font-size: 1rem;
  }

  .team-sets {
    font-size: 0.75rem;
  }

  .team-logo-container {
    width: 2.5rem;
    height: 2.5rem;
  }

  .league-logo-container {
    width: 2rem;
    height: 2rem;
  }
}

@media (max-width: 480px) {
  .scoreboard-bar {
    height: 3rem;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }

  .team-section {
    gap: 0.75rem;
  }

  .score-section {
    gap: 1rem;
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .score-number {
    font-size: 2.5rem;
    padding: 0.375rem 0.75rem;
    min-width: 70px;
  }

  .team-name {
    font-size: 0.875rem;
  }

  .team-sets {
    font-size: 0.625rem;
  }

  .team-logo-container {
    width: 2rem;
    height: 2rem;
  }

  .league-logo-container {
    width: 1.5rem;
    height: 1.5rem;
  }
}
</style>
