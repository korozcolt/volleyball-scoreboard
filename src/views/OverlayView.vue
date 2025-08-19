<template>
  <div class="overlay-view w-full h-full bg-transparent text-white font-sans overflow-hidden">
    <!-- Loading state -->
    <div v-if="!scoreboard.gameState" class="flex items-center justify-center h-full">
      <div class="text-white text-xl">Cargando...</div>
    </div>
    
    <!-- Main Scoreboard - New Design -->
    <div v-else class="scoreboard-container flex items-center justify-center h-screen w-screen absolute inset-0">
      <div class="scoreboard-new bg-black border-4 border-white p-8 max-w-6xl w-full mx-4">
        
        <!-- Main Content Row -->
        <div class="main-content flex items-center justify-between">
          
          <!-- Local Team Section -->
          <div class="team-section local-team flex items-center space-x-6">
            <!-- Team Logo -->
            <div class="team-logo-container">
              <div v-if="getTeamLogo('local')" class="team-logo w-20 h-20 overflow-hidden">
                <img :src="getTeamLogo('local')" :alt="scoreboard.gameState.local.name" class="w-full h-full object-cover" />
              </div>
              <div v-else class="team-logo w-20 h-20 bg-blue-600 flex items-center justify-center">
                <span class="text-2xl font-bold text-white">{{ getTeamInitials(scoreboard.gameState.local.name) }}</span>
              </div>
            </div>
            
            <!-- Team Info -->
            <div class="team-info">
              <!-- Team Label -->
              <div class="team-label text-sm font-bold text-white uppercase tracking-widest mb-1">
                LOCAL
              </div>
              <!-- Team Name -->
              <div class="team-name text-2xl font-bold text-white uppercase tracking-wide mb-2">
                {{ scoreboard.gameState.local.name || 'ATHLETIC' }}
              </div>
              <!-- Sets -->
              <div class="team-sets flex items-center space-x-2">
                <span class="sets-label text-sm font-bold text-white uppercase">SETS</span>
                <span class="sets-value text-xl font-bold text-white">{{ scoreboard.gameState.local.sets }}</span>
              </div>
            </div>
          </div>

          <!-- Center Section -->
          <div class="center-section flex items-center space-x-8">
            <!-- Local Points -->
            <div class="points-container local-points-container">
              <div class="points-box bg-blue-600 text-white text-6xl font-black px-8 py-4 transition-all duration-300" :class="{ 'score-animation': localScoreChanged }">
                {{ scoreboard.gameState.local.score }}
              </div>
            </div>
            
            <!-- Center Logo -->
            <div class="center-logo">
              <div v-if="getLeagueLogo()" class="league-logo w-24 h-24 mx-auto">
                <img :src="getLeagueLogo()" alt="Liga" class="w-full h-full object-contain" />
              </div>
              <div v-else class="volleyball-icon text-6xl">🏐</div>
            </div>
            
            <!-- Visitor Points -->
            <div class="points-container visitor-points-container">
              <div class="points-box bg-red-600 text-white text-6xl font-black px-8 py-4 transition-all duration-300" :class="{ 'score-animation': visitorScoreChanged }">
                {{ scoreboard.gameState.visitor.score }}
              </div>
            </div>
          </div>

          <!-- Visitor Team Section -->
          <div class="team-section visitor-team flex items-center space-x-6 flex-row-reverse">
            <!-- Team Logo -->
            <div class="team-logo-container">
              <div v-if="getTeamLogo('visitor')" class="team-logo w-20 h-20 overflow-hidden">
                <img :src="getTeamLogo('visitor')" :alt="scoreboard.gameState.visitor.name" class="w-full h-full object-cover" />
              </div>
              <div v-else class="team-logo w-20 h-20 bg-red-600 flex items-center justify-center">
                <span class="text-2xl font-bold text-white">{{ getTeamInitials(scoreboard.gameState.visitor.name) }}</span>
              </div>
            </div>
            
            <!-- Team Info -->
            <div class="team-info text-right">
              <!-- Team Label -->
              <div class="team-label text-sm font-bold text-white uppercase tracking-widest mb-1">
                VISITANTE
              </div>
              <!-- Team Name -->
              <div class="team-name text-2xl font-bold text-white uppercase tracking-wide mb-2">
                {{ scoreboard.gameState.visitor.name || 'INTER UNIDOS' }}
              </div>
              <!-- Sets -->
              <div class="team-sets flex items-center space-x-2 justify-end">
                <span class="sets-value text-xl font-bold text-white">{{ scoreboard.gameState.visitor.sets }}</span>
                <span class="sets-label text-sm font-bold text-white uppercase">SETS</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Game Status Overlay -->
    <div v-if="scoreboard.gameState.gameFinished || isSetFinished" class="game-status-overlay fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
      <div class="status-message bg-gradient-to-r from-yellow-600 to-yellow-500 text-black px-8 py-4 rounded-2xl shadow-2xl border-4 border-yellow-300">
        <div v-if="scoreboard.gameState.gameFinished" class="text-3xl font-bold text-center animate-bounce">
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useScoreboardStore } from '@/stores/scoreboard'
import { useCommunication } from '@/composables/useCommunication'
// Removed unused import

const scoreboard = useScoreboardStore()
const communication = useCommunication()

// Reactive state for animations
const localScoreChanged = ref(false)
const visitorScoreChanged = ref(false)
const notifications = ref<Array<{ id: string; message: string; type: string }>>([]);

// Initialize game on mount
onMounted(() => {
  if (!scoreboard.gameState) {
    scoreboard.initializeGame()
  }
  
  // Start listening for state changes
  communication.listen((newState) => {
    // Handle state updates if needed
    console.log('State updated:', newState)
  })
})

// Cleanup is handled automatically by the communication composable

// Watch for score changes to trigger animations
watch(
  () => scoreboard.gameState?.local.score,
  () => {
    localScoreChanged.value = true
    setTimeout(() => {
      localScoreChanged.value = false
    }, 1000)
  }
)

watch(
  () => scoreboard.gameState?.visitor.score,
  () => {
    visitorScoreChanged.value = true
    setTimeout(() => {
      visitorScoreChanged.value = false
    }, 1000)
  }
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
    .map(word => word.charAt(0))
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
</script>

<style scoped>
/* Apply Vina Sans font to all text */
.overlay-view {
  font-family: 'Vina Sans', cursive;
}

.scoreboard-new {
  font-family: 'Vina Sans', cursive;
  min-height: 300px;
  box-shadow: 0 0 30px rgba(255, 255, 255, 0.2);
}

.points-box {
  font-family: 'Vina Sans', cursive;
  min-width: 120px;
  text-align: center;
  border: 2px solid white;
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.3);
}

.team-name {
  font-family: 'Vina Sans', cursive;
}

.team-label {
  font-family: 'Vina Sans', cursive;
}

.sets-label {
  font-family: 'Vina Sans', cursive;
}

.sets-value {
  font-family: 'Vina Sans', cursive;
}

.score-animation {
  animation: scoreFlash 0.5s ease-in-out;
  transform: scale(1.1);
  box-shadow: 0 0 25px rgba(255, 255, 0, 0.6);
}

@keyframes scoreFlash {
  0% { transform: scale(1); }
  50% { transform: scale(1.15); box-shadow: 0 0 30px rgba(255, 255, 0, 0.8); }
  100% { transform: scale(1.1); }
}

.animate-slide-in {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.volleyball-icon {
  filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.5));
}

.team-logo img {
  transition: transform 0.3s ease;
}

.team-logo:hover img {
  transform: scale(1.05);
}

.game-status-overlay {
  backdrop-filter: blur(8px);
}

.status-message {
  animation: statusPulse 2s ease-in-out infinite;
  font-family: 'Vina Sans', cursive;
}

@keyframes statusPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

/* Responsive adjustments */
@media (max-width: 1024px) {
  .scoreboard-new {
    max-width: 90vw;
  }
  
  .points-box {
    text-size: 4xl;
    min-width: 100px;
    px: 6;
    py: 3;
  }
  
  .team-name {
    text-size: xl;
  }
}
</style>