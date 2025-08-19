<template>
  <div class="score-control bg-gray-800 rounded-lg p-4">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold" :class="teamColor">{{ teamName }}</h3>
      <div class="text-sm text-gray-400">Sets: {{ sets }}</div>
    </div>
    
    <div class="flex items-center justify-between">
      <div class="text-4xl font-bold text-white">
        {{ score }}
      </div>
      
      <div class="flex space-x-2">
        <button
          @click="$emit('add-point')"
          class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
          :disabled="disabled"
        >
          +1
        </button>
        <button
          @click="$emit('remove-point')"
          class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          :disabled="disabled || score === 0"
        >
          -1
        </button>
      </div>
    </div>
    
    <div class="mt-4">
      <input
        :value="teamName"
        @input="$emit('update-name', ($event.target as HTMLInputElement).value)"
        class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
        :placeholder="`Nombre del ${teamType}`"
        :disabled="disabled"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  teamName: string
  score: number
  sets: number
  teamType: 'local' | 'visitor'
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
})

defineEmits<{
  'add-point': []
  'remove-point': []
  'update-name': [name: string]
}>()

const teamColor = computed(() => {
  return props.teamType === 'local' ? 'text-blue-400' : 'text-red-400'
})
</script>