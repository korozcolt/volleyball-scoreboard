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
  const map = new Map<string | number, MatchTeamPlayer>()
  for (const player of props.team.roster ?? []) {
    map.set(player.number, player)
    map.set(String(player.number), player)
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
      isLibero: player?.isLibero ?? false,
    }
  }),
)

const teamColor = computed(() => props.team.primaryColor || '#7bd0ff')
</script>

<template>
  <div class="vb-court-container" :style="{ '--team-color': teamColor }">
    
    <!-- 3D Court Floor -->
    <div class="vb-court-floor">
      <div class="vb-court-floor__attack-line" />
      <div class="vb-court-floor__net-line" />
    </div>

    <!-- 2D Players Layer -->
    <div class="vb-court-players">
      <div
        v-for="cell in courtPlayers"
        :key="cell.zone"
        class="vb-player-token"
        :class="[`vb-player-token--z${cell.zone}`, { 'vb-player-token--server': cell.isServer, 'vb-player-token--libero': cell.isLibero }]"
      >
        <div class="vb-player-token__body">
          <!-- Server icon indicator -->
          <div v-if="cell.isServer" class="vb-player-token__server-icon"></div>
          
          <span class="vb-player-token__number">{{ cell.jerseyNumber }}</span>
        </div>
        
        <div class="vb-player-token__info" v-if="showNames || cell.isLibero">
          <span v-if="showNames && cell.firstName" class="vb-player-token__name">{{ cell.firstName }}</span>
          <span v-if="cell.isLibero" class="vb-player-token__role">LÍBERO</span>
        </div>
      </div>
    </div>

  </div>
</template>
