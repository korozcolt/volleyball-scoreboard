<script setup lang="ts">
import { Minus, Plus, Timer } from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { Team, TeamSide } from '@/types/game.types'

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
}>()

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

const timeoutRemaining = computed(() => {
  if (!props.team.timeoutActiveUntil || props.team.timeoutActiveUntil <= now.value) return 0
  return Math.ceil((props.team.timeoutActiveUntil - now.value) / 1000)
})

const timeoutLimit = 2
const canRequestTimeout = computed(
  () => props.matchStarted && !props.gameFinished && props.team.timeoutsUsed < timeoutLimit && timeoutRemaining.value === 0,
)
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

    <button
      class="relative h-24 overflow-hidden rounded-xl border bg-broadcast-surface-high text-2xl font-black text-broadcast-text transition hover:bg-broadcast-surface-highest hover:text-broadcast-accent"
      :style="{ borderColor: `${team.primaryColor}88` }"
      @click="emit('score', side)"
      :disabled="gameFinished"
    >
      <span class="absolute left-0 right-0 top-0 h-1" :style="{ backgroundColor: team.primaryColor }"></span>
      +1 Punto
    </button>

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
