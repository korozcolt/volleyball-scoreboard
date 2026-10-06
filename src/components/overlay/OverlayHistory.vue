<script setup lang="ts">
import { computed } from 'vue'
import OverlayFlag from '@/components/overlay/OverlayFlag.vue'
import OverlayFrame from '@/components/overlay/OverlayFrame.vue'
import type { GameState, TeamSide } from '@/types/game.types'

const props = defineProps<{
  gameState: GameState
  theme?: string
  compact?: boolean
}>()

const SLOT_WIDTH = 112

// Una columna por set jugado (más el que está en curso). Mínimo 3 para que el núcleo no sea más angosto
// que el del marcador (330px); máximo, el formato del partido.
const slotCount = computed(() => {
  const played = props.gameState.completedSets.length + (props.gameState.gameFinished ? 0 : 1)
  return Math.min(props.gameState.settings.maxSets, Math.max(3, played))
})

const slots = computed(() =>
  Array.from({ length: slotCount.value }, (_, index) => {
    const number = index + 1
    const done = props.gameState.completedSets[index]
    if (done) {
      return { number, state: 'done' as const, local: done.local, visitor: done.visitor, winner: done.winner as TeamSide }
    }
    if (number === props.gameState.currentSet && !props.gameState.gameFinished) {
      return {
        number,
        state: 'live' as const,
        local: props.gameState.local.score,
        visitor: props.gameState.visitor.score,
        winner: null,
      }
    }
    return { number, state: 'pending' as const, local: null, visitor: null, winner: null }
  }),
)

const coreWidth = computed(() => Math.max(330, slotCount.value * SLOT_WIDTH))
</script>

<template>
  <OverlayFrame
    ribbon="Historial de sets"
    :local-color="gameState.local.primaryColor"
    :visitor-color="gameState.visitor.primaryColor"
    :theme="theme"
    :compact="compact"
    :core-width="coreWidth"
  >
    <template #left>
      <OverlayFlag :team="gameState.local" small />
      <div class="min-w-0 flex-1">
        <div class="team-code team-code-left ov-code">{{ gameState.local.shortCode.slice(0, 3) }}</div>
        <div class="team-name">{{ gameState.local.name }}</div>
      </div>
      <div class="team-stats-box ov-sets-box" aria-label="Sets ganados local">
        <div class="stat-label">Sets</div>
        <div class="ov-sets-number">{{ gameState.local.sets }}</div>
      </div>
    </template>

    <template #center>
      <div class="flex h-full w-full items-stretch">
        <div
          v-for="slot in slots"
          :key="slot.number"
          class="ov-slot"
          :class="{ 'ov-slot-live': slot.state === 'live', 'ov-slot-pending': slot.state === 'pending' }"
        >
          <div class="ov-slot-label">{{ slot.state === 'live' ? 'En juego' : `Set ${slot.number}` }}</div>
          <div v-if="slot.state !== 'pending'" class="ov-slot-score">
            <span :class="slot.winner === 'visitor' ? 'ov-slot-loser' : ''">{{ slot.local }}</span>
            <span class="ov-slot-dash">–</span>
            <span :class="slot.winner === 'local' ? 'ov-slot-loser' : ''">{{ slot.visitor }}</span>
          </div>
          <div v-else class="ov-slot-score ov-slot-loser">–</div>
          <div class="ov-slot-bars">
            <span :style="{ backgroundColor: slot.winner === 'local' ? gameState.local.primaryColor : 'transparent' }"></span>
            <span :style="{ backgroundColor: slot.winner === 'visitor' ? gameState.visitor.primaryColor : 'transparent' }"></span>
          </div>
        </div>
      </div>
    </template>

    <template #right>
      <div class="team-stats-box ov-sets-box" aria-label="Sets ganados visitante">
        <div class="stat-label">Sets</div>
        <div class="ov-sets-number">{{ gameState.visitor.sets }}</div>
      </div>
      <div class="min-w-0 flex-1 text-right">
        <div class="team-code team-code-right ov-code">{{ gameState.visitor.shortCode.slice(0, 3) }}</div>
        <div class="team-name">{{ gameState.visitor.name }}</div>
      </div>
      <OverlayFlag :team="gameState.visitor" small />
    </template>
  </OverlayFrame>
</template>
