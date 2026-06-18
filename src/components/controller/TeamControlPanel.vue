<script setup lang="ts">
import { ChevronDown, Minus, Plus, RotateCw, ShieldCheck, Target, Timer, Waves } from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { ScoringReason, StatErrorType, StatSkillType, Team, TeamSide } from '@/types/game.types'

const props = defineProps<{
  team: Team
  side: TeamSide
  matchStarted?: boolean
  gameFinished?: boolean
}>()

const emit = defineEmits<{
  score: [team: TeamSide]
  remove: [team: TeamSide]
  manualScore: [team: TeamSide, score: number]
  manualSets: [team: TeamSide, sets: number]
  timeout: [team: TeamSide]
  scoreReason: [team: TeamSide, reason: ScoringReason]
  statError: [team: TeamSide, errorType: StatErrorType]
  statSkill: [team: TeamSide, skill: StatSkillType]
  rotate: [team: TeamSide]
  rotationFault: [team: TeamSide]
}>()

const now = ref(Date.now())
const showAdvancedStats = ref(false)
let clock: number | undefined

onMounted(() => {
  clock = window.setInterval(() => {
    now.value = Date.now()
  }, 250)
})

onUnmounted(() => {
  if (clock) window.clearInterval(clock)
})

const timeoutRemaining = computed(() => {
  if (!props.team.timeoutActiveUntil || props.team.timeoutActiveUntil <= now.value) return 0
  return Math.ceil((props.team.timeoutActiveUntil - now.value) / 1000)
})

const timeoutLimit = 2
const canRequestTimeout = computed(
  () => props.matchStarted && !props.gameFinished && props.team.timeoutsUsed < timeoutLimit && timeoutRemaining.value === 0,
)

const scoringActions: Array<{ label: string; reason: ScoringReason }> = [
  { label: 'Ataque', reason: 'attack' },
  { label: 'Bloqueo', reason: 'block' },
  { label: 'Ace', reason: 'ace' },
  { label: 'Punto por error', reason: 'opponent_error' },
]

const skillActions: Array<{ label: string; skill: StatSkillType }> = [
  { label: 'Recep +', skill: 'positive_reception' },
  { label: 'Recep -', skill: 'negative_reception' },
  { label: 'Defensa', skill: 'dig' },
]

const canUseScoringAction = (reason: ScoringReason) => {
  if (props.gameFinished) return false
  if (reason === 'ace') return props.team.serving
  return true
}

const scoringActionTitle = (reason: ScoringReason) => {
  if (reason === 'ace' && !props.team.serving) return 'El ace solo puede registrarlo el equipo que saca.'
  return ''
}

const canUseErrorAction = (errorType: StatErrorType) => {
  if (props.gameFinished) return false
  if (errorType === 'serve_error') return props.team.serving
  return true
}

const errorActionTitle = (errorType: StatErrorType) => {
  if (errorType === 'serve_error' && !props.team.serving) {
    return 'El error de saque solo aplica al equipo que tiene el saque.'
  }
  return ''
}

const canUseSkillAction = (skill: StatSkillType) => {
  if (props.gameFinished) return false
  if (skill === 'positive_reception' || skill === 'negative_reception') return !props.team.serving
  return true
}

const skillActionTitle = (skill: StatSkillType) => {
  if ((skill === 'positive_reception' || skill === 'negative_reception') && props.team.serving) {
    return 'La recepción solo aplica al equipo que recibe el saque.'
  }
  return ''
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="text-center">
      <div class="text-2xl font-bold text-broadcast-text">{{ team.name }}</div>
      <div class="text-sm font-semibold text-broadcast-muted">{{ team.shortCode }}</div>
    </div>

    <div
      class="flex items-center justify-between rounded border border-broadcast-outline bg-broadcast-surface-high p-3"
    >
      <span class="text-xs font-bold uppercase text-broadcast-muted">Timeouts</span>
      <div class="flex items-center gap-2">
        <div class="rounded border border-broadcast-outline bg-broadcast-surface px-3 py-1 text-lg font-black text-broadcast-text">
          {{ team.timeoutsUsed }}/{{ timeoutLimit }}
        </div>
        <div
          class="min-w-[56px] rounded border px-2 py-1 text-center text-sm font-black"
          :class="
            timeoutRemaining
              ? 'border-broadcast-alert bg-broadcast-alert text-[#40000d]'
              : 'border-broadcast-outline bg-broadcast-surface text-broadcast-muted'
          "
        >
          {{ timeoutRemaining ? `${timeoutRemaining}s` : 'Listo' }}
        </div>
      </div>
      <button
        class="inline-flex items-center gap-1 rounded bg-broadcast-surface px-2 py-1 text-xs font-bold text-broadcast-accent transition hover:bg-broadcast-accent hover:text-[#00354a]"
        @click="emit('timeout', side)"
        :disabled="!canRequestTimeout"
      >
        <Timer class="h-3 w-3" />
        Pedir
      </button>
    </div>

    <div class="rounded border border-broadcast-outline bg-broadcast-surface-low p-3">
      <div class="mb-2 flex items-center justify-between gap-3">
        <div>
          <div class="text-xs font-black uppercase text-broadcast-muted">Rotación</div>
          <div class="text-sm font-bold text-broadcast-text">
            Sacador actual: #{{ team.currentPlayer }}
          </div>
        </div>
        <button
          class="inline-flex items-center gap-1 rounded bg-broadcast-surface px-2 py-1 text-xs font-bold text-broadcast-accent transition hover:bg-broadcast-accent hover:text-[#00354a]"
          type="button"
          :disabled="gameFinished"
          @click="emit('rotate', side)"
        >
          <RotateCw class="h-3.5 w-3.5" />
          Rotar
        </button>
      </div>
      <div class="grid grid-cols-6 gap-1">
        <div
          v-for="number in team.rotation"
          :key="number"
          class="rounded border border-broadcast-outline bg-broadcast-surface-high px-1 py-2 text-center text-xs font-black text-broadcast-text"
          :class="number === team.currentPlayer ? 'border-broadcast-accent text-broadcast-accent' : ''"
        >
          #{{ number }}
        </div>
      </div>
    </div>

    <button
      class="relative h-24 overflow-hidden rounded-xl border bg-broadcast-surface-high text-2xl font-black text-broadcast-text transition hover:bg-broadcast-surface-highest hover:text-broadcast-accent"
      :style="{ borderColor: `${team.primaryColor}88` }"
      @click="emit('score', side)"
      :disabled="gameFinished"
    >
      <span class="absolute left-0 right-0 top-0 h-1" :style="{ backgroundColor: team.primaryColor }"></span>
      +1 Punto
    </button>

    <div class="grid grid-cols-2 gap-2" aria-label="Causas principales del punto">
      <button
        v-for="action in scoringActions"
        :key="action.reason"
        class="inline-flex h-10 items-center justify-center gap-1 rounded border border-broadcast-outline bg-broadcast-surface-lowest px-2 text-xs font-black uppercase text-broadcast-text transition hover:border-broadcast-accent hover:text-broadcast-accent"
        @click="emit('scoreReason', side, action.reason)"
        :disabled="!canUseScoringAction(action.reason)"
        :title="scoringActionTitle(action.reason)"
      >
        <Target class="h-3.5 w-3.5" />
        {{ action.label }}
      </button>
    </div>

    <div class="flex gap-2">
      <button
        class="flex h-14 flex-1 items-center justify-center rounded border border-broadcast-outline bg-broadcast-surface-lowest text-broadcast-muted transition hover:text-broadcast-danger"
        @click="emit('remove', side)"
        :disabled="gameFinished || team.score <= 0"
      >
        <Minus class="h-5 w-5" />
        <span class="ml-2 text-lg font-bold">-1 Punto</span>
      </button>
      <input
        class="h-14 w-20 rounded border border-broadcast-outline bg-broadcast-surface-lowest text-center text-2xl font-black text-broadcast-text"
        type="number"
        min="0"
        max="99"
        :value="team.score"
        @change="emit('manualScore', side, Number(($event.target as HTMLInputElement).value))"
        :disabled="gameFinished"
      />
    </div>

    <button
      class="flex h-10 items-center justify-between rounded border border-broadcast-outline bg-broadcast-surface-high px-3 text-xs font-black uppercase text-broadcast-muted transition hover:text-broadcast-text"
      type="button"
      @click="showAdvancedStats = !showAdvancedStats"
    >
      Estadística avanzada
      <ChevronDown
        class="h-4 w-4 transition"
        :class="{ 'rotate-180': showAdvancedStats }"
      />
    </button>

    <div v-if="showAdvancedStats" class="grid gap-2 rounded border border-broadcast-outline bg-broadcast-surface-lowest p-3">
      <div class="grid grid-cols-3 gap-2">
        <button
          class="inline-flex h-10 items-center justify-center gap-1 rounded border border-broadcast-danger/40 bg-broadcast-danger/10 px-2 text-xs font-black uppercase text-broadcast-danger transition hover:bg-broadcast-danger hover:text-white"
          @click="emit('statError', side, 'attack_error')"
          :disabled="!canUseErrorAction('attack_error')"
          :title="errorActionTitle('attack_error')"
        >
          <ShieldCheck class="h-3.5 w-3.5" />
          Ataque
        </button>
        <button
          class="inline-flex h-10 items-center justify-center gap-1 rounded border border-broadcast-danger/40 bg-broadcast-danger/10 px-2 text-xs font-black uppercase text-broadcast-danger transition hover:bg-broadcast-danger hover:text-white"
          @click="emit('statError', side, 'serve_error')"
          :disabled="!canUseErrorAction('serve_error')"
          :title="errorActionTitle('serve_error')"
        >
          <ShieldCheck class="h-3.5 w-3.5" />
          Saque
        </button>
        <button
          class="inline-flex h-10 items-center justify-center gap-1 rounded border border-broadcast-danger/40 bg-broadcast-danger/10 px-2 text-xs font-black uppercase text-broadcast-danger transition hover:bg-broadcast-danger hover:text-white"
          @click="emit('rotationFault', side)"
          :disabled="gameFinished"
          title="Falta de rotación (punto para el rival)"
        >
          <RotateCw class="h-3.5 w-3.5" />
          Rotación
        </button>
      </div>

      <div class="grid grid-cols-3 gap-2">
      <button
        v-for="action in skillActions"
        :key="action.skill"
        class="inline-flex h-9 items-center justify-center gap-1 rounded border border-broadcast-outline bg-broadcast-surface-high px-2 text-[11px] font-black uppercase text-broadcast-muted transition hover:text-broadcast-text"
        @click="emit('statSkill', side, action.skill)"
        :disabled="!canUseSkillAction(action.skill)"
        :title="skillActionTitle(action.skill)"
      >
        <Waves class="h-3 w-3" />
        {{ action.label }}
      </button>
      </div>
    </div>

    <div class="flex items-center justify-between border-t border-broadcast-outline pt-4">
      <span class="text-sm font-bold text-broadcast-text">Sets: {{ team.sets }}</span>
      <div class="flex gap-2">
        <button
          class="flex h-8 w-8 items-center justify-center rounded bg-broadcast-surface-high text-broadcast-text"
          @click="emit('manualSets', side, team.sets - 1)"
          :disabled="gameFinished || team.sets <= 0"
        >
          <Minus class="h-4 w-4" />
        </button>
        <button
          class="flex h-8 w-8 items-center justify-center rounded bg-broadcast-surface-high text-broadcast-text"
          @click="emit('manualSets', side, team.sets + 1)"
          :disabled="gameFinished"
        >
          <Plus class="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
</template>
