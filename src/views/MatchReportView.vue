<script setup lang="ts">
defineOptions({ name: 'MatchReportView' })
import { computed, ref } from 'vue'
import { ArrowLeft, ClipboardCopy, Download, Printer } from 'lucide-vue-next'
import PlayerLeaders from '@/components/controller/PlayerLeaders.vue'
import PlayerStatsTable from '@/components/controller/PlayerStatsTable.vue'
import type { TeamSide } from '@/types/game.types'
import { useMatchScope } from '@/composables/useMatchScope'
import { useMatchStore } from '@/stores/match'
import { useStatisticsStore } from '@/stores/statistics'
import { buildLeaders, buildPlayerLines, buildPlayersCsv, buildShareSummary } from '@/utils/playerStats'

const match = useMatchStore()
const statistics = useStatisticsStore()
const scope = useMatchScope()

const sides: TeamSide[] = ['local', 'visitor']
const state = computed(() => match.gameState)
const events = computed(() => statistics.state.events)
const setCount = computed(() => Math.max(1, state.value.completedSets.length + (state.value.gameFinished ? 0 : 1)))
const notice = ref('')
let noticeTimer: number | undefined

const say = (text: string) => {
  notice.value = text
  window.clearTimeout(noticeTimer)
  noticeTimer = window.setTimeout(() => (notice.value = ''), 2800)
}

const dateLabel = computed(() =>
  new Date(state.value.startTime ?? Date.now()).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }),
)

const comparison = computed(() => {
  const rows: Array<{ label: string; local: string | number; visitor: string | number }> = [
    { label: 'Sets ganados', local: state.value.local.sets, visitor: state.value.visitor.sets },
    { label: 'Puntos totales', local: statistics.state.local.points, visitor: statistics.state.visitor.points },
    { label: 'Ataques punto', local: statistics.state.local.attackPoints, visitor: statistics.state.visitor.attackPoints },
    { label: 'Bloqueos', local: statistics.state.local.blockPoints, visitor: statistics.state.visitor.blockPoints },
    { label: 'Aces', local: statistics.state.local.aces, visitor: statistics.state.visitor.aces },
    { label: 'Puntos por error rival', local: statistics.state.local.opponentErrors, visitor: statistics.state.visitor.opponentErrors },
    { label: 'Errores de ataque', local: statistics.state.local.attackErrors, visitor: statistics.state.visitor.attackErrors },
    { label: 'Errores de saque', local: statistics.state.local.serveErrors, visitor: statistics.state.visitor.serveErrors },
    { label: 'Errores de recepción', local: statistics.state.local.receptionErrors, visitor: statistics.state.visitor.receptionErrors },
    { label: '% de ataque', local: `${statistics.attackEfficiency('local')}%`, visitor: `${statistics.attackEfficiency('visitor')}%` },
    { label: '% de sideout', local: `${statistics.sideoutRating('local')}%`, visitor: `${statistics.sideoutRating('visitor')}%` },
    { label: 'Mayor racha', local: statistics.state.local.biggestRun, visitor: statistics.state.visitor.biggestRun },
  ]
  return rows
})

const csvTeams = () =>
  sides.map((side) => ({
    shortCode: state.value[side].shortCode,
    name: state.value[side].name,
    lines: buildPlayerLines(events.value, side, state.value[side].roster ?? [], 'all', true),
  }))

const summaryText = () => {
  const team = (side: TeamSide) => ({
    shortCode: state.value[side].shortCode,
    name: state.value[side].name,
    sets: state.value[side].sets,
    leaders: buildLeaders(buildPlayerLines(events.value, side, state.value[side].roster ?? [])),
  })
  return buildShareSummary({
    tournament: state.value.metadata.tournament,
    phase: state.value.metadata.phase,
    local: team('local'),
    visitor: team('visitor'),
    completedSets: state.value.completedSets,
    finished: state.value.gameFinished,
  })
}

const copySummary = async () => {
  const text = summaryText()
  try {
    await navigator.clipboard.writeText(text)
    say('Resumen copiado. Pégalo en WhatsApp.')
  } catch {
    // Sin permiso de portapapeles (p. ej. http o iOS): se selecciona el texto en un cuadro para copiarlo a mano.
    window.prompt('Copia el resumen:', text)
  }
}

const printReport = () => window.print()

const downloadCsv = () => {
  const csv = buildPlayersCsv(csvTeams(), 'Todos')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const slug = `${state.value.local.shortCode}-vs-${state.value.visitor.shortCode}`.toLowerCase()
  link.href = url
  link.download = `estadisticas-${slug}.csv`
  link.click()
  URL.revokeObjectURL(url)
  say('CSV descargado.')
}
</script>

<template>
  <div class="min-h-screen bg-white px-4 py-6 text-black print:p-0">
    <div class="mx-auto max-w-5xl">
      <div class="mb-5 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <RouterLink
          :to="`/statistics/${scope.matchId.value}`"
          class="inline-flex min-h-11 items-center gap-2 rounded border border-gray-300 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft class="h-4 w-4" /> Estadísticas
        </RouterLink>
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="inline-flex min-h-11 items-center gap-2 rounded border border-gray-300 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            @click="copySummary"
          >
            <ClipboardCopy class="h-4 w-4" /> Copiar resumen
          </button>
          <button
            type="button"
            class="inline-flex min-h-11 items-center gap-2 rounded border border-gray-300 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            @click="downloadCsv"
          >
            <Download class="h-4 w-4" /> CSV
          </button>
          <button
            type="button"
            class="inline-flex min-h-11 items-center gap-2 rounded border border-black bg-black px-3 text-sm font-semibold text-white hover:bg-gray-800"
            @click="printReport"
          >
            <Printer class="h-4 w-4" /> Imprimir / PDF
          </button>
        </div>
      </div>
      <p v-if="notice" class="mb-3 text-sm font-semibold text-emerald-700 print:hidden" role="status">{{ notice }}</p>

      <header class="mb-5 border-b-2 border-black pb-3">
        <div class="text-xs font-bold uppercase tracking-widest text-gray-500">Reporte del partido</div>
        <h1 class="text-2xl font-black">{{ state.local.name }} vs {{ state.visitor.name }}</h1>
        <p class="text-sm text-gray-600">
          {{ state.metadata.tournament }} · {{ state.metadata.phase }} · {{ state.metadata.court }} · {{ dateLabel }}
        </p>
      </header>

      <section class="mb-5 grid gap-4 sm:grid-cols-[1fr_auto]">
        <div class="rounded border border-gray-300 p-4">
          <div class="flex items-center justify-around text-center">
            <div v-for="side in sides" :key="side">
              <div class="text-xs font-bold uppercase text-gray-500">{{ state[side].name }}</div>
              <div class="text-5xl font-black" :style="{ color: state[side].primaryColor }">{{ state[side].sets }}</div>
            </div>
          </div>
          <div class="mt-1 text-center text-xs font-bold uppercase text-gray-500">
            {{ state.gameFinished ? 'Resultado final (sets)' : 'Parcial (sets)' }}
          </div>
        </div>
        <table class="rounded border border-gray-300 text-sm">
          <thead>
            <tr class="text-xs uppercase text-gray-500">
              <th class="px-3 py-1.5 text-left">Set</th>
              <th class="px-3 py-1.5 text-right">{{ state.local.shortCode }}</th>
              <th class="px-3 py-1.5 text-right">{{ state.visitor.shortCode }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="set in state.completedSets" :key="set.setNumber" class="border-t border-gray-200">
              <td class="px-3 py-1.5 font-semibold">{{ set.setNumber }}</td>
              <td class="px-3 py-1.5 text-right" :class="set.winner === 'local' ? 'font-black' : ''">{{ set.local }}</td>
              <td class="px-3 py-1.5 text-right" :class="set.winner === 'visitor' ? 'font-black' : ''">{{ set.visitor }}</td>
            </tr>
            <tr v-if="!state.completedSets.length">
              <td class="px-3 py-2 text-gray-500" colspan="3">Sin sets completados.</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="mb-5 rounded border border-gray-300">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-xs uppercase text-gray-500">
              <th class="px-3 py-1.5 text-right">{{ state.local.shortCode }}</th>
              <th class="px-3 py-1.5 text-center">Equipo</th>
              <th class="px-3 py-1.5 text-left">{{ state.visitor.shortCode }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in comparison" :key="row.label" class="border-t border-gray-200">
              <td class="px-3 py-1.5 text-right font-black">{{ row.local }}</td>
              <td class="px-3 py-1.5 text-center text-gray-600">{{ row.label }}</td>
              <td class="px-3 py-1.5 text-left font-black">{{ row.visitor }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="mb-5 grid gap-4 sm:grid-cols-2 print:break-inside-avoid">
        <PlayerLeaders
          v-for="side in sides"
          :key="`l-${side}`"
          :team="state[side]"
          :side="side"
          :events="events"
          variant="print"
        />
      </section>

      <section class="grid gap-4">
        <PlayerStatsTable
          v-for="side in sides"
          :key="`t-${side}`"
          class="print:break-inside-avoid"
          :team="state[side]"
          :side="side"
          :events="events"
          :set-count="setCount"
          include-roster
          :filterable="false"
          variant="print"
        />
      </section>

      <p class="mt-6 text-center text-xs text-gray-400">Generado con VolleyStream · {{ dateLabel }}</p>
    </div>
  </div>
</template>
