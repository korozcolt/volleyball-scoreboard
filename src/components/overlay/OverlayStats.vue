<script setup lang="ts">
import { Activity, Radio } from 'lucide-vue-next'
import type { GameState, StatisticsState, TeamSide } from '@/types/game.types'

defineProps<{
  gameState: GameState
  statistics: StatisticsState
  efficiency: (team: TeamSide) => number
}>()

const metricRows = [
  { label: 'ATQ', key: 'attackPoints' },
  { label: 'BLK', key: 'blockPoints' },
  { label: 'ACE', key: 'aces' },
  { label: 'ERR', key: 'opponentErrors' },
] as const
</script>

<template>
  <div class="stats-overlay relative mx-auto grid h-[144px] w-full max-w-[1220px] grid-cols-[1fr_220px_1fr] overflow-hidden text-white">
    <section
      v-for="side in (['local', 'visitor'] as TeamSide[])"
      :key="side"
      class="stats-team-panel relative flex min-w-0 items-center gap-4 px-8"
      :class="side === 'visitor' ? 'order-3 flex-row-reverse text-right' : 'order-1'"
      :style="{ '--team-color': gameState[side].primaryColor }"
    >
      <div class="stats-team-code">{{ gameState[side].shortCode.slice(0, 3) }}</div>
      <div class="min-w-0 flex-1">
        <div class="truncate text-xs font-black uppercase tracking-[0.22em] text-white/60">
          {{ gameState[side].name }}
        </div>
        <div class="mt-3 grid grid-cols-4 gap-2">
          <div
            v-for="metric in metricRows"
            :key="metric.key"
            class="rounded border border-white/15 bg-black/24 px-2 py-1"
          >
            <div class="text-[10px] font-black text-white/54">{{ metric.label }}</div>
            <div class="text-2xl font-black leading-none">{{ statistics[side][metric.key] }}</div>
          </div>
        </div>
      </div>
    </section>

    <section class="order-2 flex flex-col items-center justify-center border-x border-white/15 bg-black/72">
      <Radio class="mb-1 h-7 w-7 text-broadcast-accent" />
      <div class="text-[11px] font-black uppercase tracking-[0.24em] text-white/60">Stats</div>
      <div class="mt-1 flex items-end gap-3">
        <span class="text-4xl font-black">{{ efficiency('local') }}%</span>
        <span class="pb-1 text-sm font-black text-white/40">EFF</span>
        <span class="text-4xl font-black">{{ efficiency('visitor') }}%</span>
      </div>
      <div class="mt-2 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs font-black uppercase text-white/70">
        <Activity class="h-3.5 w-3.5 text-broadcast-alert" />
        Racha {{ Math.max(statistics.local.currentRun, statistics.visitor.currentRun) }}
      </div>
    </section>
  </div>
</template>
