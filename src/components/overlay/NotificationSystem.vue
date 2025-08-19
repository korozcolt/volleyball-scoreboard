<template>
  <div class="notification-system fixed top-4 right-4 z-50 space-y-2">
    <transition-group name="notification" tag="div">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        class="notification-item p-4 rounded-lg shadow-lg backdrop-blur-sm border max-w-sm"
        :class="getNotificationClasses(notification.type)"
      >
        <div class="flex items-start space-x-3">
          <div class="notification-icon text-xl flex-shrink-0">
            {{ getNotificationIcon(notification.type) }}
          </div>
          <div class="notification-content flex-1 min-w-0">
            <div class="notification-message text-sm font-medium text-white">
              {{ notification.message }}
            </div>
            <div class="notification-time text-xs text-gray-300 mt-1">
              {{ formatTime(notification.timestamp) }}
            </div>
            <div v-if="notification.score" class="notification-score text-xs text-gray-300 mt-1">
              {{ notification.score.local }} - {{ notification.score.visitor }}
            </div>
          </div>
          <button
            @click="removeNotification(notification.id)"
            class="text-gray-400 hover:text-white transition-colors flex-shrink-0"
          >
            ✕
          </button>
        </div>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import type { GameHistory, HistoryType } from '@/types/game.types'

interface NotificationItem extends GameHistory {
  id: string
}

interface Props {
  notifications: NotificationItem[]
  autoRemove?: boolean
  autoRemoveDelay?: number
}

defineProps<Props>()

const emit = defineEmits<{
  'remove-notification': [id: string]
}>()

const getNotificationClasses = (type: HistoryType): string => {
  const baseClasses = 'border-l-4'
  
  switch (type) {
    case 'local':
      return `${baseClasses} bg-blue-900/90 border-blue-500 border-blue-500/50`
    case 'visitor':
      return `${baseClasses} bg-red-900/90 border-red-500 border-red-500/50`
    case 'winner':
      return `${baseClasses} bg-yellow-900/90 border-yellow-500 border-yellow-500/50`
    case 'success':
      return `${baseClasses} bg-green-900/90 border-green-500 border-green-500/50`
    case 'warning':
      return `${baseClasses} bg-orange-900/90 border-orange-500 border-orange-500/50`
    case 'error':
      return `${baseClasses} bg-red-900/90 border-red-500 border-red-500/50`
    case 'info':
    default:
      return `${baseClasses} bg-gray-900/90 border-gray-500 border-gray-500/50`
  }
}

const getNotificationIcon = (type: HistoryType): string => {
  switch (type) {
    case 'local':
      return '🔵'
    case 'visitor':
      return '🔴'
    case 'winner':
      return '🏆'
    case 'success':
      return '✅'
    case 'warning':
      return '⚠️'
    case 'error':
      return '❌'
    case 'info':
    default:
      return '📝'
  }
}

const formatTime = (timestamp: Date): string => {
  return new Date(timestamp).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const removeNotification = (id: string): void => {
  emit('remove-notification', id)
}
</script>

<style scoped>
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.notification-move {
  transition: transform 0.3s ease;
}
</style>