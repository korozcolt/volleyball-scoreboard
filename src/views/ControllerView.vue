<script setup lang="ts">
defineOptions({ name: 'ControllerView' })
import { computed, onMounted, onUnmounted } from 'vue'
import { BarChart2, ClipboardList, ExternalLink, History, LayoutGrid, Radio, RotateCcw, Shuffle, Users, Volleyball } from 'lucide-vue-next'
import BroadcastLayout from '@/components/layout/BroadcastLayout.vue'
import OverlayScoreboard from '@/components/broadcast/OverlayScoreboard.vue'
import SetHistoryPanel from '@/components/controller/SetHistoryPanel.vue'
import StatisticsPanel from '@/components/controller/StatisticsPanel.vue'
import TeamControlPanel from '@/components/controller/TeamControlPanel.vue'
import MatchRosterPanel from '@/components/controller/MatchRosterPanel.vue'
import type { ScoringReason, StatErrorType, StatSkillType, OverlayMode, TeamSide } from '@/types/game.types'
import { useMatchScope } from '@/composables/useMatchScope'
import { useMatchStore } from '@/stores/match'
import { useOverlayControlStore } from '@/stores/overlayControl'
import { useStatisticsStore } from '@/stores/statistics'
import { KEYBOARD_SHORTCUTS } from '@/utils/constants'

const match = useMatchStore()
const overlay = useOverlayControlStore()
const statistics = useStatisticsStore()
const scope = useMatchScope()

const activeMode = computed<OverlayMode>(() => overlay.state.activeOverlay)

const setOverlayMode = (mode: OverlayMode) => {
  overlay.setActiveOverlay(mode)
}

const resetSet = () => {
  if (window.confirm('¿Reiniciar solo el set actual?')) match.resetSet()
}

const resetGame = () => {
  if (window.confirm('¿Reiniciar el partido? La configuración de equipos se conserva.')) {
    match.resetGame()
    statistics.resetMatchStats()
  }
}

const setManualScore = (team: TeamSide, score: number) => match.setManualScore(team, score)
const setManualSets = (team: TeamSide, sets: number) => match.setManualSets(team, sets)
const scorePoint = (team: TeamSide) => statistics.scorePointWithReason(team, 'manual')
const scorePointWithReason = (team: TeamSide, reason: ScoringReason, playerNumber?: string | number) =>
  statistics.scorePointWithReason(team, reason, playerNumber)
const recordError = (team: TeamSide, errorType: StatErrorType, playerNumber?: string | number) =>
  statistics.recordErrorAndPoint(team, errorType, playerNumber)
const recordSkill = (team: TeamSide, skill: StatSkillType, playerNumber?: string | number) =>
  statistics.recordSkill(team, skill, playerNumber)
const resetStatistics = () => {
  if (
    window.confirm(
      '¿Reiniciar solo las estadísticas del partido?\n\nEsto NO afecta el marcador ni el historial de sets ya completados — esos números seguirán mostrando lo que realmente pasó en cancha.',
    )
  ) {
    statistics.resetMatchStats()
  }
}

const teamSides: Array<{ side: TeamSide; label: string }> = [
  { side: 'local', label: 'Local' },
  { side: 'visitor', label: 'Visitante' },
]

const handleKeydown = (event: KeyboardEvent) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return

  if (event.ctrlKey && event.code === KEYBOARD_SHORTCUTS.RESET_GAME) {
    event.preventDefault()
    resetGame()
    return
  }

  const handlers: Partial<Record<string, () => void>> = {
    [KEYBOARD_SHORTCUTS.SCORE_LOCAL]: () => scorePoint('local'),
    [KEYBOARD_SHORTCUTS.SCORE_VISITOR]: () => scorePoint('visitor'),
    [KEYBOARD_SHORTCUTS.REMOVE_LOCAL]: () => statistics.removePointWithRevert('local'),
    [KEYBOARD_SHORTCUTS.REMOVE_VISITOR]: () => statistics.removePointWithRevert('visitor'),
    [KEYBOARD_SHORTCUTS.TOGGLE_SERVE]: () => match.toggleServe(),
    [KEYBOARD_SHORTCUTS.NEXT_SET]: () => match.nextSet(),
    [KEYBOARD_SHORTCUTS.SHOW_HISTORY]: () =>
      overlay.setActiveOverlay(overlay.state.activeOverlay === 'history' ? 'scoreboard' : 'history'),
  }

  const handler = handlers[event.code]
  if (handler) {
    event.preventDefault()
    handler()
  }
}

onMounted(() => document.addEventListener('keydown', handleKeydown))
onUnmounted(() => document.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <BroadcastLayout>
    <section class="mb-8">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-semibold text-broadcast-text">Panel de partido</h1>
          <p class="text-sm text-broadcast-muted">
            {{ match.gameState.metadata.tournament }} · {{ match.gameState.metadata.phase }}
            <span v-if="scope.matchId"> · {{ scope.matchId }}</span>
          </p>
        </div>
        <div class="flex items-center gap-2">
          <span
            class="rounded border px-3 py-1 text-xs font-black uppercase tracking-wider"
            :class="
              match.matchPointTeam
                ? 'border-broadcast-alert bg-broadcast-alert/10 text-broadcast-alert'
                : match.isSetPoint
                ? 'border-broadcast-alert bg-broadcast-alert/10 text-broadcast-alert'
                : 'border-broadcast-outline bg-broadcast-surface-high text-broadcast-muted'
            "
          >
            {{
              match.matchPointTeam
                ? `Match point ${match.gameState[match.matchPointTeam].shortCode}`
                : match.setPointTeam
                  ? `Set point ${match.gameState[match.setPointTeam].shortCode}`
                  : `Set ${match.gameState.currentSet} · meta ${match.targetPoints}`
            }}
          </span>
          <button class="admin-button" @click="resetSet">
            <RotateCcw class="h-4 w-4" />
            Reset set
          </button>
          <button class="admin-button-danger" @click="resetGame">
            <RotateCcw class="h-4 w-4" />
            Partido
          </button>
        </div>
      </div>

      <div class="obs-preview flex items-end justify-center pb-[5%]">
        <OverlayScoreboard :game-state="match.gameState" :mode="activeMode" compact />
      </div>

      <div class="mt-3 flex justify-end">
        <div class="inline-flex rounded border border-broadcast-outline bg-broadcast-surface-high p-1">
          <button
            class="rounded px-3 py-1 text-xs font-bold transition"
            :class="
              activeMode === 'scoreboard'
                ? 'bg-broadcast-accent text-[#00354a]'
                : 'text-broadcast-muted hover:text-broadcast-text'
            "
            @click="setOverlayMode('scoreboard')"
          >
            Marcador en vivo
          </button>
          <button
            class="rounded px-3 py-1 text-xs font-bold transition"
            :class="
              activeMode === 'history'
                ? 'bg-broadcast-accent text-[#00354a]'
                : 'text-broadcast-muted hover:text-broadcast-text'
            "
            @click="setOverlayMode('history')"
          >
            Historial
          </button>
          <button
            class="rounded px-3 py-1 text-xs font-bold transition"
            :class="
              activeMode === 'stats'
                ? 'bg-broadcast-accent text-[#00354a]'
                : 'text-broadcast-muted hover:text-broadcast-text'
            "
            @click="setOverlayMode('stats')"
          >
            Estadísticas
          </button>
        </div>
      </div>
    </section>

    <!-- ─── Accesos directos a overlays OBS ────────────────────────── -->
    <section class="admin-card mb-4 p-4">
      <div class="mb-3 flex items-center gap-2">
        <ExternalLink class="h-4 w-4 text-broadcast-accent" />
        <h3 class="text-sm font-semibold text-broadcast-text">Accesos directos — Overlays OBS</h3>
      </div>
      <div class="flex flex-wrap gap-2">
        <a
          :href="`/overlay/${scope.matchId.value}`"
          target="_blank"
          rel="noopener"
          class="admin-button"
        >
          <Radio class="h-4 w-4" />
          Overlay Principal
          <ExternalLink class="h-3 w-3 opacity-60" />
        </a>
        <a
          :href="`/lineup/${scope.matchId.value}`"
          target="_blank"
          rel="noopener"
          class="admin-button"
        >
          <Users class="h-4 w-4" />
          Lineup & Cancha
          <ExternalLink class="h-3 w-3 opacity-60" />
        </a>
        <a
          :href="`/settings/${scope.matchId.value}`"
          target="_blank"
          rel="noopener"
          class="admin-button"
        >
          <Settings class="h-4 w-4" />
          Configuración
          <ExternalLink class="h-3 w-3 opacity-60" />
        </a>
        <a
          :href="`/statistics/${scope.matchId.value}`"
          target="_blank"
          rel="noopener"
          class="admin-button"
        >
          <BarChart2 class="h-4 w-4" />
          Estadísticas
          <ExternalLink class="h-3 w-3 opacity-60" />
        </a>
      </div>
    </section>

    <!-- ─── Lineup overlay control ─────────────────────────────────────── -->
    <section class="admin-card mb-4 p-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <Users class="h-5 w-5 text-broadcast-accent" />
          <div>
            <div class="text-sm font-semibold text-broadcast-text">Overlay de Lineup</div>
            <div class="text-xs text-broadcast-muted">
              Muestra roster y posicionamiento en cancha · /lineup/{{ scope.matchId.value }}
            </div>
          </div>
        </div>
        <button
          class="lineup-toggle-btn"
          :class="overlay.state.lineupVisible ? 'lineup-toggle-btn--active' : ''"
          @click="overlay.toggleLineup()"
        >
          <span
            class="lineup-toggle-dot"
            :class="overlay.state.lineupVisible ? 'lineup-toggle-dot--active' : ''"
          />
          {{ overlay.state.lineupVisible ? 'Visible en OBS' : 'Oculto' }}
        </button>
      </div>
    </section>

    <!-- ─── Overlays de Roster y Formación (por equipo) ────────────── -->
    <section class="admin-card mb-4 p-4">
      <div class="mb-3 flex items-center gap-2">
        <ClipboardList class="h-4 w-4 text-broadcast-accent" />
        <h3 class="text-sm font-semibold text-broadcast-text">Overlays de Roster y Formación</h3>
      </div>
      <div class="grid gap-3 md:grid-cols-2">
        <div
          v-for="t in teamSides"
          :key="t.side"
          class="rounded border border-broadcast-outline bg-broadcast-surface-high p-3"
        >
          <div class="mb-3 text-xs font-black uppercase tracking-wider text-broadcast-muted">
            {{ t.label }} · {{ match.gameState[t.side].shortCode }}
          </div>

          <div class="mb-2 flex flex-wrap items-center gap-2">
            <a
              :href="`/roster/${scope.matchId.value}/${t.side}`"
              target="_blank"
              rel="noopener"
              class="admin-button"
            >
              <ClipboardList class="h-4 w-4" />
              Roster
              <ExternalLink class="h-3 w-3 opacity-60" />
            </a>
            <button
              class="lineup-toggle-btn"
              :class="overlay.state.rosterVisible[t.side] ? 'lineup-toggle-btn--active' : ''"
              @click="overlay.toggleRoster(t.side)"
            >
              <span
                class="lineup-toggle-dot"
                :class="overlay.state.rosterVisible[t.side] ? 'lineup-toggle-dot--active' : ''"
              />
              {{ overlay.state.rosterVisible[t.side] ? 'Visible' : 'Oculto' }}
            </button>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <a
              :href="`/formation/${scope.matchId.value}/${t.side}`"
              target="_blank"
              rel="noopener"
              class="admin-button"
            >
              <LayoutGrid class="h-4 w-4" />
              Formación
              <ExternalLink class="h-3 w-3 opacity-60" />
            </a>
            <button
              class="lineup-toggle-btn"
              :class="overlay.state.formationVisible[t.side] ? 'lineup-toggle-btn--active' : ''"
              @click="overlay.toggleFormation(t.side)"
            >
              <span
                class="lineup-toggle-dot"
                :class="overlay.state.formationVisible[t.side] ? 'lineup-toggle-dot--active' : ''"
              />
              {{ overlay.state.formationVisible[t.side] ? 'Visible' : 'Oculto' }}
            </button>
            <div class="inline-flex rounded border border-broadcast-outline bg-broadcast-surface-lowest p-0.5">
              <button
                class="rounded px-2 py-1 text-[11px] font-bold transition"
                :class="
                  overlay.state.formationMode[t.side] === 'starting'
                    ? 'bg-broadcast-accent text-[#00354a]'
                    : 'text-broadcast-muted hover:text-broadcast-text'
                "
                @click="overlay.setFormationMode(t.side, 'starting')"
              >
                Titular
              </button>
              <button
                class="rounded px-2 py-1 text-[11px] font-bold transition"
                :class="
                  overlay.state.formationMode[t.side] === 'current'
                    ? 'bg-broadcast-accent text-[#00354a]'
                    : 'text-broadcast-muted hover:text-broadcast-text'
                "
                @click="overlay.setFormationMode(t.side, 'current')"
              >
                Actual
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── Asignación de posiciones en cancha ────────────────────── -->
    <MatchRosterPanel />

    <section class="admin-card mb-4 p-4 md:p-5 xl:p-6">
      <div class="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-broadcast-outline pb-4">
        <div>
          <h2 class="text-xl font-semibold text-broadcast-text">Control de marcador</h2>
          <p class="text-sm text-broadcast-muted">Atajos: Q/W suman, A/S restan, espacio cambia saque.</p>
        </div>
        <button class="admin-button" :disabled="!match.canAdvanceSet" @click="match.nextSet">
          Siguiente set
        </button>
      </div>

      <div class="grid gap-4 md:grid-cols-[minmax(260px,1fr)_72px_minmax(260px,1fr)] xl:grid-cols-[1fr_80px_1fr]">
        <TeamControlPanel
          :team="match.gameState.local"
          side="local"
          :match-started="match.gameState.status !== 'idle'"
          :game-finished="match.gameState.gameFinished"
          :status="match.gameState.status"
          :substitution-count="match.substitutionCount('local')"
          @score="scorePoint"
          @remove="statistics.removePointWithRevert"
          @manual-score="setManualScore"
          @manual-sets="setManualSets"
          @timeout="match.startTimeout"
          @score-reason="scorePointWithReason"
          @stat-error="recordError"
          @stat-skill="recordSkill"
          @rotate="match.rotateTeam"
          @rotation-fault="match.rotationFault"
          @substitute="match.substitutePlayer"
        />

        <div class="flex flex-row items-center justify-center gap-4 border-y border-broadcast-outline py-4 md:flex-col md:border-x md:border-y-0 md:py-0">
          <span class="text-xs font-black uppercase tracking-widest text-broadcast-muted md:[writing-mode:vertical-rl]">
            Saque
          </span>
          <button
            class="flex h-16 w-16 items-center justify-center rounded-full border border-broadcast-outline bg-broadcast-surface-high text-broadcast-accent shadow-inner transition hover:bg-broadcast-accent hover:text-[#00354a]"
            @click="match.toggleServe"
          >
            <Volleyball class="h-7 w-7" />
          </button>
          <button
            class="flex h-11 w-11 items-center justify-center rounded-full border border-broadcast-outline bg-broadcast-surface-lowest text-broadcast-muted transition hover:bg-broadcast-surface-high"
            title="Intercambiar saque"
            @click="match.toggleServe"
          >
            <Shuffle class="h-5 w-5" />
          </button>
        </div>

        <TeamControlPanel
          :team="match.gameState.visitor"
          side="visitor"
          :match-started="match.gameState.status !== 'idle'"
          :game-finished="match.gameState.gameFinished"
          :status="match.gameState.status"
          :substitution-count="match.substitutionCount('visitor')"
          @score="scorePoint"
          @remove="statistics.removePointWithRevert"
          @manual-score="setManualScore"
          @manual-sets="setManualSets"
          @timeout="match.startTimeout"
          @score-reason="scorePointWithReason"
          @stat-error="recordError"
          @stat-skill="recordSkill"
          @rotate="match.rotateTeam"
          @rotation-fault="match.rotationFault"
          @substitute="match.substitutePlayer"
        />
      </div>
    </section>

    <StatisticsPanel
      :game-state="match.gameState"
      :statistics="statistics.state"
      :attack-efficiency="statistics.attackEfficiency"
      :block-efficiency="statistics.blockEfficiency"
      :serve-efficiency="statistics.serveEfficiency"
      :reception-rating="statistics.receptionRating"
      :player-stats-for="statistics.playerStatsFor"
      @reset="resetStatistics"
    />

    <SetHistoryPanel :game-state="match.gameState" />

    <section class="admin-card mt-4 p-6">
      <div class="mb-4 flex items-center gap-2">
        <History class="h-5 w-5 text-broadcast-accent" />
        <h3 class="text-xl font-semibold text-broadcast-text">Eventos recientes</h3>
      </div>
      <div class="grid gap-2">
        <div
          v-for="item in match.gameState.history.slice(0, 8)"
          :key="item.id"
          class="flex items-center justify-between rounded border border-broadcast-outline bg-broadcast-surface-high px-3 py-2"
        >
          <span class="text-sm text-broadcast-text">{{ item.message }}</span>
          <span class="text-xs text-broadcast-muted">
            {{ new Date(item.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) }}
          </span>
        </div>
      </div>
    </section>
  </BroadcastLayout>
</template>
