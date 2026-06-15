<script setup lang="ts">
import type { GameState } from '@/types/game.types'

defineProps<{
  gameState: GameState
}>()
</script>

<template>
  <section class="admin-card p-6">
    <div class="mb-4 flex items-center justify-between">
      <h3 class="text-xl font-semibold text-broadcast-text">Historial de sets</h3>
      <span class="text-xs font-bold uppercase tracking-wider text-broadcast-muted">
        Mejor de {{ gameState.settings.maxSets }}
      </span>
    </div>
    <div class="grid grid-cols-2 gap-3 md:grid-cols-5">
      <div
        v-for="setNumber in gameState.settings.maxSets"
        :key="setNumber"
        class="flex min-h-[92px] flex-col items-center justify-center rounded border p-4 text-center"
        :class="
          gameState.completedSets[setNumber - 1]
            ? 'border-broadcast-accent/40 bg-broadcast-surface-high'
            : setNumber === gameState.currentSet
              ? 'border-broadcast-accent bg-broadcast-surface-low'
              : 'border-dashed border-broadcast-outline bg-broadcast-surface-lowest opacity-55'
        "
      >
        <div class="mb-2 text-xs font-bold uppercase text-broadcast-muted">Set {{ setNumber }}</div>
        <template v-if="gameState.completedSets[setNumber - 1]">
          <div class="text-2xl font-black text-broadcast-text">
            {{ gameState.completedSets[setNumber - 1].local }} -
            {{ gameState.completedSets[setNumber - 1].visitor }}
          </div>
          <div class="mt-1 text-xs font-bold text-broadcast-accent">
            {{ gameState[gameState.completedSets[setNumber - 1].winner].shortCode }}
          </div>
        </template>
        <template v-else-if="setNumber === gameState.currentSet">
          <div class="text-2xl font-black text-broadcast-text">
            {{ gameState.local.score }} - {{ gameState.visitor.score }}
          </div>
          <div class="mt-1 flex items-center gap-1 text-xs font-bold text-broadcast-accent">
            <span class="h-2 w-2 rounded-full bg-broadcast-accent"></span>
            Actual
          </div>
        </template>
        <div v-else class="text-2xl font-black text-broadcast-muted">-</div>
      </div>
    </div>
  </section>
</template>
