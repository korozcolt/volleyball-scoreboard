<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Radio, Shield } from 'lucide-vue-next'
import OverlayStats from '@/components/overlay/OverlayStats.vue'
import type { GameState, OverlayMode, StatisticsState, TeamSide } from '@/types/game.types'
import { getSetTargetPoints, isMatchPoint, isSetPoint } from '@/utils/volleyballRules'
import { useStatisticsStore } from '@/stores/statistics'

const props = defineProps<{
  gameState: GameState
  mode?: OverlayMode
  compact?: boolean
  statistics?: StatisticsState
}>()

const statisticsStore = useStatisticsStore()
const mode = computed(() => props.mode ?? 'scoreboard')
const statisticsState = computed(() => props.statistics ?? statisticsStore.state)
const now = ref(Date.now())
let clock: number | undefined

onMounted(() => {
  clock = window.setInterval(() => {
    now.value = Date.now()
  }, 250)
})

onUnmounted(() => {
  if (clock) window.clearInterval(clock)
})

const servingTeam = computed<TeamSide>(() => (props.gameState.local.serving ? 'local' : 'visitor'))
const targetPoints = computed(() => getSetTargetPoints(props.gameState))
const setPointTeam = computed<TeamSide | null>(() => {
  if (isSetPoint(props.gameState, 'local')) return 'local'
  if (isSetPoint(props.gameState, 'visitor')) return 'visitor'
  return null
})
const matchPointTeam = computed<TeamSide | null>(() => {
  if (isMatchPoint(props.gameState, 'local')) return 'local'
  if (isMatchPoint(props.gameState, 'visitor')) return 'visitor'
  return null
})
const statusLabel = computed(() => {
  if (props.gameState.gameFinished) return 'Finalizado'
  if (matchPointTeam.value) return `Match point ${props.gameState[matchPointTeam.value].shortCode}`
  if (setPointTeam.value) return `Set point ${props.gameState[setPointTeam.value].shortCode}`
  return `Set ${props.gameState.currentSet} · ${targetPoints.value} pts`
})

const timeoutLabel = computed(() => {
  const active = (['local', 'visitor'] as const).find((team) => {
    const until = props.gameState[team].timeoutActiveUntil
    return until && until > now.value
  })

  if (!active) return ''

  const remaining = Math.max(
    0,
    Math.ceil(((props.gameState[active].timeoutActiveUntil ?? now.value) - now.value) / 1000),
  )

  return `Timeout ${props.gameState[active].shortCode} · ${remaining}s`
})

const teamInitial = (team: TeamSide) => props.gameState[team].shortCode.slice(0, 3)
</script>

<template>
  <div class="relative w-full">
    <div
      v-if="mode === 'history'"
      class="broadcast-history mx-auto grid min-h-[112px] max-w-[1120px] grid-cols-5 gap-3 rounded-xl border border-white/15 p-4 shadow-2xl"
    >
      <div
        v-for="setNumber in gameState.settings.maxSets"
        :key="setNumber"
        class="relative flex min-h-[78px] flex-col items-center justify-center overflow-hidden rounded-lg border text-center"
        :class="
          gameState.completedSets[setNumber - 1]
            ? 'border-white/30 bg-white/10'
            : setNumber === gameState.currentSet
              ? 'border-white/60 bg-white/15'
              : 'border-dashed border-white/15 bg-black/20 opacity-60'
        "
      >
        <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#082cff] to-[#ff3d1f]"></div>
        <div class="text-[10px] font-black uppercase tracking-[0.2em] text-white/65">Set {{ setNumber }}</div>
        <template v-if="gameState.completedSets[setNumber - 1]">
          <div class="text-2xl font-black leading-none text-white">
            {{ gameState.completedSets[setNumber - 1].local }} -
            {{ gameState.completedSets[setNumber - 1].visitor }}
          </div>
          <div class="mt-1 text-xs font-black text-[#7bd0ff]">
            {{ gameState[gameState.completedSets[setNumber - 1].winner].shortCode }}
          </div>
        </template>
        <template v-else-if="setNumber === gameState.currentSet">
          <div class="text-2xl font-black leading-none text-white">
            {{ gameState.local.score }} - {{ gameState.visitor.score }}
          </div>
          <div class="mt-1 text-xs font-black text-[#ffb2b7]">Actual</div>
        </template>
        <div v-else class="text-2xl font-black text-white/35">-</div>
      </div>
    </div>

    <OverlayStats
      v-else-if="mode === 'stats'"
      :game-state="gameState"
      :statistics="statisticsState"
      :efficiency="statisticsStore.teamEfficiency"
    />

    <div
      v-else
      class="vnl-scorebug relative mx-auto grid h-[126px] w-full max-w-[1180px] grid-cols-[1fr_330px_1fr] overflow-visible shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
      :class="compact ? 'scale-[0.88]' : ''"
    >
      <div class="scorebug-rim scorebug-rim-left"></div>
      <div class="scorebug-rim scorebug-rim-right"></div>

      <section
        class="team-wing team-wing-left relative flex min-w-0 items-center gap-5 overflow-hidden pl-8 pr-7"
        :class="{ 'team-serving team-serving-left': servingTeam === 'local' }"
        :style="{ '--team-color': gameState.local.primaryColor }"
      >
        <div class="energy-lines energy-lines-left"></div>
        <div class="flag-tile">
          <img
            v-if="gameState.local.logoUrl"
            :src="gameState.local.logoUrl"
            :alt="gameState.local.name"
            class="h-full w-full object-cover"
          />
          <Shield v-else class="h-8 w-8 text-white/80" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-4">
            <div class="team-code team-code-left">{{ teamInitial('local') }}</div>
          </div>
          <div class="team-name">{{ gameState.local.name }}</div>
        </div>
        <div class="team-stats-box" aria-label="Sets y timeouts local">
          <div class="stat-label">Sets</div>
          <div class="stat-number">{{ gameState.local.sets }}</div>
        </div>
      </section>

      <section class="score-core relative flex items-center justify-center">
        <div class="score-number score-number-left">{{ gameState.local.score }}</div>
        <div class="center-mark">
          <img
            v-if="gameState.leagueLogo"
            :src="gameState.leagueLogo"
            alt="Liga"
            class="h-16 max-w-[92px] object-contain drop-shadow-xl"
          />
          <Radio v-else class="h-10 w-10 text-white" />
          <span>VS</span>
        </div>
        <div class="score-number score-number-right">{{ gameState.visitor.score }}</div>
        <div class="status-ribbon">
          {{ timeoutLabel || statusLabel }}
        </div>
      </section>

      <section
        class="team-wing team-wing-right relative flex min-w-0 items-center gap-5 overflow-hidden pl-7 pr-8"
        :class="{ 'team-serving team-serving-right': servingTeam === 'visitor' }"
        :style="{ '--team-color': gameState.visitor.primaryColor }"
      >
        <div class="energy-lines energy-lines-right"></div>
        <div class="team-stats-box" aria-label="Sets y timeouts visitante">
          <div class="stat-label">Sets</div>
          <div class="stat-number">{{ gameState.visitor.sets }}</div>
        </div>
        <div class="min-w-0 flex-1 text-right">
          <div class="flex items-center justify-end gap-3">
            <div class="team-code team-code-right">{{ teamInitial('visitor') }}</div>
          </div>
          <div class="team-name">{{ gameState.visitor.name }}</div>
        </div>
        <div class="flag-tile">
          <img
            v-if="gameState.visitor.logoUrl"
            :src="gameState.visitor.logoUrl"
            :alt="gameState.visitor.name"
            class="h-full w-full object-cover"
          />
          <Shield v-else class="h-8 w-8 text-white/80" />
        </div>
      </section>
    </div>
  </div>
</template>
