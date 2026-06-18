<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import OverlayScoreboard from '@/components/broadcast/OverlayScoreboard.vue'
import { useMatchScope } from '@/composables/useMatchScope'
import { useBroadcastConfigStore } from '@/stores/broadcastConfig'
import { useMatchStore } from '@/stores/match'
import { useOverlayControlStore } from '@/stores/overlayControl'

const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 200

const match = useMatchStore()
const broadcast = useBroadcastConfigStore()
const overlay = useOverlayControlStore()
useMatchScope()
const scale = ref(1)

const sponsorLogo = computed(() => broadcast.config.sponsorLogoUrl)

const updateScale = () => {
  scale.value = Math.min(window.innerWidth / DESIGN_WIDTH, window.innerHeight / DESIGN_HEIGHT)
}

onMounted(() => {
  updateScale()
  window.addEventListener('resize', updateScale)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateScale)
})
</script>

<template>
  <div class="overlay-stage">
    <div
      class="overlay-scale-viewport"
      :style="{ transform: `translate(-50%, -50%) scale(${scale})` }"
    >
      <img
        v-if="sponsorLogo"
        :src="sponsorLogo"
        alt="Sponsor"
        class="absolute right-10 top-4 max-h-12 max-w-40 object-contain"
      />

      <div class="absolute bottom-8 left-0 right-0 flex justify-center px-8">
        <OverlayScoreboard :game-state="match.gameState" :mode="overlay.state.activeOverlay" />
      </div>

      <div
        v-if="overlay.state.lowerThirdVisible"
        class="absolute bottom-32 left-12 rounded border border-broadcast-outline bg-broadcast-surface/80 px-5 py-3 text-broadcast-text backdrop-blur-xl"
      >
        {{ match.gameState.metadata.tournament }} · {{ match.gameState.metadata.phase }}
      </div>
    </div>
  </div>
</template>
