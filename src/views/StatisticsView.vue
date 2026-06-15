<script setup lang="ts">
import BroadcastLayout from '@/components/layout/BroadcastLayout.vue'
import OverlayScoreboard from '@/components/broadcast/OverlayScoreboard.vue'
import StatisticsPanel from '@/components/controller/StatisticsPanel.vue'
import { useMatchStore } from '@/stores/match'
import { useOverlayControlStore } from '@/stores/overlayControl'
import { useStatisticsStore } from '@/stores/statistics'

const match = useMatchStore()
const overlay = useOverlayControlStore()
const statistics = useStatisticsStore()

const showStatsOverlay = () => overlay.setActiveOverlay('stats')

const resetStatistics = () => {
  if (window.confirm('¿Reiniciar solo las estadísticas del partido?')) statistics.resetMatchStats()
}
</script>

<template>
  <BroadcastLayout>
    <section class="mb-6">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-semibold text-broadcast-text">Estadísticas</h1>
          <p class="text-sm text-broadcast-muted">
            {{ match.gameState.metadata.tournament }} · Set {{ match.gameState.currentSet }}
          </p>
        </div>
        <button class="admin-button" @click="showStatsOverlay">
          Mostrar en OBS
        </button>
      </div>

      <div class="obs-preview flex items-end justify-center pb-[5%]">
        <OverlayScoreboard
          :game-state="match.gameState"
          mode="stats"
          :statistics="statistics.state"
          compact
        />
      </div>
    </section>

    <StatisticsPanel
      :game-state="match.gameState"
      :statistics="statistics.state"
      :efficiency="statistics.teamEfficiency"
      @reset="resetStatistics"
    />
  </BroadcastLayout>
</template>
