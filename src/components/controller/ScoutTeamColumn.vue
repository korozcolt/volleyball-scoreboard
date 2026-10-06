<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { ArrowRightLeft, ChevronDown, Timer, TriangleAlert, Volleyball } from 'lucide-vue-next'
import type {
  MatchStatus,
  ScoringReason,
  StatErrorType,
  StatSkillType,
  Team,
  TeamSide,
} from '@/types/game.types'

const props = defineProps<{
  team: Team
  side: TeamSide
  gameFinished?: boolean
  status?: MatchStatus
  substitutionCount?: number
}>()

const emit = defineEmits<{
  scoreReason: [team: TeamSide, reason: ScoringReason, playerNumber?: string | number]
  statError: [team: TeamSide, errorType: StatErrorType, playerNumber?: string | number]
  statSkill: [team: TeamSide, skill: StatSkillType, playerNumber?: string | number]
  pendingPoint: [team: TeamSide]
  rotationFault: [team: TeamSide]
  timeout: [team: TeamSide]
  substitute: [team: TeamSide, playerOut: string | number, playerIn: string | number]
}>()

/**
 * Cancha vista desde el banquillo (red arriba). rotation[0] = zona 1 (sacador), rotation[1] = zona 2, ...
 *   [4] [3] [2]   ← línea delantera
 *   [5] [6] [1]   ← línea trasera (1 = saque)
 */
const ZONE_CELLS = [
  { zone: 4, rotIdx: 3 },
  { zone: 3, rotIdx: 2 },
  { zone: 2, rotIdx: 1 },
  { zone: 5, rotIdx: 4 },
  { zone: 6, rotIdx: 5 },
  { zone: 1, rotIdx: 0 },
] as const

const selected = ref<string | null>(null)
const showSecondary = ref(false)
const subMode = ref(false)
const subOut = ref<string | null>(null)

const rosterByNumber = computed(() => {
  const map = new Map<string, NonNullable<Team['roster']>[number]>()
  for (const player of props.team.roster ?? []) map.set(String(player.number), player)
  return map
})

const courtCells = computed(() =>
  ZONE_CELLS.map((cell) => {
    const number = props.team.rotation[cell.rotIdx]
    const player = number === undefined ? undefined : rosterByNumber.value.get(String(number))
    return {
      zone: cell.zone,
      number: number === undefined ? null : String(number),
      firstName: player?.name?.split(' ')[0] ?? '',
      isLibero: player?.isLibero ?? false,
    }
  }),
)

const benchPlayers = computed(
  () =>
    props.team.roster?.filter(
      (player) => player.active && !props.team.rotation.some((n) => String(n) === String(player.number)),
    ) ?? [],
)

const server = computed(() => {
  const number = props.team.rotation[0]
  if (number === undefined) return null
  const player = rosterByNumber.value.get(String(number))
  return { number: String(number), name: player?.name ?? '' }
})

const selectedIsLibero = computed(() =>
  selected.value ? (rosterByNumber.value.get(selected.value)?.isLibero ?? false) : false,
)

// Quien saca es conocido, así que Ace y Error de saque no exigen seleccionar a la sacadora.
const actingPlayer = (needsServer: boolean) =>
  selected.value ?? (needsServer && props.team.serving ? (server.value?.number ?? null) : null)

const liberoBlocked = computed(() => selectedIsLibero.value)

const pointActions: Array<{ label: string; reason: ScoringReason }> = [
  { label: 'Ataque', reason: 'attack' },
  { label: 'Bloqueo', reason: 'block' },
  { label: 'Ace', reason: 'ace' },
]

const errorActions: Array<{ label: string; error: StatErrorType }> = [
  { label: 'Err. ataque', error: 'attack_error' },
  { label: 'Err. saque', error: 'serve_error' },
  { label: 'Err. recep.', error: 'reception_error' },
]

const secondaryActions: Array<{ label: string; skill: StatSkillType }> = [
  { label: 'Recep +', skill: 'positive_reception' },
  { label: 'Recep −', skill: 'negative_reception' },
  { label: 'Defensa', skill: 'dig' },
  { label: 'Bloq. tocado', skill: 'block_touch' },
]

const canPoint = (reason: ScoringReason) => {
  if (props.gameFinished) return false
  if (liberoBlocked.value) return false
  if (reason === 'ace') return props.team.serving && actingPlayer(true) !== null
  return selected.value !== null
}

const canError = (error: StatErrorType) => {
  if (props.gameFinished) return false
  if (error === 'serve_error') return props.team.serving && actingPlayer(true) !== null
  if (error === 'reception_error') return !props.team.serving && selected.value !== null
  return selected.value !== null
}

const canSkill = (skill: StatSkillType) => {
  if (props.gameFinished || selected.value === null) return false
  if (skill === 'positive_reception' || skill === 'negative_reception') return !props.team.serving
  return true
}

const clearSelection = () => {
  selected.value = null
}

const doPoint = (reason: ScoringReason) => {
  emit('scoreReason', props.side, reason, actingPlayer(reason === 'ace') ?? undefined)
  clearSelection()
}

const doError = (error: StatErrorType) => {
  emit('statError', props.side, error, actingPlayer(error === 'serve_error') ?? undefined)
  clearSelection()
}

const doSkill = (skill: StatSkillType) => {
  emit('statSkill', props.side, skill, selected.value ?? undefined)
  clearSelection()
}

const onCourtTap = (number: string | null) => {
  if (number === null) return
  if (subMode.value) {
    subOut.value = number
    return
  }
  selected.value = selected.value === number ? null : number
}

const confirmSub = (playerIn: string) => {
  if (!subOut.value) return
  emit('substitute', props.side, subOut.value, playerIn)
  subMode.value = false
  subOut.value = null
  clearSelection()
}

const toggleSubMode = () => {
  subMode.value = !subMode.value
  subOut.value = null
  clearSelection()
}

// Si la jugadora seleccionada sale de la cancha (sustitución, rotación o deshacer), se limpia la selección.
watch(
  () => props.team.rotation.join(','),
  () => {
    if (selected.value && !props.team.rotation.some((n) => String(n) === selected.value)) clearSelection()
  },
)

const now = ref(Date.now())
const timeoutRemaining = computed(() => {
  const until = props.team.timeoutActiveUntil
  return until && until > now.value ? Math.ceil((until - now.value) / 1000) : 0
})
let timer: number | undefined
watch(
  () => props.team.timeoutActiveUntil,
  (until) => {
    window.clearInterval(timer)
    timer = undefined
    if (until && until > Date.now()) {
      now.value = Date.now()
      timer = window.setInterval(() => {
        now.value = Date.now()
        if (now.value >= until) {
          window.clearInterval(timer)
          timer = undefined
        }
      }, 250)
    }
  },
  { immediate: true },
)

onUnmounted(() => window.clearInterval(timer))

const timeoutLimit = 2
const canTimeout = computed(
  () =>
    !props.gameFinished &&
    props.status !== 'idle' &&
    props.team.timeoutsUsed < timeoutLimit &&
    timeoutRemaining.value === 0,
)
</script>

<template>
  <section
    class="flex min-h-0 flex-col gap-[clamp(0.375rem,1.2vh,0.75rem)] overflow-y-auto rounded-xl border-2 bg-broadcast-surface p-3"
    :style="{ borderColor: team.serving ? team.primaryColor : 'var(--broadcast-outline)' }"
  >
    <header class="flex items-center justify-between gap-2">
      <div class="flex min-w-0 items-center gap-2">
        <span class="h-6 w-1.5 shrink-0 rounded" :style="{ backgroundColor: team.primaryColor }" />
        <h2 class="truncate text-lg font-black uppercase text-broadcast-text">{{ team.name }}</h2>
        <span
          v-if="team.serving"
          class="inline-flex shrink-0 items-center gap-1 rounded bg-broadcast-accent px-2 py-0.5 text-xs font-black uppercase text-[#00354a]"
        >
          <Volleyball class="h-3.5 w-3.5" /> Saque
        </span>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <button
          type="button"
          class="inline-flex h-11 items-center gap-1 rounded border border-broadcast-outline bg-broadcast-surface-high px-3 text-xs font-black uppercase text-broadcast-text transition hover:border-broadcast-accent disabled:opacity-40"
          :disabled="!canTimeout"
          @click="emit('timeout', side)"
        >
          <Timer class="h-4 w-4" />
          <span v-if="timeoutRemaining">{{ timeoutRemaining }}s</span>
          <span v-else>Tiempo {{ team.timeoutsUsed }}/{{ timeoutLimit }}</span>
        </button>
      </div>
    </header>

    <!-- Sacador esperado: un vistazo basta; un toque si sacó otra jugadora -->
    <div
      v-if="team.serving && server"
      class="flex items-center justify-between gap-3 rounded-lg border border-broadcast-accent/60 bg-broadcast-accent/10 px-3 py-2"
    >
      <div class="min-w-0">
        <div class="text-[10px] font-black uppercase tracking-widest text-broadcast-muted">Debe sacar</div>
        <div class="truncate text-xl font-black text-broadcast-text">
          #{{ server.number }} <span class="text-sm font-semibold text-broadcast-muted">{{ server.name }}</span>
        </div>
      </div>
      <button
        type="button"
        class="inline-flex h-11 shrink-0 items-center gap-1 rounded border border-broadcast-danger/60 bg-broadcast-danger/10 px-3 text-xs font-black uppercase text-broadcast-danger transition hover:bg-broadcast-danger hover:text-white disabled:opacity-40"
        :disabled="gameFinished"
        title="Sacó otra jugadora: falta de rotación (punto para el rival)"
        @click="emit('rotationFault', side)"
      >
        <TriangleAlert class="h-4 w-4" />
        Sacó otra
      </button>
    </div>

    <!-- Cancha -->
    <div>
      <div class="mb-1 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-broadcast-muted">
        <span>{{ subMode ? (subOut ? 'Elige quién entra' : 'Toca quién sale') : 'Toca a la jugadora' }}</span>
        <span v-if="selected && !subMode" class="text-broadcast-accent">#{{ selected }} seleccionada</span>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="cell in courtCells"
          :key="cell.zone"
          type="button"
          class="relative flex h-[clamp(3.5rem,9vh,6rem)] flex-col items-center justify-center rounded-lg border-2 text-broadcast-text transition active:scale-95"
          :class="[
            subMode && subOut === cell.number
              ? 'border-[#ffcf4a] bg-[#ffcf4a]/20'
              : selected === cell.number
                ? 'border-broadcast-accent bg-broadcast-accent text-[#00354a]'
                : 'border-broadcast-outline bg-broadcast-surface-high hover:border-broadcast-accent',
          ]"
          @click="onCourtTap(cell.number)"
        >
          <span class="absolute left-1.5 top-1 text-[10px] font-black opacity-60">{{ cell.zone }}</span>
          <Volleyball v-if="cell.zone === 1 && team.serving" class="absolute right-1.5 top-1 h-4 w-4" />
          <span
            v-if="cell.isLibero"
            class="absolute right-1.5 bottom-1 rounded bg-[#ffcf4a] px-1 text-[10px] font-black text-[#40350a]"
            >L</span
          >
          <span class="text-3xl font-black leading-none">{{ cell.number ?? '–' }}</span>
          <span class="mt-1 max-w-full truncate px-1 text-[11px] font-semibold opacity-80">{{ cell.firstName }}</span>
        </button>
      </div>

      <!-- Banca: aparece solo en modo cambio -->
      <div v-if="subMode && subOut" class="mt-2 flex flex-wrap gap-2">
        <button
          v-for="player in benchPlayers"
          :key="player.id"
          type="button"
          class="h-11 rounded border border-broadcast-outline bg-broadcast-surface-high px-3 text-sm font-black text-broadcast-text transition hover:border-broadcast-accent"
          @click="confirmSub(String(player.number))"
        >
          #{{ player.number }}
          <span class="text-xs font-semibold text-broadcast-muted">{{ player.name.split(' ')[0] }}</span>
          <span v-if="player.isLibero" class="ml-1 text-[#ffcf4a]">L</span>
        </button>
        <span v-if="benchPlayers.length === 0" class="text-xs text-broadcast-muted">Sin jugadoras en banca.</span>
      </div>
    </div>

    <!-- Punto para este equipo -->
    <div>
      <div class="mb-1 text-[10px] font-black uppercase tracking-widest text-broadcast-muted">
        Punto para {{ team.shortCode }}
      </div>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="action in pointActions"
          :key="action.reason"
          type="button"
          class="h-[clamp(2.75rem,7vh,4rem)] rounded-lg border border-broadcast-accent/60 bg-broadcast-accent/10 text-base font-black uppercase text-broadcast-accent transition hover:bg-broadcast-accent hover:text-[#00354a] active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
          :disabled="!canPoint(action.reason)"
          @click="doPoint(action.reason)"
        >
          {{ action.label }}
        </button>
      </div>
    </div>

    <!-- Error de este equipo = punto del rival -->
    <div>
      <div class="mb-1 text-[10px] font-black uppercase tracking-widest text-broadcast-muted">
        Error de {{ team.shortCode }} (punto rival)
      </div>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="action in errorActions"
          :key="action.error"
          type="button"
          class="h-[clamp(2.5rem,6vh,3.5rem)] rounded-lg border border-broadcast-danger/50 bg-broadcast-danger/10 text-sm font-black uppercase text-broadcast-danger transition hover:bg-broadcast-danger hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
          :disabled="!canError(action.error)"
          @click="doError(action.error)"
        >
          {{ action.label }}
        </button>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <button
        type="button"
        class="h-12 rounded-lg border border-broadcast-outline bg-broadcast-surface-high text-xs font-black uppercase text-broadcast-text transition hover:border-broadcast-accent active:scale-95 disabled:opacity-40"
        :disabled="gameFinished"
        title="Error del rival sin jugadora propia (red, doble, invasión...)"
        @click="doPoint('opponent_error')"
      >
        Rival erró
      </button>
      <button
        type="button"
        class="h-12 rounded-lg border border-broadcast-outline bg-broadcast-surface-lowest text-xs font-black uppercase text-broadcast-muted transition hover:text-broadcast-text active:scale-95 disabled:opacity-40"
        :disabled="gameFinished"
        title="Suma el punto ya y lo clasificas después"
        @click="emit('pendingPoint', side)"
      >
        +1 sin clasificar
      </button>
    </div>

    <div class="flex items-center gap-2">
      <button
        type="button"
        class="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border text-xs font-black uppercase transition active:scale-95"
        :class="
          subMode
            ? 'border-[#ffcf4a] bg-[#ffcf4a]/20 text-[#ffcf4a]'
            : 'border-broadcast-outline bg-broadcast-surface-high text-broadcast-text hover:border-broadcast-accent'
        "
        :disabled="gameFinished"
        @click="toggleSubMode"
      >
        <ArrowRightLeft class="h-4 w-4" />
        {{ subMode ? 'Cancelar cambio' : `Cambio ${substitutionCount ?? 0}/6` }}
      </button>
      <button
        v-if="!team.serving"
        type="button"
        class="inline-flex h-11 items-center gap-1 rounded-lg border border-broadcast-danger/50 bg-broadcast-danger/10 px-3 text-xs font-black uppercase text-broadcast-danger transition hover:bg-broadcast-danger hover:text-white disabled:opacity-40"
        :disabled="gameFinished"
        title="Posición incorrecta al recibir: falta de rotación (punto para el rival)"
        @click="emit('rotationFault', side)"
      >
        <TriangleAlert class="h-4 w-4" />
        Falta rot.
      </button>
    </div>

    <!-- Nivel 2: opcional, nunca bloquea -->
    <div>
      <button
        type="button"
        class="flex w-full items-center justify-between text-[10px] font-black uppercase tracking-widest text-broadcast-muted transition hover:text-broadcast-text"
        @click="showSecondary = !showSecondary"
      >
        Recepción y defensa (opcional)
        <ChevronDown class="h-4 w-4 transition" :class="{ 'rotate-180': showSecondary }" />
      </button>
      <div v-if="showSecondary" class="mt-2 grid grid-cols-2 gap-2">
        <button
          v-for="action in secondaryActions"
          :key="action.skill"
          type="button"
          class="h-11 rounded-lg border border-broadcast-outline bg-broadcast-surface-high text-xs font-black uppercase text-broadcast-text transition hover:border-broadcast-accent active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
          :disabled="!canSkill(action.skill)"
          @click="doSkill(action.skill)"
        >
          {{ action.label }}
        </button>
      </div>
    </div>
  </section>
</template>
