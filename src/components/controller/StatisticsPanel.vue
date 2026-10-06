<script setup lang="ts">
import { computed } from 'vue'
import { Activity, BarChart3, RotateCcw, TrendingUp } from 'lucide-vue-next'
import PlayerLeaders from '@/components/controller/PlayerLeaders.vue'
import PlayerStatsTable from '@/components/controller/PlayerStatsTable.vue'
import type { GameState, StatisticsState, TeamSide } from '@/types/game.types'

const props = defineProps<{
  gameState: GameState
  statistics: StatisticsState
  attackEfficiency: (team: TeamSide) => number
  blockEfficiency: (team: TeamSide) => number
  serveEfficiency: (team: TeamSide) => number
  receptionRating: (team: TeamSide) => number
  sideoutRating: (team: TeamSide) => number
}>()

const emit = defineEmits<{
  reset: []
}>()

// Sets a mostrar en el filtro: los jugados más el que está en curso.
const setCount = computed(() => Math.max(1, props.gameState.completedSets.length + (props.gameState.gameFinished ? 0 : 1)))

const rows = [
  { label: 'Puntos registrados', key: 'points' },
  { label: 'Ataques punto', key: 'attackPoints' },
  { label: 'Bloqueos', key: 'blockPoints' },
  { label: 'Bloqueos tocados', key: 'blockTouches' },
  { label: 'Aces', key: 'aces' },
  { label: 'Puntos por error', key: 'opponentErrors' },
  { label: 'Errores ataque', key: 'attackErrors' },
  { label: 'Errores saque', key: 'serveErrors' },
  { label: 'Errores recepción', key: 'receptionErrors' },
  { label: 'Recepciones +', key: 'positiveReceptions' },
  { label: 'Recepciones -', key: 'negativeReceptions' },
  { label: 'Defensas', key: 'digs' },
] as const

const eventLabel = (type: string) =>
  ({
    manual: 'Punto manual',
    attack: 'Ataque',
    block: 'Bloqueo',
    ace: 'Ace',
    opponent_error: 'Punto por error',
    sanction: 'Punto por sanción',
    attack_error: 'Error ataque',
    serve_error: 'Error saque',
    reception_error: 'Error recepción',
    positive_reception: 'Recepción +',
    negative_reception: 'Recepción -',
    dig: 'Defensa',
    block_touch: 'Bloqueo tocado',
  })[type] ?? type
</script>

<template>
  <section class="admin-card mt-4 p-6">
    <div class="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-broadcast-outline pb-4">
      <div class="flex items-center gap-2">
        <BarChart3 class="h-5 w-5 text-broadcast-accent" />
        <div>
          <h3 class="text-xl font-semibold text-broadcast-text">Estadísticas del partido</h3>
          <p class="text-sm text-broadcast-muted">Captura rápida por equipo, sincronizada con OBS.</p>
        </div>
      </div>
      <button class="admin-button" @click="emit('reset')">
        <RotateCcw class="h-4 w-4" />
        Reiniciar estadísticas
      </button>
    </div>

    <div class="grid gap-4 xl:grid-cols-[1fr_260px_1fr]">
      <div
        v-for="side in (['local', 'visitor'] as TeamSide[])"
        :key="side"
        class="rounded border border-broadcast-outline bg-broadcast-surface-high p-4"
      >
        <div class="mb-4 flex items-center justify-between">
          <div>
            <div class="text-2xl font-black text-broadcast-text">{{ gameState[side].shortCode }}</div>
            <div class="text-xs font-bold uppercase text-broadcast-muted">{{ gameState[side].name }}</div>
          </div>
          <div class="grid grid-cols-2 gap-1.5">
            <div class="rounded border border-broadcast-outline bg-broadcast-surface px-2 py-1.5 text-center" title="Ataques punto sobre ataques punto + errores de ataque">
              <div class="text-[9px] font-black uppercase text-broadcast-muted">Ataque</div>
              <div class="text-lg font-black text-broadcast-accent">{{ attackEfficiency(side) }}%</div>
            </div>
            <div class="rounded border border-broadcast-outline bg-broadcast-surface px-2 py-1.5 text-center" title="Total de bloqueos punto">
              <div class="text-[9px] font-black uppercase text-broadcast-muted">Bloqueo</div>
              <div class="text-lg font-black text-broadcast-accent">{{ blockEfficiency(side) }}</div>
            </div>
            <div class="rounded border border-broadcast-outline bg-broadcast-surface px-2 py-1.5 text-center" title="Aces sobre aces + errores de saque">
              <div class="text-[9px] font-black uppercase text-broadcast-muted">Saque</div>
              <div class="text-lg font-black text-broadcast-accent">{{ serveEfficiency(side) }}%</div>
            </div>
            <div class="rounded border border-broadcast-outline bg-broadcast-surface px-2 py-1.5 text-center" title="Recepciones positivas sobre positivas + negativas">
              <div class="text-[9px] font-black uppercase text-broadcast-muted">Recepción</div>
              <div class="text-lg font-black text-broadcast-accent">{{ receptionRating(side) }}%</div>
            </div>
            <div class="rounded border border-broadcast-outline bg-broadcast-surface px-2 py-1.5 text-center" title="% de veces que el equipo recupera el saque cuando está recibiendo">
              <div class="text-[9px] font-black uppercase text-broadcast-muted">Sideout</div>
              <div class="text-lg font-black text-broadcast-accent">{{ sideoutRating(side) }}%</div>
            </div>
          </div>
        </div>

        <div v-if="(gameState[side].sanctions?.length ?? 0) > 0" class="mb-2 text-xs font-semibold text-broadcast-muted">
          Sanciones: {{ gameState[side].sanctions?.filter((s) => s.cardType === 'yellow').length ?? 0 }} amarillas ·
          {{ gameState[side].sanctions?.filter((s) => s.cardType === 'red').length ?? 0 }} rojas
        </div>

        <div class="grid gap-2">
          <div
            v-for="row in rows"
            :key="row.key"
            class="flex items-center justify-between rounded bg-broadcast-surface-lowest px-3 py-2"
          >
            <span class="text-sm font-semibold text-broadcast-muted">{{ row.label }}</span>
            <span class="text-lg font-black text-broadcast-text">{{ statistics[side][row.key] }}</span>
          </div>
        </div>
      </div>

      <div class="flex flex-col justify-center gap-3 rounded border border-broadcast-outline bg-broadcast-surface-lowest p-4">
        <div class="rounded bg-broadcast-surface-high p-4 text-center">
          <Activity class="mx-auto mb-2 h-5 w-5 text-broadcast-accent" />
          <div class="text-xs font-black uppercase text-broadcast-muted">Racha actual</div>
          <div class="text-3xl font-black text-broadcast-text">
            {{ Math.max(statistics.local.currentRun, statistics.visitor.currentRun) }}
          </div>
        </div>
        <div class="rounded bg-broadcast-surface-high p-4 text-center">
          <TrendingUp class="mx-auto mb-2 h-5 w-5 text-broadcast-alert" />
          <div class="text-xs font-black uppercase text-broadcast-muted">Mayor racha</div>
          <div class="text-3xl font-black text-broadcast-text">
            {{ Math.max(statistics.local.biggestRun, statistics.visitor.biggestRun) }}
          </div>
        </div>
        <div class="text-center text-xs font-semibold text-broadcast-muted">
          Los botones de ataque, bloqueo, ace y punto por error suman marcador y registran la causa.
        </div>
      </div>
    </div>

    <div class="mt-4 grid gap-4 lg:grid-cols-2">
      <PlayerLeaders
        v-for="side in (['local', 'visitor'] as TeamSide[])"
        :key="`leaders-${side}`"
        :team="gameState[side]"
        :side="side"
        :events="statistics.events"
      />
    </div>

    <div class="mt-4 grid gap-4">
      <PlayerStatsTable
        v-for="side in (['local', 'visitor'] as TeamSide[])"
        :key="`table-${side}`"
        :team="gameState[side]"
        :side="side"
        :events="statistics.events"
        :set-count="setCount"
      />
    </div>

    <div class="mt-4 grid gap-2">
      <div class="text-sm font-bold text-broadcast-text">Últimos registros</div>
      <div
        v-for="event in statistics.events.slice(0, 6)"
        :key="event.id"
        class="flex items-center justify-between rounded border border-broadcast-outline bg-broadcast-surface-high px-3 py-2"
      >
        <span class="text-sm text-broadcast-text">
          {{ gameState[event.team].shortCode }}{{ event.playerNumber ? ` #${event.playerNumber}` : '' }} ·
          {{ eventLabel(event.type) }}
        </span>
        <span class="text-xs text-broadcast-muted">
          Set {{ event.set }} · {{ event.score.local }}-{{ event.score.visitor }}
        </span>
      </div>
    </div>
  </section>
</template>
