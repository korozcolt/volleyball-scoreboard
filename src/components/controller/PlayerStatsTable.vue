<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowDown, ArrowUp } from 'lucide-vue-next'
import type { StatisticEvent, Team, TeamSide } from '@/types/game.types'
import {
  buildPlayerLines,
  countUnattributed,
  sortLines,
  sumLines,
  type SetFilter,
  type SortKey,
} from '@/utils/playerStats'

const props = withDefaults(
  defineProps<{
    team: Team
    side: TeamSide
    events: StatisticEvent[]
    /** Cuántos sets mostrar en el filtro (sets jugados o en juego). */
    setCount: number
    /** Incluir a todo el plantel activo, aunque no tenga eventos. */
    includeRoster?: boolean
    /** `print`: colores claros para el reporte impreso. */
    variant?: 'dark' | 'print'
    /** Permite elegir set; en el reporte se fija en "Todos". */
    filterable?: boolean
  }>(),
  { includeRoster: false, variant: 'dark', filterable: true },
)

const setFilter = ref<SetFilter>('all')
const sortKey = ref<SortKey | null>(null)
const direction = ref<'asc' | 'desc'>('desc')
const showFullRoster = ref(props.includeRoster)

const roster = computed(() => props.team.roster ?? [])

const lines = computed(() =>
  buildPlayerLines(props.events, props.side, roster.value, setFilter.value, showFullRoster.value),
)
const sorted = computed(() => (sortKey.value ? sortLines(lines.value, sortKey.value, direction.value) : lines.value))
const totals = computed(() => sumLines(lines.value))
const unattributed = computed(() => countUnattributed(props.events, props.side, setFilter.value))

const sortBy = (key: SortKey) => {
  if (sortKey.value === key) {
    direction.value = direction.value === 'desc' ? 'asc' : 'desc'
  } else {
    sortKey.value = key
    direction.value = key === 'playerNumber' ? 'asc' : 'desc'
  }
}

const ariaSort = (key: SortKey) =>
  sortKey.value === key ? (direction.value === 'asc' ? 'ascending' : 'descending') : 'none'

const columns: Array<{ key: SortKey; label: string; title: string }> = [
  { key: 'points', label: 'PTS', title: 'Puntos: ataques + bloqueos + aces' },
  { key: 'attackPoints', label: 'ATQ', title: 'Ataques punto' },
  { key: 'blockPoints', label: 'BLQ', title: 'Bloqueos punto' },
  { key: 'aces', label: 'ACE', title: 'Aces' },
  { key: 'attackErrors', label: 'E.A', title: 'Errores de ataque' },
  { key: 'serveErrors', label: 'E.S', title: 'Errores de saque' },
  { key: 'receptionErrors', label: 'E.R', title: 'Errores de recepción' },
  { key: 'balance', label: 'BAL', title: 'Balance: puntos menos errores' },
  { key: 'attackPct', label: 'ATQ%', title: 'Ataques punto sobre ataques punto + errores de ataque' },
  { key: 'positiveReceptions', label: 'REC +/−', title: 'Recepciones positivas / negativas' },
  { key: 'receptionPct', label: 'REC%', title: 'Positivas sobre positivas + negativas + errores de recepción' },
  { key: 'digs', label: 'DEF', title: 'Defensas' },
]

const pct = (value: number | null) => (value === null ? '–' : `${value}%`)

const isPrint = computed(() => props.variant === 'print')
const ui = computed(() =>
  isPrint.value
    ? {
        box: 'border-gray-300 bg-white',
        title: 'text-black',
        muted: 'text-gray-600',
        head: 'text-gray-600',
        row: 'border-gray-200 text-black',
        strong: 'text-black',
        chip: 'border-gray-300 text-gray-700',
        chipOn: 'border-black bg-black text-white',
        warn: 'text-amber-700',
        good: 'text-emerald-700',
        bad: 'text-red-700',
      }
    : {
        box: 'border-broadcast-outline bg-broadcast-surface-high',
        title: 'text-broadcast-text',
        muted: 'text-broadcast-muted',
        head: 'text-broadcast-muted',
        row: 'border-broadcast-outline text-broadcast-text',
        strong: 'text-broadcast-text',
        chip: 'border-broadcast-outline text-broadcast-muted hover:text-broadcast-text',
        chipOn: 'border-broadcast-accent bg-broadcast-accent text-[#00354a]',
        warn: 'text-broadcast-alert',
        good: 'text-broadcast-accent',
        bad: 'text-broadcast-danger',
      },
)

const balanceClass = (value: number) => (value > 0 ? ui.value.good : value < 0 ? ui.value.bad : ui.value.muted)
</script>

<template>
  <div class="rounded border p-4" :class="ui.box">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div class="text-sm font-bold" :class="ui.title">
        Jugadoras — {{ team.shortCode }}
        <span class="font-normal" :class="ui.muted">· {{ team.name }}</span>
      </div>
      <div v-if="filterable" class="flex flex-wrap items-center gap-1" role="group" aria-label="Filtrar por set">
        <button
          type="button"
          class="min-h-9 rounded border px-2.5 text-xs font-black uppercase transition"
          :class="setFilter === 'all' ? ui.chipOn : ui.chip"
          @click="setFilter = 'all'"
        >
          Todos
        </button>
        <button
          v-for="set in setCount"
          :key="set"
          type="button"
          class="min-h-9 min-w-9 rounded border px-2.5 text-xs font-black uppercase transition"
          :class="setFilter === set ? ui.chipOn : ui.chip"
          :aria-label="`Set ${set}`"
          @click="setFilter = set"
        >
          S{{ set }}
        </button>
      </div>
    </div>

    <div v-if="!sorted.length" class="text-xs" :class="ui.muted">
      Sin jugadas atribuidas a una jugadora{{ setFilter === 'all' ? ' todavía' : ' en este set' }}.
    </div>

    <div v-else class="overflow-x-auto">
      <table class="w-full min-w-[700px] text-left text-xs">
        <thead>
          <tr :class="ui.head">
            <th class="pb-1 pr-2 font-bold" :aria-sort="ariaSort('playerNumber')">
              <button type="button" class="inline-flex items-center gap-0.5 font-bold" @click="sortBy('playerNumber')">
                #
                <component
                  :is="direction === 'asc' ? ArrowUp : ArrowDown"
                  v-if="sortKey === 'playerNumber'"
                  class="h-3 w-3"
                />
              </button>
            </th>
            <th class="pb-1 pr-2 font-bold">Jugadora</th>
            <th
              v-for="column in columns"
              :key="column.key"
              class="pb-1 text-right font-bold"
              :aria-sort="ariaSort(column.key)"
              :title="column.title"
            >
              <button type="button" class="inline-flex items-center gap-0.5 font-bold" @click="sortBy(column.key)">
                {{ column.label }}
                <component
                  :is="direction === 'asc' ? ArrowUp : ArrowDown"
                  v-if="sortKey === column.key"
                  class="h-3 w-3"
                />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="line in sorted" :key="line.playerNumber" class="border-t" :class="ui.row">
            <td class="py-1.5 pr-2 font-black">{{ line.playerNumber }}</td>
            <td class="max-w-[10rem] truncate py-1.5 pr-2">
              {{ line.name || '—' }}
              <span v-if="line.isLibero" class="ml-1 rounded bg-[#ffcf4a] px-1 text-[10px] font-black text-[#40350a]">L</span>
            </td>
            <td class="py-1.5 text-right font-black" :class="ui.strong">{{ line.points }}</td>
            <td class="py-1.5 text-right">{{ line.attackPoints }}</td>
            <td class="py-1.5 text-right">{{ line.blockPoints }}</td>
            <td class="py-1.5 text-right">{{ line.aces }}</td>
            <td class="py-1.5 text-right">{{ line.attackErrors }}</td>
            <td class="py-1.5 text-right">{{ line.serveErrors }}</td>
            <td class="py-1.5 text-right">{{ line.receptionErrors }}</td>
            <td class="py-1.5 text-right font-black" :class="balanceClass(line.balance)">
              {{ line.balance > 0 ? '+' : '' }}{{ line.balance }}
            </td>
            <td class="py-1.5 text-right">{{ pct(line.attackPct) }}</td>
            <td class="py-1.5 text-right">{{ line.positiveReceptions }}/{{ line.negativeReceptions }}</td>
            <td class="py-1.5 text-right">{{ pct(line.receptionPct) }}</td>
            <td class="py-1.5 text-right">{{ line.digs }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="border-t-2 font-black" :class="ui.row">
            <td class="py-1.5 pr-2" colspan="2">Total atribuido</td>
            <td class="py-1.5 text-right">{{ totals.points }}</td>
            <td class="py-1.5 text-right">{{ totals.attackPoints }}</td>
            <td class="py-1.5 text-right">{{ totals.blockPoints }}</td>
            <td class="py-1.5 text-right">{{ totals.aces }}</td>
            <td class="py-1.5 text-right" colspan="3">{{ totals.errors }} err.</td>
            <td class="py-1.5 text-right" colspan="4"></td>
            <td class="py-1.5 text-right">{{ totals.digs }}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div class="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
      <p v-if="unattributed.pending || unattributed.withoutPlayer" class="font-semibold" :class="ui.warn">
        Sin atribuir a una jugadora:
        <span v-if="unattributed.pending">{{ unattributed.pending }} sin clasificar</span>
        <span v-if="unattributed.pending && unattributed.withoutPlayer"> · </span>
        <span v-if="unattributed.withoutPlayer">{{ unattributed.withoutPlayer }} sin jugadora</span>
        — por eso el total puede ser menor que los puntos del equipo.
      </p>
      <span v-else />
      <label v-if="filterable" class="inline-flex min-h-9 cursor-pointer items-center gap-2 font-semibold" :class="ui.muted">
        <input v-model="showFullRoster" type="checkbox" class="h-4 w-4" />
        Mostrar plantel completo
      </label>
    </div>
  </div>
</template>
