<template>
  <div class="scoreboard bg-gradient-to-r from-gray-900/95 to-gray-800/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700/50 p-6 min-w-[800px]">
    <!-- Header -->
    <div class="header text-center mb-4">
      <div class="text-lg font-bold text-blue-400 mb-1">🏐 VOLLEYBALL</div>
      <div class="text-sm text-gray-300">Set {{ currentSet }} de {{ maxSets }}</div>
    </div>

    <!-- Teams and Scores -->
    <div class="teams-container grid grid-cols-3 gap-6 items-center">
      <!-- Local Team -->
      <div class="team-local text-center">
        <div class="team-info mb-3">
          <div class="team-logo mb-2">
            <div class="w-16 h-16 mx-auto bg-blue-600 rounded-full flex items-center justify-center text-2xl font-bold">
              {{ getTeamInitials(localTeam.name) }}
            </div>
          </div>
          <div class="team-name text-lg font-semibold text-blue-400 truncate">
            {{ localTeam.name || 'Equipo Local' }}
          </div>
        </div>
        <div class="score-container">
          <div class="score text-6xl font-bold text-white mb-2 transition-all duration-300" :class="{ 'score-animation': localScoreChanged }">
            {{ localTeam.score }}
          </div>
          <div class="sets-won flex justify-center space-x-1">
            <div
              v-for="set in maxSets"
              :key="set"
              class="set-indicator w-3 h-3 rounded-full transition-colors duration-300"
              :class="set <= localTeam.sets ? 'bg-blue-500' : 'bg-gray-600'"
            ></div>
          </div>
          <div v-if="localTeam.serving" class="serving-indicator mt-2">
            <div class="text-xs text-yellow-400 font-semibold serving-pulse">SAQUE</div>
          </div>
        </div>
      </div>

      <!-- Center Info -->
      <div class="center-info text-center">
        <!-- Game Status -->
        <div class="game-status mb-4">
          <div class="text-sm text-gray-400 mb-1">ESTADO</div>
          <div class="text-lg font-semibold" :class="gameFinished ? 'text-red-400' : 'text-green-400'">
            {{ gameFinished ? 'FINALIZADO' : 'EN JUEGO' }}
          </div>
        </div>

        <!-- Game Time -->
        <div class="game-time">
          <div class="text-sm text-gray-400 mb-1">TIEMPO</div>
          <div class="text-xl font-mono text-green-400">{{ gameTime }}</div>
        </div>
      </div>

      <!-- Visitor Team -->
      <div class="team-visitor text-center">
        <div class="team-info mb-3">
          <div class="team-logo mb-2">
            <div class="w-16 h-16 mx-auto bg-red-600 rounded-full flex items-center justify-center text-2xl font-bold">
              {{ getTeamInitials(visitorTeam.name) }}
            </div>
          </div>
          <div class="team-name text-lg font-semibold text-red-400 truncate">
            {{ visitorTeam.name || 'Equipo Visitante' }}
          </div>
        </div>
        <div class="score-container">
          <div class="score text-6xl font-bold text-white mb-2 transition-all duration-300" :class="{ 'score-animation': visitorScoreChanged }">
            {{ visitorTeam.score }}
          </div>
          <div class="sets-won flex justify-center space-x-1">
            <div
              v-for="set in maxSets"
              :key="set"
              class="set-indicator w-3 h-3 rounded-full transition-colors duration-300"
              :class="set <= visitorTeam.sets ? 'bg-red-500' : 'bg-gray-600'"
            ></div>
          </div>
          <div v-if="visitorTeam.serving" class="serving-indicator mt-2">
            <div class="text-xs text-yellow-400 font-semibold serving-pulse">SAQUE</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Winner Banner -->
    <div v-if="gameFinished" class="winner-banner mt-6 p-4 bg-gradient-to-r from-yellow-600 to-yellow-500 rounded-lg text-center">
      <div class="text-2xl font-bold text-white mb-1">🏆 GANADOR</div>
      <div class="text-xl font-semibold text-white">
        {{ getWinner() }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Team } from '@/types/game.types'

interface Props {
  localTeam: Team
  visitorTeam: Team
  currentSet: number
  maxSets: number
  gameTime: string
  gameFinished: boolean
  localScoreChanged?: boolean
  visitorScoreChanged?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  localScoreChanged: false,
  visitorScoreChanged: false
})

const getTeamInitials = (name: string): string => {
  if (!name) return '?'
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2)
}

const getWinner = (): string => {
  if (props.localTeam.sets > props.visitorTeam.sets) {
    return props.localTeam.name || 'Equipo Local'
  }
  return props.visitorTeam.name || 'Equipo Visitante'
}
</script>