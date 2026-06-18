<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronDown, RefreshCcw, Users, List, LayoutTemplate } from 'lucide-vue-next'
import type { MatchTeamPlayer, TeamSide } from '@/types/game.types'
import { useMatchStore } from '@/stores/match'
import { useOverlayControlStore } from '@/stores/overlayControl'

const match = useMatchStore()
const overlay = useOverlayControlStore()

// ─── Volleyball court position layout ────────────────────────────────────────
// rotation array: [pos1, pos2, pos3, pos4, pos5, pos6]
// pos1 = back-right (server), pos2 = front-right, pos3 = front-center,
// pos4 = front-left, pos5 = back-left, pos6 = back-center
//
// Visual layout on the half-court (coach's view, from behind the team):
//  NET side (top)
//  [z4] [z3] [z2]  ← front row  (rotation indices 3, 2, 1)
//  [z5] [z6] [z1]  ← back row   (rotation indices 4, 5, 0)  ← z1 = server
//
// DISPLAY ORDER for the 3×2 grid (left→right, front→back):
// row 0 (front): posIdx 3, 2, 1  (zones 4, 3, 2)
// row 1 (back):  posIdx 4, 5, 0  (zones 5, 6, 1)
const ZONE_LAYOUT = [
  { zone: 4, rotIdx: 3, row: 0, label: 'Zona 4\nDelantero Izq.' },
  { zone: 3, rotIdx: 2, row: 0, label: 'Zona 3\nDelantero Centro' },
  { zone: 2, rotIdx: 1, row: 0, label: 'Zona 2\nDelantero Der.' },
  { zone: 5, rotIdx: 4, row: 1, label: 'Zona 5\nZaguero Izq.' },
  { zone: 6, rotIdx: 5, row: 1, label: 'Zona 6\nZaguero Centro' },
  { zone: 1, rotIdx: 0, row: 1, label: 'Zona 1\nSaque / Zaguero Der.' },
]

// ─── Draft state (one per team) ──────────────────────────────────────────────
const makeDraft = (side: TeamSide): (string | number)[] => {
  const r = match.gameState[side].rotation
  return r.length === 6 ? [...r] : [1, 2, 3, 4, 5, 6]
}

const draftLocal = ref<(string | number)[]>(makeDraft('local'))
const draftVisitor = ref<(string | number)[]>(makeDraft('visitor'))

watch(() => match.gameState.local.rotation, (r) => { if (r.length === 6) draftLocal.value = [...r] }, { deep: true })
watch(() => match.gameState.visitor.rotation, (r) => { if (r.length === 6) draftVisitor.value = [...r] }, { deep: true })

const getDraft = (side: TeamSide) => side === 'local' ? draftLocal.value : draftVisitor.value

const setPosition = (side: TeamSide, rotIdx: number, jersey: string | number) => {
  const draft = getDraft(side)
  // Swap: if the selected jersey is already in another position, swap them
  const currentIdx = draft.findIndex(j => String(j) === String(jersey))
  if (currentIdx !== -1 && currentIdx !== rotIdx) {
    const displaced = draft[rotIdx]
    draft[currentIdx] = displaced
  }
  draft[rotIdx] = jersey
}

const applyFormation = (side: TeamSide) => {
  match.setCourtPositions(side, getDraft(side) as any)
}

const resetDraft = (side: TeamSide) => {
  const r = match.gameState[side].rotation
  if (side === 'local') draftLocal.value = r.length === 6 ? [...r] : [1, 2, 3, 4, 5, 6]
  else draftVisitor.value = r.length === 6 ? [...r] : [1, 2, 3, 4, 5, 6]
}

// ─── Player lookup helpers ────────────────────────────────────────────────────
const rosterFor = (side: TeamSide): MatchTeamPlayer[] =>
  (match.gameState[side].roster ?? []).sort((a, b) => Number(a.number) - Number(b.number))

const playerByNumber = (side: TeamSide, jersey: string | number): MatchTeamPlayer | undefined =>
  rosterFor(side).find((p) => String(p.number) === String(jersey))

const playerLabel = (side: TeamSide, jersey: string | number): string => {
  const p = playerByNumber(side, jersey)
  return p ? `#${p.number} ${p.name}` : `#${jersey}`
}

const isDirty = computed(() => {
  const checkSide = (side: TeamSide) => {
    const draft = getDraft(side)
    const current = match.gameState[side].rotation
    return current.length !== 6 || draft.some((v, i) => v !== current[i])
  }
  return { local: checkSide('local'), visitor: checkSide('visitor') }
})
</script>

<template>
  <section class="admin-card mt-4 p-5">
    <div class="flex items-center justify-between px-3 py-2 border-b border-broadcast-outline bg-broadcast-surface-high">
      <div class="flex items-center gap-2 text-broadcast-muted">
        <Users class="h-4 w-4" />
        <h3 class="text-xs font-bold uppercase tracking-wider">Formación en Cancha</h3>
      </div>
      
      <!-- Overlay View Toggle -->
      <div class="flex items-center gap-1 rounded bg-broadcast-surface p-1">
        <button
          class="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold uppercase transition-colors"
          :class="overlay.state.lineupMode === 'list' ? 'bg-broadcast-accent text-white' : 'text-broadcast-muted hover:text-white'"
          @click="overlay.setLineupMode('list')"
          title="Vista de Lista (Roster completo)"
        >
          <List class="h-3 w-3" />
          Lista
        </button>
        <button
          class="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold uppercase transition-colors"
          :class="overlay.state.lineupMode === 'court' ? 'bg-broadcast-accent text-white' : 'text-broadcast-muted hover:text-white'"
          @click="overlay.setLineupMode('court')"
          title="Vista de Cancha (Titulares)"
        >
          <LayoutTemplate class="h-3 w-3" />
          Cancha
        </button>
      </div>
    </div>
    
    <div class="mb-5 flex items-center gap-2 border-b border-broadcast-outline pb-4">
      <div>
        <h2 class="text-xl font-semibold text-broadcast-text">Formación en cancha</h2>
        <p class="text-xs text-broadcast-muted">
          Asigna qué jugador ocupa cada zona. Zona 1 = sacador. La rotación avanza automáticamente cuando el equipo recupera el saque.
        </p>
      </div>
    </div>

    <div class="grid gap-6 xl:grid-cols-2">
      <!-- ── Team formation panel ── -->
      <div
        v-for="side in (['local', 'visitor'] as const)"
        :key="side"
        class="formation-panel"
        :style="{ '--tc': match.gameState[side].primaryColor || (side === 'local' ? '#7bd0ff' : '#ee3a5a') }"
      >
        <!-- Panel header -->
        <div class="mb-4 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <img
              v-if="match.gameState[side].logoUrl"
              :src="match.gameState[side].logoUrl"
              :alt="match.gameState[side].name"
              class="h-7 w-7 object-contain"
            />
            <span class="font-black text-broadcast-text">
              {{ match.gameState[side].name }}
            </span>
            <span
              v-if="isDirty[side]"
              class="rounded-full bg-broadcast-alert/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-broadcast-alert"
            >
              Sin guardar
            </span>
          </div>
          <div class="flex gap-2">
            <button
              class="admin-button py-1 text-xs"
              :disabled="!isDirty[side]"
              @click="resetDraft(side)"
            >
              <RefreshCcw class="h-3.5 w-3.5" />
              Descartar
            </button>
            <button
              class="admin-button py-1 text-xs"
              :class="isDirty[side] ? 'border-broadcast-accent text-broadcast-accent' : ''"
              @click="applyFormation(side)"
            >
              Aplicar formación
            </button>
          </div>
        </div>

        <!-- Court diagram with selects -->
        <div class="court-edit-wrapper">
          <!-- Net label -->
          <div class="court-edit-net">
            <div class="court-edit-net-line" />
            <span>RED / NET</span>
            <div class="court-edit-net-line" />
          </div>

          <!-- 3×2 grid -->
          <div class="court-edit-grid">
            <div
              v-for="cell in ZONE_LAYOUT"
              :key="cell.zone"
              class="court-edit-cell"
              :class="{
                'court-edit-cell--front': cell.row === 0,
                'court-edit-cell--server': cell.zone === 1,
              }"
            >
              <!-- Zone badge -->
              <div class="court-edit-zone-badge">Z{{ cell.zone }}</div>

              <!-- Zone description -->
              <div class="court-edit-zone-desc">{{ cell.label.split('\n')[1] }}</div>

              <!-- Player selector -->
              <div class="relative mt-1 w-full">
                <select
                  class="court-edit-select"
                  :value="getDraft(side)[cell.rotIdx]"
                  @change="setPosition(side, cell.rotIdx, Number(($event.target as HTMLSelectElement).value))"
                >
                  <option
                    v-for="player in rosterFor(side)"
                    :key="player.id"
                    :value="player.number"
                  >
                    #{{ player.number }} {{ player.name }}{{ player.isLibero ? ' (L)' : '' }}
                  </option>
                  <!-- Fallback if current draft jersey is not in the roster -->
                  <option
                    v-if="!rosterFor(side).some(p => p.number === getDraft(side)[cell.rotIdx])"
                    :value="getDraft(side)[cell.rotIdx]"
                  >
                    #{{ getDraft(side)[cell.rotIdx] }}
                  </option>
                </select>
                <ChevronDown class="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-broadcast-muted" />
              </div>

              <!-- Server indicator -->
              <div v-if="cell.zone === 1" class="court-edit-serve-badge">⚡ Saque</div>
            </div>
          </div>

          <!-- Attack line -->
          <div class="court-edit-attack-line">
            <span class="court-edit-attack-line-label">Línea de ataque (3m)</span>
          </div>
        </div>

        <!-- Rotation summary -->
        <div class="mt-4">
          <div class="mb-2 text-xs font-black uppercase tracking-wider text-broadcast-muted">
            Orden de rotación actual
          </div>
          <div class="flex flex-wrap gap-1.5">
            <div
              v-for="(jersey, idx) in match.gameState[side].rotation"
              :key="idx"
              class="flex items-center gap-1 rounded border px-2 py-1 text-xs font-black"
              :class="[
                idx === 0
                  ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400'
                  : 'border-broadcast-outline bg-broadcast-surface-high text-broadcast-text',
                playerByNumber(side, jersey)?.isLibero ? '!border-[#ffcf4a] !text-[#ffcf4a]' : ''
              ]"
            >
              <span class="text-broadcast-muted">Z{{ idx + 1 }}:</span>
              {{ playerLabel(side, jersey) }}
              <span v-if="playerByNumber(side, jersey)?.isLibero" class="ml-0.5 text-[#ffcf4a] text-[10px]">(L)</span>
              <span v-if="idx === 0 && !playerByNumber(side, jersey)?.isLibero" class="ml-0.5 text-yellow-400">⚡</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
