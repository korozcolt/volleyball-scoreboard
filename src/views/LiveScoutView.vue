<script setup lang="ts">
defineOptions({ name: 'LiveScoutView' })
import { computed } from 'vue'
import { ArrowLeft, ChevronsRight, Keyboard, Undo2, Volleyball } from 'lucide-vue-next'
import ScoutTeamColumn from '@/components/controller/ScoutTeamColumn.vue'
import type { TeamSide } from '@/types/game.types'
import { useMatchActions, useMatchShortcuts } from '@/composables/useMatchActions'
import { useMatchScope } from '@/composables/useMatchScope'
import { useMatchStore } from '@/stores/match'
import { useStatisticsStore } from '@/stores/statistics'

const match = useMatchStore()
const statistics = useStatisticsStore()
const scope = useMatchScope()
const { scorePoint, scorePointWithReason, recordError, recordSkill, requestTimeout, substitute, toggleServe, nextSet } =
  useMatchActions()

useMatchShortcuts()

const sides: TeamSide[] = ['local', 'visitor']

const teamsWithoutRoster = computed(() =>
  sides
    .filter((side) => (match.gameState[side].roster ?? []).every((player) => /^Jugador \d+$/.test(player.name)))
    .map((side) => match.gameState[side].name),
)

const stateLabel = computed(() => {
  if (match.matchPointTeam) return `Match point ${match.gameState[match.matchPointTeam].shortCode}`
  if (match.setPointTeam) return `Set point ${match.gameState[match.setPointTeam].shortCode}`
  return `Set ${match.gameState.currentSet} · a ${match.targetPoints}`
})

const alertLabel = computed(() => Boolean(match.matchPointTeam || match.setPointTeam))

const recentEvents = computed(() => match.gameState.history.slice(0, 3))
const sessionError = scope.sessionError
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden bg-broadcast-background text-broadcast-text">
    <!-- Barra superior: marcador, saque, set y deshacer -->
    <header class="grid shrink-0 grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-broadcast-outline px-3 py-2">
      <div class="flex items-center gap-2">
        <RouterLink
          :to="`/controller/${scope.matchId.value}`"
          class="inline-flex h-11 items-center gap-1 rounded border border-broadcast-outline bg-broadcast-surface-high px-3 text-xs font-bold text-broadcast-muted transition hover:text-broadcast-text"
          title="Volver al panel completo"
        >
          <ArrowLeft class="h-4 w-4" />
          Panel
        </RouterLink>
        <button
          type="button"
          class="inline-flex h-11 items-center gap-1 rounded border border-broadcast-outline bg-broadcast-surface-high px-3 text-xs font-black uppercase text-broadcast-text transition hover:border-broadcast-accent disabled:opacity-40"
          :disabled="!statistics.canUndo"
          :title="statistics.canUndo ? `Deshacer: ${statistics.lastUndoLabel} (Ctrl/Cmd+Z)` : 'Nada que deshacer'"
          @click="statistics.undoLast()"
        >
          <Undo2 class="h-4 w-4" />
          Deshacer
          <span v-if="statistics.canUndo" class="hidden max-w-[10rem] truncate text-[10px] font-semibold normal-case text-broadcast-muted xl:inline">
            · {{ statistics.lastUndoLabel }}
          </span>
        </button>
      </div>

      <div class="flex items-center justify-center gap-4">
        <div
          v-for="side in sides"
          :key="side"
          class="flex items-center gap-3"
          :class="side === 'visitor' ? 'flex-row-reverse' : ''"
        >
          <span class="text-sm font-black uppercase tracking-wider text-broadcast-muted">
            {{ match.gameState[side].shortCode }}
          </span>
          <span class="text-5xl font-black tabular-nums leading-none" :style="{ color: match.gameState[side].primaryColor }">
            {{ match.gameState[side].score }}
          </span>
          <span class="rounded bg-broadcast-surface-high px-2 py-0.5 text-xs font-black text-broadcast-muted">
            {{ match.gameState[side].sets }}
          </span>
          <Volleyball v-if="match.gameState[side].serving" class="h-5 w-5 text-broadcast-accent" />
          <span v-else class="h-5 w-5" />
          <span v-if="side === 'local'" class="mx-1 text-2xl font-black text-broadcast-muted">–</span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <span
          class="hidden rounded border px-3 py-1 text-xs font-black uppercase tracking-wider md:inline"
          :class="
            alertLabel
              ? 'border-broadcast-alert bg-broadcast-alert/10 text-broadcast-alert'
              : 'border-broadcast-outline bg-broadcast-surface-high text-broadcast-muted'
          "
        >
          {{ stateLabel }}
        </span>
        <button
          type="button"
          class="inline-flex h-11 items-center gap-1 rounded border border-broadcast-outline bg-broadcast-surface-high px-3 text-xs font-black uppercase text-broadcast-text transition hover:border-broadcast-accent"
          title="Cambiar el saque manualmente (Espacio)"
          @click="toggleServe"
        >
          <Volleyball class="h-4 w-4" />
          Saque
        </button>
        <button
          type="button"
          class="inline-flex h-11 items-center gap-1 rounded border border-broadcast-accent bg-broadcast-accent/10 px-3 text-xs font-black uppercase text-broadcast-accent transition hover:bg-broadcast-accent hover:text-[#00354a] disabled:opacity-30"
          :disabled="!match.canAdvanceSet"
          @click="nextSet"
        >
          Siguiente set
          <ChevronsRight class="h-4 w-4" />
        </button>
      </div>
    </header>

    <div
      v-if="sessionError"
      class="shrink-0 border-b border-broadcast-danger bg-broadcast-danger/10 px-3 py-2 text-sm text-broadcast-danger"
      role="alert"
    >
      No se pudo cargar el partido ({{ sessionError }}). No se guardará nada hasta que cargue correctamente.
    </div>
    <div
      v-else-if="teamsWithoutRoster.length"
      class="shrink-0 border-b border-broadcast-alert bg-broadcast-alert/10 px-3 py-2 text-sm text-broadcast-alert"
      role="alert"
    >
      <strong>Falta cargar el roster de {{ teamsWithoutRoster.join(' y ') }}.</strong>
      Las estadísticas por jugadora no serán útiles.
      <RouterLink :to="`/settings/${scope.matchId.value}`" class="underline">Cargar roster</RouterLink>
    </div>

    <!-- Dos equipos lado a lado, sin scroll de página -->
    <main class="grid min-h-0 flex-1 grid-cols-2 gap-3 p-3">
      <ScoutTeamColumn
        v-for="side in sides"
        :key="side"
        :team="match.gameState[side]"
        :side="side"
        :game-finished="match.gameState.gameFinished"
        :status="match.gameState.status"
        :substitution-count="match.substitutionCount(side)"
        @score-reason="scorePointWithReason"
        @stat-error="recordError"
        @stat-skill="recordSkill"
        @pending-point="scorePoint"
        @rotation-fault="statistics.recordRotationFault"
        @timeout="requestTimeout"
        @substitute="substitute"
      />
    </main>

    <!-- Últimos eventos -->
    <footer class="flex shrink-0 items-center gap-4 border-t border-broadcast-outline px-3 py-1.5 text-xs text-broadcast-muted">
      <span class="inline-flex shrink-0 items-center gap-1 font-bold uppercase">
        <Keyboard class="h-3.5 w-3.5" /> Q/W +1 · A/S −1 · Espacio saque · Ctrl/Cmd+Z deshacer
      </span>
      <span class="truncate">
        <span v-for="item in recentEvents" :key="item.id" class="mr-4">{{ item.message }}</span>
      </span>
    </footer>
  </div>
</template>
