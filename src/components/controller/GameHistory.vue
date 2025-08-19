<template>
  <div class="game-history bg-gray-800 rounded-lg p-6">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-white">Historial del Juego</h3>
      <button
        @click="$emit('clear-history')"
        class="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 rounded transition-colors"
        :disabled="history.length === 0"
      >
        🗑️ Limpiar
      </button>
    </div>
    
    <div class="max-h-64 overflow-y-auto space-y-2">
      <div
        v-if="history.length === 0"
        class="text-center text-gray-400 py-8"
      >
        No hay eventos registrados
      </div>
      
      <div
        v-for="event in reversedHistory"
        :key="event.id"
        class="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
      >
        <div class="flex items-center space-x-3">
          <div class="text-lg">{{ getEventIcon(event.type) }}</div>
          <div>
            <div class="text-sm font-medium text-white">
              {{ getEventDescription(event) }}
            </div>
            <div class="text-xs text-gray-400">
              {{ formatTime(event.timestamp) }}
            </div>
          </div>
        </div>
        
        <div class="text-right">
          <div class="text-sm font-medium text-white" v-if="event.score">
            {{ event.score.local }} - {{ event.score.visitor }}
          </div>
          <div class="text-xs text-gray-400">
            Set {{ event.set }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { GameHistory } from '@/types/game.types'

interface Props {
  history: GameHistory[]
}

const props = defineProps<Props>()

defineEmits<{
  'clear-history': []
}>()

const reversedHistory = computed(() => {
  return [...props.history].reverse()
})

const getEventIcon = (type: string): string => {
  const icons: Record<string, string> = {
    local: '🔵',
    visitor: '🔴',
    winner: '🏆',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    info: '📝'
  }
  return icons[type] || '📝'
}

const getEventDescription = (event: GameHistory): string => {
  switch (event.type) {
    case 'local':
      return 'Punto para Equipo Local'
    case 'visitor':
      return 'Punto para Equipo Visitante'
    case 'winner':
      return 'Juego terminado'
    case 'success':
      return 'Evento exitoso'
    case 'warning':
      return 'Advertencia'
    case 'error':
      return 'Error en el juego'
    case 'info':
    default:
      return event.message || 'Evento del juego'
  }
}

const formatTime = (timestamp: Date): string => {
  return new Date(timestamp).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}
</script>