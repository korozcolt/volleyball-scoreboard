<script setup lang="ts">
import { computed } from 'vue'
import { Star } from 'lucide-vue-next'
import type { GameState, StatisticsState, TeamSide } from '@/types/game.types'
import { buildLeaders, buildPlayerLines } from '@/utils/playerStats'

const props = defineProps<{
  gameState: GameState
  statistics: StatisticsState
}>()

const sides: TeamSide[] = ['local', 'visitor']

// Líder de puntos de cada equipo en todo el partido, con su desglose.
const cards = computed(() =>
  sides.map((side) => {
    const lines = buildPlayerLines(props.statistics.events, side, props.gameState[side].roster ?? [])
    const leader = buildLeaders(lines).points
    const line = leader ? lines.find((item) => item.playerNumber === leader.playerNumber) : undefined
    return { side, leader, line }
  }),
)

const shortName = (name: string) => name.split(' ').slice(0, 2).join(' ')
</script>

<template>
  <div class="stats-overlay relative mx-auto grid h-[144px] w-full max-w-[1220px] grid-cols-[1fr_220px_1fr] overflow-hidden text-white">
    <section
      v-for="card in cards"
      :key="card.side"
      class="stats-team-panel relative flex min-w-0 items-center gap-4 px-8"
      :class="card.side === 'visitor' ? 'order-3 flex-row-reverse text-right' : 'order-1'"
      :style="{ '--team-color': gameState[card.side].primaryColor }"
    >
      <div class="stats-team-identity">
        <img
          v-if="gameState[card.side].logoUrl"
          :src="gameState[card.side].logoUrl"
          :alt="gameState[card.side].name"
          class="stats-team-logo"
        />
        <div v-else class="stats-team-code">{{ gameState[card.side].shortCode.slice(0, 3) }}</div>
      </div>

      <div class="min-w-0 flex-1">
        <div class="truncate text-xs font-black uppercase tracking-[0.22em] text-white/60">
          {{ gameState[card.side].name }}
        </div>
        <template v-if="card.leader && card.line">
          <div class="mt-1 flex items-baseline gap-3" :class="card.side === 'visitor' ? 'flex-row-reverse' : ''">
            <span class="text-5xl font-black leading-none">{{ card.leader.value }}</span>
            <span class="text-sm font-black uppercase tracking-wider text-white/60">pts</span>
          </div>
          <div class="mt-1 truncate text-lg font-black leading-tight">
            #{{ card.leader.playerNumber }}
            <span v-if="card.leader.name" class="font-bold text-white/80">{{ shortName(card.leader.name) }}</span>
          </div>
          <div class="text-[11px] font-black uppercase tracking-wider text-white/55">
            ATQ {{ card.line.attackPoints }} · BLQ {{ card.line.blockPoints }} · ACE {{ card.line.aces }}
          </div>
        </template>
        <div v-else class="mt-3 text-sm font-bold uppercase tracking-wider text-white/45">Sin datos todavía</div>
      </div>
    </section>

    <section class="order-2 flex flex-col items-center justify-center border-x border-white/15 bg-black/72">
      <Star class="mb-1 h-7 w-7 text-broadcast-accent" />
      <div class="text-[11px] font-black uppercase tracking-[0.24em] text-white/60">Líderes</div>
      <div class="mt-1 text-center text-xs font-black uppercase tracking-wider text-white/70">del partido</div>
    </section>
  </div>
</template>
