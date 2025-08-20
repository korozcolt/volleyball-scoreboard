<template>
  <Transition
    name="slide-history"
    @enter="onEnter"
    @leave="onLeave"
    @after-leave="onAfterLeave"
  >
    <div
      v-if="isVisible"
      class="score-history-container"
      ref="historyContainer"
    >
      <!-- Tabla de historial de puntos -->
      <div class="history-table-container">
        <table class="history-table">
          <tbody>
            <tr v-if="scoreHistory.length === 0" class="no-history-row">
              <td colspan="3" class="no-history-cell">
                Sin historial de puntos
              </td>
            </tr>
            <tr v-else v-for="(score, index) in scoreHistory.slice(0, 6)" 
                :key="index" 
                class="history-row"
                :class="{ 'latest-row': index === 0 }">
              <!-- Puntos equipo local -->
              <td class="score-cell local-cell" 
                  :class="{ 'point-scored': index === 0 && lastPointTeam === 'local' }">
                <span class="score-value">{{ score.local }}</span>
              </td>
              <!-- Separador -->
              <td class="separator-cell">
                <span class="separator">-</span>
              </td>
              <!-- Puntos equipo visitante -->
              <td class="score-cell visitor-cell"
                  :class="{ 'point-scored': index === 0 && lastPointTeam === 'visitor' }">
                <span class="score-value">{{ score.visitor }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Indicadores de estado del juego -->
      <div class="game-indicators">
        <!-- Set Point -->
        <div v-if="isSetPoint" class="indicator set-point-indicator">
          <span class="indicator-text">SET POINT</span>
        </div>
        
        <!-- Match Point -->
        <div v-if="isMatchPoint" class="indicator match-point-indicator">
          <span class="indicator-text">MATCH POINT</span>
        </div>
        
        <!-- Time Out -->
        <div v-if="showTimeOut" class="timeout-container">
          <div class="timeout-box local-timeout" v-if="localTimeouts > 0">
            <span class="timeout-label">TIME OUT</span>
            <span class="timeout-count">{{ localTimeouts }}</span>
          </div>
          <div class="timeout-box visitor-timeout" v-if="visitorTimeouts > 0">
            <span class="timeout-label">TIME OUT</span>
            <span class="timeout-count">{{ visitorTimeouts }}</span>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, watch, onUnmounted, ref } from 'vue'
import { useScoreboardStore } from '@/stores/scoreboard'

interface Props {
  isVisible: boolean
  localTeamName: string
  visitorTeamName: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  hide: []
}>()

const scoreboard = useScoreboardStore()
const historyContainer = ref<HTMLElement | null>(null)
let autoHideTimer: number | null = null

// Estados para timeouts (estos podrían venir del store en el futuro)
const localTimeouts = ref(0)
const visitorTimeouts = ref(0)
const showTimeOut = ref(false)

// Computed para obtener el historial de puntos
const scoreHistory = computed(() => {
  if (scoreboard.scoreHistory.length === 0) {
    return []
  }
  return scoreboard.scoreHistory
})

// Computed para determinar quién anotó el último punto
const lastPointTeam = computed(() => {
  if (scoreboard.scoreHistory.length < 2) return null
  
  const current = scoreboard.scoreHistory[0]
  const previous = scoreboard.scoreHistory[1]
  
  if (current.local > previous.local) return 'local'
  if (current.visitor > previous.visitor) return 'visitor'
  return null
})

// Computed para detectar SET POINT
const isSetPoint = computed(() => {
  if (!scoreboard.gameState) return false
  
  const local = scoreboard.gameState.local.score
  const visitor = scoreboard.gameState.visitor.score
  const currentSet = scoreboard.gameState.currentSet
  const pointsToWin = currentSet === 5 ? 15 : 25
  
  // Set point para equipo local
  if (local >= pointsToWin - 1 && local - visitor >= 1) {
    return true
  }
  
  // Set point para equipo visitante
  if (visitor >= pointsToWin - 1 && visitor - local >= 1) {
    return true
  }
  
  return false
})

// Computed para detectar MATCH POINT
const isMatchPoint = computed(() => {
  if (!scoreboard.gameState) return false
  
  const localSets = scoreboard.gameState.local.sets
  const visitorSets = scoreboard.gameState.visitor.sets
  const setsToWin = Math.ceil(scoreboard.gameState.settings.maxSets / 2)
  
  // Si algún equipo está a un set de ganar Y es set point
  if ((localSets === setsToWin - 1 || visitorSets === setsToWin - 1) && isSetPoint.value) {
    return true
  }
  
  return false
})

// Watch para auto-ocultar después de 6 segundos
watch(() => props.isVisible, (newValue) => {
  if (newValue) {
    // Limpiar timer anterior si existe
    if (autoHideTimer) {
      clearTimeout(autoHideTimer)
    }
    
    // Configurar auto-ocultado después de 6 segundos
    autoHideTimer = setTimeout(() => {
      emit('hide')
    }, 6000)
  } else {
    // Limpiar timer si se oculta manualmente
    if (autoHideTimer) {
      clearTimeout(autoHideTimer)
      autoHideTimer = null
    }
  }
})

// Funciones de animación mejoradas
const onEnter = (el: Element) => {
  const element = el as HTMLElement
  // Iniciar desde abajo
  element.style.transform = 'translateX(-50%) translateY(120%)'
  element.style.opacity = '0'
  
  // Forzar reflow para asegurar que la animación funcione
  void element.offsetHeight
  
  // Aplicar transición y mover a posición final
  requestAnimationFrame(() => {
    element.style.transition = 'all 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    element.style.transform = 'translateX(-50%) translateY(0)'
    element.style.opacity = '1'
  })
}

const onLeave = (el: Element) => {
  const element = el as HTMLElement
  // Animar hacia arriba
  element.style.transition = 'all 0.5s cubic-bezier(0.55, 0.055, 0.675, 0.19)'
  element.style.transform = 'translateX(-50%) translateY(-120%)'
  element.style.opacity = '0'
}

const onAfterLeave = () => {
  // Limpiar cualquier estilo residual después de la animación
  if (historyContainer.value) {
    historyContainer.value.style.transform = ''
    historyContainer.value.style.opacity = ''
    historyContainer.value.style.transition = ''
  }
}

// Limpiar timer al desmontar el componente
onUnmounted(() => {
  if (autoHideTimer) {
    clearTimeout(autoHideTimer)
  }
})
</script>

<style scoped>
/* Contenedor principal - se muestra justo debajo del scoreboard */
.score-history-container {
  position: fixed;
  top: 220px; /* Justo debajo del scoreboard principal */
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 1200px;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(10px);
  padding: 0;
  z-index: 1500;
  will-change: transform, opacity;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Contenedor de la tabla de historial */
.history-table-container {
  background: linear-gradient(to bottom, #1a1a2e, #0f0f1e);
  border: 2px solid #4a00e0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(74, 0, 224, 0.3);
}

/* Tabla de historial */
.history-table {
  width: 100%;
  border-collapse: collapse;
}

/* Filas de la tabla */
.history-row {
  background: rgba(255, 255, 255, 0.02);
  transition: all 0.3s ease;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.history-row:hover {
  background: rgba(255, 255, 255, 0.05);
}

/* Fila más reciente */
.latest-row {
  background: rgba(74, 0, 224, 0.1);
  animation: pulseRow 2s ease-in-out infinite;
}

@keyframes pulseRow {
  0%, 100% {
    background: rgba(74, 0, 224, 0.1);
  }
  50% {
    background: rgba(74, 0, 224, 0.2);
  }
}

/* Celdas de puntuación */
.score-cell {
  padding: 12px 24px;
  text-align: center;
  font-size: 1.8rem;
  font-weight: bold;
  font-family: 'Arial Black', sans-serif;
  min-width: 80px;
}

.local-cell {
  color: #ffffff;
  background: linear-gradient(90deg, transparent, rgba(37, 99, 235, 0.1));
}

.visitor-cell {
  color: #ffffff;
  background: linear-gradient(90deg, rgba(220, 38, 38, 0.1), transparent);
}

/* Celda con punto anotado */
.point-scored {
  color: #fbbf24;
  text-shadow: 0 0 10px rgba(251, 191, 36, 0.5);
  animation: scoreFlash 0.6s ease;
}

@keyframes scoreFlash {
  0% {
    transform: scale(1);
    color: #fbbf24;
  }
  50% {
    transform: scale(1.2);
    color: #f59e0b;
  }
  100% {
    transform: scale(1);
    color: #fbbf24;
  }
}

/* Separador */
.separator-cell {
  padding: 12px 8px;
  text-align: center;
  color: #6b7280;
  font-size: 1.5rem;
  font-weight: bold;
}

/* Fila sin historial */
.no-history-row {
  background: transparent;
}

.no-history-cell {
  padding: 20px;
  text-align: center;
  color: #6b7280;
  font-size: 1rem;
  font-style: italic;
}

/* Indicadores de estado del juego */
.game-indicators {
  display: flex;
  justify-content: center;
  gap: 20px;
  padding: 10px;
}

/* Indicador genérico */
.indicator {
  padding: 8px 24px;
  border-radius: 6px;
  font-weight: bold;
  font-size: 1.2rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  animation: blink 1.5s ease-in-out infinite;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

/* SET POINT */
.set-point-indicator {
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  color: white;
  border: 2px solid #c084fc;
}

/* MATCH POINT */
.match-point-indicator {
  background: linear-gradient(135deg, #dc2626, #ef4444);
  color: white;
  border: 2px solid #f87171;
  animation: matchPointPulse 1s ease-in-out infinite;
}

@keyframes matchPointPulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 4px 25px rgba(220, 38, 38, 0.5);
  }
}

@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

/* Contenedor de timeouts */
.timeout-container {
  display: flex;
  gap: 20px;
  justify-content: center;
}

/* Caja de timeout */
.timeout-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  border-radius: 6px;
  background: linear-gradient(135deg, #1e40af, #3b82f6);
  border: 2px solid #60a5fa;
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
}

.timeout-label {
  color: white;
  font-weight: bold;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.timeout-count {
  background: white;
  color: #1e40af;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: bold;
  font-size: 1rem;
  min-width: 24px;
  text-align: center;
}

/* Animaciones de transición mejoradas */
.slide-history-enter-active {
  transition: all 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.slide-history-leave-active {
  transition: all 0.5s cubic-bezier(0.55, 0.055, 0.675, 0.19);
}

.slide-history-enter-from {
  transform: translateX(-50%) translateY(120%);
  opacity: 0;
}

.slide-history-leave-to {
  transform: translateX(-50%) translateY(-120%);
  opacity: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .score-history-container {
    min-width: 280px;
    max-width: 90vw;
    padding: 15px;
  }
  
  .history-title {
    font-size: 1rem;
  }
  
  .score-numbers {
    font-size: 1rem;
  }
  
  .team-name {
    font-size: 0.8rem;
    max-width: 60px;
  }
}
</style>