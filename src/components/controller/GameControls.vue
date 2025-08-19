<template>
  <div class="game-controls bg-gray-800 rounded-lg p-6">
    <h3 class="text-lg font-semibold mb-4 text-white">Controles del Juego</h3>
    
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <!-- Start/Pause Game -->
      <button
        @click="$emit('toggle-game')"
        class="px-4 py-2 rounded-lg transition-colors font-medium"
        :class="gameStarted ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'"
      >
        {{ gameStarted ? '⏸️ Pausar' : '▶️ Iniciar' }}
      </button>
      
      <!-- Reset Set -->
      <button
        @click="$emit('reset-set')"
        class="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors font-medium"
      >
        🔄 Reset Set
      </button>
      
      <!-- Reset Game -->
      <button
        @click="$emit('reset-game')"
        class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors font-medium"
      >
        🗑️ Reset Juego
      </button>
      
      <!-- Switch Serve -->
      <button
        @click="$emit('switch-serve')"
        class="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors font-medium"
      >
        🔄 Cambiar Saque
      </button>
    </div>
    
    <!-- Serve Indicator -->
    <div class="mt-6 p-4 bg-gray-700 rounded-lg">
      <div class="text-sm text-gray-400 mb-2">Saque actual:</div>
      <div class="text-lg font-semibold text-yellow-400">
        {{ currentServe === 'local' ? localTeamName : visitorTeamName }}
      </div>
    </div>
    
    <!-- Game Status -->
    <div class="mt-4 grid grid-cols-3 gap-4 text-center">
      <div>
        <div class="text-sm text-gray-400">Set Actual</div>
        <div class="text-xl font-bold text-blue-400">{{ currentSet }}</div>
      </div>
      <div>
        <div class="text-sm text-gray-400">Tiempo</div>
        <div class="text-xl font-bold text-green-400">{{ gameTime }}</div>
      </div>
      <div>
        <div class="text-sm text-gray-400">Estado</div>
        <div class="text-xl font-bold" :class="gameStarted ? 'text-green-400' : 'text-gray-400'">
          {{ gameStarted ? 'En Juego' : 'Pausado' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  gameStarted: boolean
  currentServe: 'local' | 'visitor'
  localTeamName: string
  visitorTeamName: string
  currentSet: number
  gameTime: string
}

defineProps<Props>()

defineEmits<{
  'toggle-game': []
  'reset-set': []
  'reset-game': []
  'switch-serve': []
}>()
</script>