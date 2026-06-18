<script setup lang="ts">
import { computed } from 'vue'
import type { MatchTeamPlayer, Team } from '@/types/game.types'

const props = defineProps<{
  team: Team
  side: 'local' | 'visitor'
  showNames?: boolean
}>()

/**
 * Volleyball court positions visual layout (from viewer's perspective):
 *
 * Net →  [ 4 | 3 | 2 ]   (front row, left to right)
 *        [ 5 | 6 | 1 ]   (back row, left to right)
 *
 * rotation[0] = position 1 (server, back right)
 * rotation[1] = position 2 (front right)
 * rotation[2] = position 3 (front center)
 * rotation[3] = position 4 (front left)
 * rotation[4] = position 5 (back left)
 * rotation[5] = position 6 (back center)
 *
 * Visual grid index mapping:
 * grid[0] = pos 4 = rotation[3]   grid[1] = pos 3 = rotation[2]   grid[2] = pos 2 = rotation[1]
 * grid[3] = pos 5 = rotation[4]   grid[4] = pos 6 = rotation[5]   grid[5] = pos 1 = rotation[0]
 */
const GRID_TO_ROTATION_INDEX = [3, 2, 1, 4, 5, 0] as const

const rosterByNumber = computed(() => {
  const map = new Map<number, MatchTeamPlayer>()
  for (const player of props.team.roster ?? []) {
    map.set(player.number, player)
  }
  return map
})

const courtPlayers = computed(() => {
  return GRID_TO_ROTATION_INDEX.map((rotIdx, gridIdx) => {
    const jerseyNumber = props.team.rotation[rotIdx]
    const player = rosterByNumber.value.get(jerseyNumber)
    const isServer = rotIdx === 0
    return {
      gridIdx,
      jerseyNumber: jerseyNumber ?? rotIdx + 1,
      name: player?.name ?? `J${jerseyNumber ?? rotIdx + 1}`,
      isServer,
      // grid row/col for CSS grid
      row: gridIdx < 3 ? 0 : 1,
      col: gridIdx % 3,
    }
  })
})

const teamColor = computed(() => props.team.primaryColor || '#7bd0ff')
</script>

<template>
  <div class="court-diagram" :style="{ '--team-color': teamColor }">
    <!-- Net indicator -->
    <div class="court-net-label">RED</div>

    <!-- Court grid: 2 rows × 3 cols -->
    <div class="court-grid">
      <div
        v-for="player in courtPlayers"
        :key="player.gridIdx"
        class="player-chip"
        :class="{
          'player-chip--server': player.isServer,
          'player-chip--front': player.row === 0,
          'player-chip--back': player.row === 1,
        }"
      >
        <div class="player-chip__number">#{{ player.jerseyNumber }}</div>
        <div v-if="showNames" class="player-chip__name">
          {{ player.name.split(' ')[0] }}
        </div>
      </div>
    </div>

    <!-- Attack line indicator -->
    <div class="court-attack-line" />
  </div>
</template>
