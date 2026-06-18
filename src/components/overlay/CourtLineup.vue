<script setup lang="ts">
import { computed } from 'vue'
import type { MatchTeamPlayer, Team } from '@/types/game.types'

const props = defineProps<{
  team: Team
  side: 'local' | 'visitor'
  showNames?: boolean
}>()

/**
 * Volleyball court zone layout (coach view, front of court at top):
 *
 *   NET ──────────────────
 *  [Zone 4] [Zone 3] [Zone 2]   ← front row
 *  ── LÍNEA DE ATAQUE (3m) ───
 *  [Zone 5] [Zone 6] [Zone 1]   ← back row  (Zone 1 = server)
 *
 * rotation array → rotation[i] = jersey number at position (i+1)
 * rotation[0] = Zone 1 (server), rotation[1] = Zone 2, ..., rotation[5] = Zone 6
 *
 * DISPLAY ORDER for the 3×2 grid:
 *  grid col:   0        1        2
 *  row 0 (front): rotIdx 3 | rotIdx 2 | rotIdx 1   (zones 4, 3, 2)
 *  row 1 (back):  rotIdx 4 | rotIdx 5 | rotIdx 0   (zones 5, 6, 1)
 */
const ZONE_CELLS = [
  { zone: 4, rotIdx: 3, row: 0, col: 0 },
  { zone: 3, rotIdx: 2, row: 0, col: 1 },
  { zone: 2, rotIdx: 1, row: 0, col: 2 },
  { zone: 5, rotIdx: 4, row: 1, col: 0 },
  { zone: 6, rotIdx: 5, row: 1, col: 1 },
  { zone: 1, rotIdx: 0, row: 1, col: 2 },
] as const

const rosterByNumber = computed(() => {
  const map = new Map<number, MatchTeamPlayer>()
  for (const player of props.team.roster ?? []) {
    map.set(player.number, player)
  }
  return map
})

const courtPlayers = computed(() =>
  ZONE_CELLS.map((cell) => {
    const jerseyNumber = props.team.rotation[cell.rotIdx]
    const player = rosterByNumber.value.get(jerseyNumber)
    return {
      ...cell,
      jerseyNumber: jerseyNumber ?? cell.zone,
      name: player?.name ?? '',
      firstName: player?.name?.split(' ')[0] ?? '',
      isServer: cell.zone === 1,
    }
  }),
)

const teamColor = computed(() => props.team.primaryColor || '#7bd0ff')
</script>

<template>
  <div class="vb-court" :style="{ '--team-color': teamColor }">

    <!-- NET label -->
    <div class="vb-net">
      <div class="vb-net__line" />
      <span class="vb-net__label">RED</span>
      <div class="vb-net__line" />
    </div>

    <!-- Perspective court wrapper -->
    <div class="vb-court-perspective">
      <!-- Front row (zones 4, 3, 2) -->
      <div class="vb-row vb-row--front">
        <div
          v-for="cell in courtPlayers.filter(p => p.row === 0)"
          :key="cell.zone"
          class="vb-cell vb-cell--front"
        >
          <div class="vb-cell__zone">Z{{ cell.zone }}</div>
          <div class="vb-cell__jersey">#{{ cell.jerseyNumber }}</div>
          <div v-if="showNames && cell.firstName" class="vb-cell__name">{{ cell.firstName }}</div>
        </div>
      </div>

      <!-- Attack line -->
      <div class="vb-attack-line">
        <div class="vb-attack-line__dash" />
        <span class="vb-attack-line__label">Línea de ataque</span>
        <div class="vb-attack-line__dash" />
      </div>

      <!-- Back row (zones 5, 6, 1) -->
      <div class="vb-row vb-row--back">
        <div
          v-for="cell in courtPlayers.filter(p => p.row === 1)"
          :key="cell.zone"
          class="vb-cell vb-cell--back"
          :class="{ 'vb-cell--server': cell.isServer }"
        >
          <div class="vb-cell__zone" :class="{ 'vb-cell__zone--server': cell.isServer }">Z{{ cell.zone }}</div>
          <div class="vb-cell__jersey" :class="{ 'vb-cell__jersey--server': cell.isServer }">
            #{{ cell.jerseyNumber }}
          </div>
          <div v-if="showNames && cell.firstName" class="vb-cell__name">{{ cell.firstName }}</div>
          <div v-if="cell.isServer" class="vb-cell__serve-icon">⚡</div>
        </div>
      </div>
    </div>

    <!-- Rotation order strip -->
    <div class="vb-rotation-strip">
      <span
        v-for="(p, i) in courtPlayers.sort((a, b) => a.rotIdx - b.rotIdx)"
        :key="i"
        class="vb-rotation-strip__item"
        :class="{ 'vb-rotation-strip__item--server': p.isServer }"
      >
        {{ p.jerseyNumber }}
      </span>
    </div>
  </div>
</template>
