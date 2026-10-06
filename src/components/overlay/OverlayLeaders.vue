<script setup lang="ts">
import { computed } from 'vue'
import { Star } from 'lucide-vue-next'
import OverlayFlag from '@/components/overlay/OverlayFlag.vue'
import OverlayFrame from '@/components/overlay/OverlayFrame.vue'
import type { GameState, StatisticsState, TeamSide } from '@/types/game.types'
import { buildLeaders, buildPlayerLines } from '@/utils/playerStats'

const props = defineProps<{
  gameState: GameState
  statistics: StatisticsState
  theme?: string
  compact?: boolean
}>()

// Mejor anotadora de cada equipo en todo el partido, con su desglose.
const cardFor = (side: TeamSide) => {
  const lines = buildPlayerLines(props.statistics.events, side, props.gameState[side].roster ?? [])
  const leader = buildLeaders(lines).points
  const line = leader ? lines.find((item) => item.playerNumber === leader.playerNumber) : undefined
  return { leader, line }
}

const cards = computed(() => ({ local: cardFor('local'), visitor: cardFor('visitor') }))
const shortName = (name: string) => name.split(' ').slice(0, 2).join(' ')
</script>

<template>
  <OverlayFrame
    ribbon="Líderes del partido"
    :local-color="gameState.local.primaryColor"
    :visitor-color="gameState.visitor.primaryColor"
    :theme="theme"
    :compact="compact"
  >
    <template #left>
      <OverlayFlag :team="gameState.local" />
      <div class="min-w-0 flex-1">
        <div class="ov-kicker">{{ gameState.local.name }}</div>
        <template v-if="cards.local.leader && cards.local.line">
          <div class="flex items-baseline gap-2">
            <span class="ov-lead-number">{{ cards.local.leader.value }}</span>
            <span class="ov-unit">pts</span>
          </div>
          <div class="ov-lead-name">
            #{{ cards.local.leader.playerNumber }}
            <span v-if="cards.local.leader.name">{{ shortName(cards.local.leader.name) }}</span>
          </div>
          <div class="ov-breakdown">
            ATQ {{ cards.local.line.attackPoints }} · BLQ {{ cards.local.line.blockPoints }} · ACE {{ cards.local.line.aces }}
          </div>
        </template>
        <div v-else class="ov-breakdown mt-3">Sin datos todavía</div>
      </div>
    </template>

    <template #center>
      <div class="flex flex-col items-center gap-1">
        <Star class="h-9 w-9 text-white" />
        <div class="ov-pill">Más puntos</div>
      </div>
    </template>

    <template #right>
      <div class="min-w-0 flex-1 text-right">
        <div class="ov-kicker">{{ gameState.visitor.name }}</div>
        <template v-if="cards.visitor.leader && cards.visitor.line">
          <div class="flex flex-row-reverse items-baseline gap-2">
            <span class="ov-lead-number">{{ cards.visitor.leader.value }}</span>
            <span class="ov-unit">pts</span>
          </div>
          <div class="ov-lead-name">
            #{{ cards.visitor.leader.playerNumber }}
            <span v-if="cards.visitor.leader.name">{{ shortName(cards.visitor.leader.name) }}</span>
          </div>
          <div class="ov-breakdown">
            ATQ {{ cards.visitor.line.attackPoints }} · BLQ {{ cards.visitor.line.blockPoints }} · ACE {{ cards.visitor.line.aces }}
          </div>
        </template>
        <div v-else class="ov-breakdown mt-3">Sin datos todavía</div>
      </div>
      <OverlayFlag :team="gameState.visitor" />
    </template>
  </OverlayFrame>
</template>
