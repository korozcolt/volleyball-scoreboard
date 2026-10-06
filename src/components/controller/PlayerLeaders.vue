<script setup lang="ts">
import { computed } from 'vue'
import type { StatisticEvent, Team, TeamSide } from '@/types/game.types'
import { buildLeaders, buildPlayerLines, type Leader } from '@/utils/playerStats'

const props = withDefaults(
  defineProps<{
    team: Team
    side: TeamSide
    events: StatisticEvent[]
    variant?: 'dark' | 'print'
  }>(),
  { variant: 'dark' },
)

const leaders = computed(() => buildLeaders(buildPlayerLines(props.events, props.side, props.team.roster ?? [])))

const items = computed<Array<{ label: string; unit: string; leader: Leader | null; bad?: boolean }>>(() => [
  { label: 'Puntos', unit: 'pts', leader: leaders.value.points },
  { label: 'Ataque', unit: 'atq', leader: leaders.value.attackPoints },
  { label: 'Bloqueo', unit: 'blq', leader: leaders.value.blockPoints },
  { label: 'Ace', unit: 'aces', leader: leaders.value.aces },
  { label: 'Defensa', unit: 'def', leader: leaders.value.digs },
  { label: 'Más errores', unit: 'err', leader: leaders.value.errors, bad: true },
])

const firstName = (name: string) => name.split(' ').slice(0, 2).join(' ')
const isPrint = computed(() => props.variant === 'print')
</script>

<template>
  <div
    class="rounded border p-4"
    :class="isPrint ? 'border-gray-300 bg-white' : 'border-broadcast-outline bg-broadcast-surface-high'"
  >
    <div class="mb-3 text-sm font-bold" :class="isPrint ? 'text-black' : 'text-broadcast-text'">
      Líderes — {{ team.shortCode }}
      <span class="font-normal" :class="isPrint ? 'text-gray-600' : 'text-broadcast-muted'">· {{ team.name }}</span>
    </div>
    <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <div
        v-for="item in items"
        :key="item.label"
        class="rounded border px-3 py-2"
        :class="isPrint ? 'border-gray-200' : 'border-broadcast-outline bg-broadcast-surface'"
      >
        <div class="text-[10px] font-black uppercase tracking-wider" :class="isPrint ? 'text-gray-500' : 'text-broadcast-muted'">
          {{ item.label }}
        </div>
        <div v-if="item.leader" class="mt-0.5">
          <div
            class="text-xl font-black leading-tight"
            :class="
              item.bad
                ? isPrint
                  ? 'text-red-700'
                  : 'text-broadcast-danger'
                : isPrint
                  ? 'text-black'
                  : 'text-broadcast-accent'
            "
          >
            {{ item.leader.value }}
            <span class="text-xs font-bold uppercase" :class="isPrint ? 'text-gray-500' : 'text-broadcast-muted'">{{ item.unit }}</span>
          </div>
          <div class="truncate text-xs font-semibold" :class="isPrint ? 'text-black' : 'text-broadcast-text'">
            #{{ item.leader.playerNumber }}
            <span v-if="item.leader.name" :class="isPrint ? 'text-gray-600' : 'text-broadcast-muted'">{{ firstName(item.leader.name) }}</span>
            <span v-if="item.leader.tiedWith > 0" :class="isPrint ? 'text-gray-500' : 'text-broadcast-muted'"> +{{ item.leader.tiedWith }}</span>
          </div>
        </div>
        <div v-else class="mt-0.5 text-sm" :class="isPrint ? 'text-gray-400' : 'text-broadcast-muted'">—</div>
      </div>
    </div>
  </div>
</template>
