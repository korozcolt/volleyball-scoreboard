<script setup lang="ts">
import { computed, ref } from 'vue'
import { X } from 'lucide-vue-next'
import type { PointClassification, StatErrorType, StatisticEvent, Team, TeamSide } from '@/types/game.types'

const props = defineProps<{
  teams: Record<TeamSide, Team>
  pending: StatisticEvent[]
  classified: StatisticEvent[]
}>()

const emit = defineEmits<{
  classify: [eventId: string, classification: PointClassification]
  close: []
}>()

type Tab = 'pending' | 'fix'
const tab = ref<Tab>('pending')
const openId = ref<string | null>(null)

// Paso 2 de la clasificación: qué tipo de cierre se eligió y falta escoger la jugadora.
type Choice =
  | { kind: 'point'; reason: 'attack' | 'block' | 'ace' }
  | { kind: 'error'; errorType: StatErrorType }
const choice = ref<Choice | null>(null)

const rows = computed(() => (tab.value === 'pending' ? props.pending : props.classified.slice(0, 40)))

const typeLabel: Record<string, string> = {
  manual: 'Sin clasificar',
  attack: 'Ataque',
  block: 'Bloqueo',
  ace: 'Ace',
  opponent_error: 'Error rival',
}

const opponentOf = (team: TeamSide): TeamSide => (team === 'local' ? 'visitor' : 'local')

const toggleRow = (id: string) => {
  openId.value = openId.value === id ? null : id
  choice.value = null
}

// `regainedServe === true`: el equipo que anotó no tenía el saque (no hay ace; el rival era quien sacaba).
const canAce = (event: StatisticEvent) => event.regainedServe !== true
const canServeError = (event: StatisticEvent) => event.regainedServe !== false
const canReceptionError = (event: StatisticEvent) => event.regainedServe !== true

const activePlayers = (team: TeamSide, excludeLibero: boolean) =>
  (props.teams[team].roster ?? [])
    .filter((player) => player.active && !(excludeLibero && player.isLibero))
    .slice()
    .sort((a, b) => Number(a.number) - Number(b.number))

const playersFor = (event: StatisticEvent) => {
  if (!choice.value) return []
  if (choice.value.kind === 'point') return activePlayers(event.team, true)
  return activePlayers(opponentOf(event.team), false)
}

const send = (event: StatisticEvent, classification: PointClassification) => {
  emit('classify', event.id, classification)
  openId.value = null
  choice.value = null
}

const pick = (event: StatisticEvent, playerNumber?: string | number) => {
  if (!choice.value) return
  send(
    event,
    choice.value.kind === 'point'
      ? { kind: 'point', reason: choice.value.reason, playerNumber }
      : { kind: 'error', errorType: choice.value.errorType, playerNumber },
  )
}

const time = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

const playerText = (event: StatisticEvent) => (event.playerNumber ? ` #${event.playerNumber}` : '')
</script>

<template>
  <aside
    class="fixed inset-y-0 right-0 z-50 flex w-[min(34rem,100vw)] flex-col border-l border-broadcast-outline bg-broadcast-background shadow-2xl"
    aria-label="Puntos por clasificar"
  >
    <header class="flex shrink-0 items-center justify-between gap-2 border-b border-broadcast-outline px-4 py-3">
      <div class="inline-flex rounded border border-broadcast-outline bg-broadcast-surface-high p-1">
        <button
          type="button"
          class="rounded px-3 py-1.5 text-xs font-black uppercase transition"
          :class="tab === 'pending' ? 'bg-broadcast-accent text-[#00354a]' : 'text-broadcast-muted hover:text-broadcast-text'"
          @click="((tab = 'pending'), (openId = null), (choice = null))"
        >
          Pendientes ({{ pending.length }})
        </button>
        <button
          type="button"
          class="rounded px-3 py-1.5 text-xs font-black uppercase transition"
          :class="tab === 'fix' ? 'bg-broadcast-accent text-[#00354a]' : 'text-broadcast-muted hover:text-broadcast-text'"
          @click="((tab = 'fix'), (openId = null), (choice = null))"
        >
          Corregir
        </button>
      </div>
      <button
        type="button"
        class="flex h-11 w-11 items-center justify-center rounded border border-broadcast-outline text-broadcast-muted transition hover:text-broadcast-text"
        aria-label="Cerrar"
        @click="emit('close')"
      >
        <X class="h-5 w-5" />
      </button>
    </header>

    <p v-if="tab === 'pending'" class="shrink-0 px-4 pt-3 text-xs text-broadcast-muted">
      Puntos que sumaste sin clasificar. Toca uno para decir cómo terminó y quién lo hizo. El marcador no cambia.
    </p>
    <p v-else class="shrink-0 px-4 pt-3 text-xs text-broadcast-muted">
      Últimos puntos clasificados. Toca uno para cambiar el tipo o la jugadora.
    </p>

    <div class="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
      <p v-if="rows.length === 0" class="py-10 text-center text-sm text-broadcast-muted">
        {{ tab === 'pending' ? 'Todo clasificado. 👌' : 'Aún no hay puntos clasificados.' }}
      </p>

      <div
        v-for="event in rows"
        :key="event.id"
        class="rounded-lg border bg-broadcast-surface"
        :class="openId === event.id ? 'border-broadcast-accent' : 'border-broadcast-outline'"
      >
        <button type="button" class="flex w-full items-center justify-between gap-3 px-3 py-3 text-left" @click="toggleRow(event.id)">
          <span class="flex min-w-0 items-center gap-2">
            <span class="h-6 w-1.5 shrink-0 rounded" :style="{ backgroundColor: teams[event.team].primaryColor }" />
            <span class="min-w-0">
              <span class="block truncate text-sm font-black uppercase text-broadcast-text">
                {{ teams[event.team].shortCode }} · {{ event.score.local }}-{{ event.score.visitor }}
                <span class="font-semibold normal-case text-broadcast-muted">· Set {{ event.set }} · {{ time(event.timestamp) }}</span>
              </span>
              <span class="block text-xs" :class="event.type === 'manual' ? 'text-broadcast-alert' : 'text-broadcast-muted'">
                {{ typeLabel[event.type] ?? event.type }}{{ playerText(event) }}
              </span>
            </span>
          </span>
          <span class="shrink-0 text-xs font-black uppercase text-broadcast-accent">
            {{ openId === event.id ? 'Cerrar' : tab === 'pending' ? 'Clasificar' : 'Editar' }}
          </span>
        </button>

        <div v-if="openId === event.id" class="space-y-3 border-t border-broadcast-outline p-3">
          <!-- Paso 1: cómo terminó -->
          <div class="grid grid-cols-3 gap-2">
            <button
              type="button"
              class="h-12 rounded border border-broadcast-accent/60 bg-broadcast-accent/10 text-xs font-black uppercase text-broadcast-accent transition active:scale-95"
              :class="choice?.kind === 'point' && choice.reason === 'attack' ? 'bg-broadcast-accent !text-[#00354a]' : ''"
              @click="choice = { kind: 'point', reason: 'attack' }"
            >
              Ataque
            </button>
            <button
              type="button"
              class="h-12 rounded border border-broadcast-accent/60 bg-broadcast-accent/10 text-xs font-black uppercase text-broadcast-accent transition active:scale-95"
              :class="choice?.kind === 'point' && choice.reason === 'block' ? 'bg-broadcast-accent !text-[#00354a]' : ''"
              @click="choice = { kind: 'point', reason: 'block' }"
            >
              Bloqueo
            </button>
            <button
              type="button"
              class="h-12 rounded border border-broadcast-accent/60 bg-broadcast-accent/10 text-xs font-black uppercase text-broadcast-accent transition active:scale-95 disabled:opacity-30"
              :class="choice?.kind === 'point' && choice.reason === 'ace' ? 'bg-broadcast-accent !text-[#00354a]' : ''"
              :disabled="!canAce(event)"
              :title="canAce(event) ? '' : 'Este punto lo anotó el equipo que recibía: no puede ser ace.'"
              @click="choice = { kind: 'point', reason: 'ace' }"
            >
              Ace
            </button>
            <button
              type="button"
              class="h-12 rounded border border-broadcast-danger/50 bg-broadcast-danger/10 text-xs font-black uppercase text-broadcast-danger transition active:scale-95"
              :class="choice?.kind === 'error' && choice.errorType === 'attack_error' ? 'bg-broadcast-danger !text-white' : ''"
              @click="choice = { kind: 'error', errorType: 'attack_error' }"
            >
              Err. ataque rival
            </button>
            <button
              type="button"
              class="h-12 rounded border border-broadcast-danger/50 bg-broadcast-danger/10 text-xs font-black uppercase text-broadcast-danger transition active:scale-95 disabled:opacity-30"
              :class="choice?.kind === 'error' && choice.errorType === 'serve_error' ? 'bg-broadcast-danger !text-white' : ''"
              :disabled="!canServeError(event)"
              :title="canServeError(event) ? '' : 'El rival no tenía el saque en este punto.'"
              @click="choice = { kind: 'error', errorType: 'serve_error' }"
            >
              Err. saque rival
            </button>
            <button
              type="button"
              class="h-12 rounded border border-broadcast-danger/50 bg-broadcast-danger/10 text-xs font-black uppercase text-broadcast-danger transition active:scale-95 disabled:opacity-30"
              :class="choice?.kind === 'error' && choice.errorType === 'reception_error' ? 'bg-broadcast-danger !text-white' : ''"
              :disabled="!canReceptionError(event)"
              :title="canReceptionError(event) ? '' : 'El rival tenía el saque en este punto.'"
              @click="choice = { kind: 'error', errorType: 'reception_error' }"
            >
              Err. recep. rival
            </button>
          </div>
          <button
            type="button"
            class="h-11 w-full rounded border border-broadcast-outline bg-broadcast-surface-high text-xs font-black uppercase text-broadcast-text transition hover:border-broadcast-accent active:scale-95"
            title="Error del rival sin jugadora (red, doble, invasión...)"
            @click="send(event, { kind: 'point', reason: 'opponent_error' })"
          >
            Rival erró (sin jugadora)
          </button>

          <!-- Paso 2: quién -->
          <div v-if="choice">
            <div class="mb-1 text-[10px] font-black uppercase tracking-widest text-broadcast-muted">
              {{
                choice.kind === 'point'
                  ? `¿Quién anotó? (${teams[event.team].shortCode})`
                  : `¿Quién erró? (${teams[opponentOf(event.team)].shortCode})`
              }}
            </div>
            <div class="grid grid-cols-4 gap-2">
              <button
                v-for="player in playersFor(event)"
                :key="player.id"
                type="button"
                class="flex h-14 flex-col items-center justify-center rounded border border-broadcast-outline bg-broadcast-surface-high text-broadcast-text transition hover:border-broadcast-accent active:scale-95"
                @click="pick(event, String(player.number))"
              >
                <span class="text-lg font-black leading-none">{{ player.number }}</span>
                <span class="max-w-full truncate px-1 text-[10px] font-semibold text-broadcast-muted">
                  {{ player.name.split(' ')[0] }}
                </span>
              </button>
              <button
                type="button"
                class="flex h-14 items-center justify-center rounded border border-dashed border-broadcast-outline text-[11px] font-black uppercase text-broadcast-muted transition hover:text-broadcast-text active:scale-95"
                @click="pick(event)"
              >
                Sin jugadora
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>
