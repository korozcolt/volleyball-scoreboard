<script setup lang="ts">
import { Activity, BarChart3, RotateCcw, TrendingUp } from 'lucide-vue-next'
import type { StatisticsState, TeamSide } from '@/types/game.types'
import type { GameState } from '@/types/game.types'

defineProps<{
  gameState: GameState
  statistics: StatisticsState
  efficiency: (team: TeamSide) => number
}>()

const emit = defineEmits<{
  reset: []
}>()

const rows = [
  { label: 'Puntos registrados', key: 'points' },
  { label: 'Ataques punto', key: 'attackPoints' },
  { label: 'Bloqueos', key: 'blockPoints' },
  { label: 'Aces', key: 'aces' },
  { label: 'Puntos por error', key: 'opponentErrors' },
  { label: 'Errores ataque', key: 'attackErrors' },
  { label: 'Errores saque', key: 'serveErrors' },
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
    attack_error: 'Error ataque',
    serve_error: 'Error saque',
    positive_reception: 'Recepción +',
    negative_reception: 'Recepción -',
    dig: 'Defensa',
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
          <div class="rounded border border-broadcast-outline bg-broadcast-surface px-3 py-2 text-center">
            <div class="text-[10px] font-black uppercase text-broadcast-muted">Eficiencia</div>
            <div class="text-2xl font-black text-broadcast-accent">{{ efficiency(side) }}%</div>
          </div>
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

    <div class="mt-4 grid gap-2">
      <div class="text-sm font-bold text-broadcast-text">Últimos registros</div>
      <div
        v-for="event in statistics.events.slice(0, 6)"
        :key="event.id"
        class="flex items-center justify-between rounded border border-broadcast-outline bg-broadcast-surface-high px-3 py-2"
      >
        <span class="text-sm text-broadcast-text">
          {{ gameState[event.team].shortCode }} · {{ eventLabel(event.type) }}
        </span>
        <span class="text-xs text-broadcast-muted">
          Set {{ event.set }} · {{ event.score.local }}-{{ event.score.visitor }}
        </span>
      </div>
    </div>
  </section>
</template>
