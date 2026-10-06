<script setup lang="ts">
defineOptions({ name: 'LiveScoutView' })
import { computed, ref } from 'vue'
import { ArrowLeft, ChevronsRight, ClipboardCheck, Keyboard, Undo2, Volleyball } from 'lucide-vue-next'
import PendingPointsPanel from '@/components/controller/PendingPointsPanel.vue'
import ScoutTeamColumn from '@/components/controller/ScoutTeamColumn.vue'
import type { TeamSide } from '@/types/game.types'
import { useMatchActions, useMatchShortcuts } from '@/composables/useMatchActions'
import { useMatchScope } from '@/composables/useMatchScope'
import { useScoutKeyboard, type ScoutColumnApi } from '@/composables/useScoutKeyboard'
import { useMatchStore } from '@/stores/match'
import { useStatisticsStore } from '@/stores/statistics'

const match = useMatchStore()
const statistics = useStatisticsStore()
const scope = useMatchScope()
const { scorePoint, scorePointWithReason, recordError, recordSkill, requestTimeout, substitute, toggleServe, nextSet } =
  useMatchActions()

const sides: TeamSide[] = ['local', 'visitor']
const showPending = ref(false)

// Referencias a las columnas para que el teclado ejecute exactamente las mismas acciones que los botones.
const columns: Partial<Record<TeamSide, ScoutColumnApi>> = {}
const setColumn = (side: TeamSide, el: unknown) => {
  if (el) columns[side] = el as ScoutColumnApi
}
const keyboard = useScoutKeyboard((side) => columns[side])
const { hud, showHelp } = keyboard

useMatchShortcuts({
  // Con el panel de pendientes abierto el teclado no actúa sobre el partido.
  intercept: (event) => (showPending.value ? false : keyboard.handleKey(event)),
})

const helpRows: Array<[string, string]> = [
  ['L / V', 'Equipo: local / visitante'],
  ['12', 'Dorsal en cancha (1 o 2 dígitos)'],
  ['A', 'Ataque'],
  ['B', 'Bloqueo'],
  ['S', 'Ace (la sacadora esperada, sin dorsal)'],
  ['E + A / S / R', 'Error de ataque / saque / recepción'],
  ['X', 'El rival erró (sin jugadora)'],
  ['P', '+1 sin clasificar'],
  ['F', 'Falta de rotación'],
  ['O', 'Tiempo'],
  ['D · T · + · −', 'Defensa · bloqueo tocado · recep. + · recep. −'],
  ['Esc', 'Cancelar el código en curso'],
  ['Ctrl/Cmd + Z', 'Deshacer'],
]

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
  <div class="flex h-screen touch-manipulation select-none flex-col overflow-hidden overscroll-none bg-broadcast-background text-broadcast-text">
    <!-- Barra superior: marcador, saque, set y deshacer -->
    <header class="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-broadcast-outline px-3 py-2">
      <div class="flex items-center gap-2">
        <RouterLink
          :to="`/controller/${scope.matchId.value}`"
          class="inline-flex h-11 items-center gap-1 rounded border border-broadcast-outline bg-broadcast-surface-high px-3 text-xs font-bold text-broadcast-muted transition hover:text-broadcast-text"
          title="Volver al panel completo" aria-label="Volver al panel completo"
        >
          <ArrowLeft class="h-4 w-4" />
          <span class="hidden xl:inline">Panel</span>
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

      <div class="order-last flex w-full items-center justify-center gap-4 lg:order-none lg:w-auto lg:flex-1">
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

      <div class="flex flex-wrap items-center gap-2">
        <span
          class="hidden whitespace-nowrap rounded border px-3 py-1 text-xs font-black uppercase tracking-wider xl:inline"
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
          class="inline-flex h-11 items-center gap-1 rounded border px-3 text-xs font-black uppercase transition"
          :class="
            statistics.pendingPoints.length > 0
              ? 'border-broadcast-alert bg-broadcast-alert/10 text-broadcast-alert'
              : 'border-broadcast-outline bg-broadcast-surface-high text-broadcast-muted hover:text-broadcast-text'
          "
          title="Clasificar o corregir puntos"
          @click="showPending = true"
        >
          <ClipboardCheck class="h-4 w-4" />
          Pendientes
          <span v-if="statistics.pendingPoints.length > 0" class="rounded bg-broadcast-alert px-1.5 text-[11px] text-[#40000d]">
            {{ statistics.pendingPoints.length }}
          </span>
        </button>
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
        :ref="(el) => setColumn(side, el)"
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

    <PendingPointsPanel
      v-if="showPending"
      :teams="{ local: match.gameState.local, visitor: match.gameState.visitor }"
      :pending="statistics.pendingPoints"
      :classified="statistics.classifiedPoints"
      @classify="statistics.reclassifyPoint"
      @close="showPending = false"
    />

    <!-- Código de teclado en curso, mensajes y últimos eventos -->
    <footer class="flex shrink-0 items-center gap-4 border-t border-broadcast-outline px-3 py-1.5 text-xs text-broadcast-muted">
      <button
        type="button"
        class="inline-flex shrink-0 items-center gap-1 font-bold uppercase transition hover:text-broadcast-text"
        @click="showHelp = true"
      >
        <Keyboard class="h-3.5 w-3.5" /> Teclado: L/V + dorsal + letra · ? ayuda
      </button>
      <span
        v-if="hud.team"
        class="inline-flex shrink-0 items-center gap-2 rounded border border-broadcast-accent bg-broadcast-accent/10 px-2 py-0.5 font-black uppercase text-broadcast-accent"
      >
        {{ hud.team === 'local' ? 'Local' : 'Visitante' }}
        <span>{{ hud.digits ? `#${hud.digits}…` : hud.player ? `#${hud.player}` : '#—' }}</span>
        <span v-if="hud.awaitingError" class="text-broadcast-danger">error: A · S · R</span>
        <span v-else class="font-semibold normal-case text-broadcast-muted">A B S E X P F O D T + −</span>
      </span>
      <span
        v-if="hud.message"
        class="shrink-0 font-bold"
        :class="hud.messageKind === 'error' ? 'text-broadcast-danger' : 'text-broadcast-accent'"
        role="status"
      >
        {{ hud.message }}
      </span>
      <span class="truncate">
        <span v-for="item in recentEvents" :key="item.id" class="mr-4">{{ item.message }}</span>
      </span>
    </footer>

    <div
      v-if="showHelp"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-label="Código de teclado"
      @click.self="showHelp = false"
    >
      <div class="w-full max-w-lg rounded-xl border border-broadcast-outline bg-broadcast-background p-5 shadow-2xl">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-lg font-black uppercase text-broadcast-text">Código de teclado</h2>
          <button
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded border border-broadcast-outline text-broadcast-muted hover:text-broadcast-text"
            aria-label="Cerrar"
            @click="showHelp = false"
          >
            ✕
          </button>
        </div>
        <p class="mb-3 text-sm text-broadcast-muted">
          Escribe <strong class="text-broadcast-text">equipo + dorsal + acción</strong>. Ejemplo:
          <kbd class="rounded bg-broadcast-surface-high px-1.5 py-0.5 font-bold text-broadcast-text">L 12 A</kbd>
          = ataque de la #12 local;
          <kbd class="rounded bg-broadcast-surface-high px-1.5 py-0.5 font-bold text-broadcast-text">V 3 E S</kbd>
          = error de saque de la #3 visitante.
        </p>
        <dl class="grid grid-cols-[9rem_1fr] gap-x-3 gap-y-1.5 text-sm">
          <template v-for="[keys, text] in helpRows" :key="keys">
            <dt class="font-black text-broadcast-accent">{{ keys }}</dt>
            <dd class="text-broadcast-text">{{ text }}</dd>
          </template>
        </dl>
        <p class="mt-3 text-xs text-broadcast-muted">
          Sin código en curso siguen los atajos de siempre: Q/W suman · A/S restan · Espacio saque · N siguiente set.
        </p>
      </div>
    </div>
  </div>
</template>
