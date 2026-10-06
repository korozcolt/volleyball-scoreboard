<script setup lang="ts">
import { computed } from 'vue'
import OverlayFlag from '@/components/overlay/OverlayFlag.vue'
import OverlayFrame from '@/components/overlay/OverlayFrame.vue'
import type { GameState, StatisticsState, TeamSide } from '@/types/game.types'

const props = defineProps<{
  gameState: GameState
  statistics: StatisticsState
  attackEfficiency: (team: TeamSide) => number
  theme?: string
  compact?: boolean
}>()

const metrics = [
  { label: 'ATQ', key: 'attackPoints' },
  { label: 'BLQ', key: 'blockPoints' },
  { label: 'ACE', key: 'aces' },
  { label: 'ERR', key: 'opponentErrors' },
] as const

// Racha vigente: solo se muestra cuando de verdad es una racha (2 o más) y de quién es.
const run = computed(() => {
  const team = props.statistics.lastScoringTeam
  if (!team) return null
  const length = props.statistics[team].currentRun
  return length >= 2 ? { team, length } : null
})
</script>

<template>
  <OverlayFrame
    ribbon="Estadísticas"
    :local-color="gameState.local.primaryColor"
    :visitor-color="gameState.visitor.primaryColor"
    :theme="theme"
    :compact="compact"
  >
    <template #left>
      <OverlayFlag :team="gameState.local" />
      <div class="min-w-0 flex-1">
        <div class="team-code team-code-left ov-code">{{ gameState.local.shortCode.slice(0, 3) }}</div>
        <div class="team-name">{{ gameState.local.name }}</div>
      </div>
      <div class="ov-tiles">
        <div v-for="metric in metrics" :key="metric.key" class="ov-tile">
          <span class="ov-tile-label">{{ metric.label }}</span>
          <span class="ov-tile-value">{{ statistics.local[metric.key] }}</span>
        </div>
      </div>
    </template>

    <template #center>
      <div class="flex flex-col items-center justify-center gap-1.5 px-3">
        <div class="ov-core-label">% de ataque</div>
        <div class="flex items-center gap-3">
          <span class="ov-core-number">{{ attackEfficiency('local') }}%</span>
          <span class="h-9 w-px bg-white/25"></span>
          <span class="ov-core-number ov-core-number-dim">{{ attackEfficiency('visitor') }}%</span>
        </div>
        <div v-if="run" class="ov-pill">Racha {{ gameState[run.team].shortCode }} · {{ run.length }}</div>
      </div>
    </template>

    <template #right>
      <div class="ov-tiles">
        <div v-for="metric in metrics" :key="metric.key" class="ov-tile">
          <span class="ov-tile-label">{{ metric.label }}</span>
          <span class="ov-tile-value">{{ statistics.visitor[metric.key] }}</span>
        </div>
      </div>
      <div class="min-w-0 flex-1 text-right">
        <div class="team-code team-code-right ov-code">{{ gameState.visitor.shortCode.slice(0, 3) }}</div>
        <div class="team-name">{{ gameState.visitor.name }}</div>
      </div>
      <OverlayFlag :team="gameState.visitor" />
    </template>
  </OverlayFrame>
</template>
