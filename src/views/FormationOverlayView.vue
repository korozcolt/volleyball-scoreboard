<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Volleyball } from 'lucide-vue-next'
import CourtLineup from '@/components/overlay/CourtLineup.vue'
import { useMatchScope } from '@/composables/useMatchScope'
import { useMatchStore } from '@/stores/match'
import { useOverlayControlStore } from '@/stores/overlayControl'
import type { TeamSide } from '@/types/game.types'

const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 1080

const route = useRoute()
const match = useMatchStore()
const overlay = useOverlayControlStore()

useMatchScope()

const side = computed<TeamSide>(() => (route.params.team === 'visitor' ? 'visitor' : 'local'))
const baseTeam = computed(() => match.gameState[side.value])
const teamColor = computed(() => baseTeam.value.primaryColor || '#7bd0ff')

const mode = computed(() => overlay.state.formationMode[side.value])
const isVisible = computed(() => overlay.state.formationVisible[side.value])

/** Team clone with rotation swapped for the starting six when in "starting" mode */
const displayTeam = computed(() => {
  if (mode.value !== 'starting') return baseTeam.value
  const startingRotation = baseTeam.value.startingRotation
  if (!startingRotation) return baseTeam.value
  return { ...baseTeam.value, rotation: startingRotation }
})

const onCourtNumbers = computed(() => new Set(displayTeam.value.rotation.map((n) => String(n))))

const substitutes = computed(() =>
  [...(baseTeam.value.roster ?? [])]
    .filter((p) => !onCourtNumbers.value.has(String(p.number)))
    .sort((a, b) => Number(a.number) - Number(b.number)),
)

const subtitle = computed(() => {
  const setLabel = `Set ${match.gameState.currentSet}`
  return mode.value === 'starting' ? `${setLabel} · Alineación inicial` : `${setLabel} · Formación actual`
})

const titleLabel = computed(() => (mode.value === 'starting' ? 'Starting Six' : 'On Court'))

const showNames = computed(() => match.gameState.settings.enablePlayerNames)

const scale = ref(1)
const updateScale = () => {
  scale.value = Math.min(window.innerWidth / DESIGN_WIDTH, window.innerHeight / DESIGN_HEIGHT)
}
onMounted(() => {
  updateScale()
  window.addEventListener('resize', updateScale)
})
onUnmounted(() => window.removeEventListener('resize', updateScale))
</script>

<template>
  <div class="formation-stage">
    <div class="formation-scale-viewport" :style="{ transform: `translate(-50%, -50%) scale(${scale})` }">
      <transition name="formation-fade">
        <div v-if="isVisible" class="formation-panel" :style="{ '--tc': teamColor }">
          <div class="formation-panel__bg" />

          <header class="formation-header">
            <div class="formation-header__badge">
              <Volleyball class="h-9 w-9" />
            </div>
            <div class="formation-header__text">
              <h1>{{ titleLabel }}</h1>
              <p>{{ subtitle }}</p>
            </div>
            <div class="formation-header__team">
              <div class="formation-header__name">{{ baseTeam.name }}</div>
              <div class="formation-header__meta">
                {{ match.gameState.metadata.tournament }} · {{ match.gameState.metadata.phase }}
              </div>
            </div>
          </header>

          <div class="formation-court">
            <div class="formation-court__scaler">
              <CourtLineup :team="displayTeam" :side="side" :show-names="showNames" />
            </div>
          </div>

          <footer class="formation-footer">
            <div class="formation-footer__row">
              <span class="formation-footer__label">Suplentes</span>
              <span v-if="substitutes.length" class="formation-footer__value">
                {{ substitutes.map((p) => `${p.number} ${p.name}`).join(' · ') }}
              </span>
              <span v-else class="formation-footer__value formation-footer__value--muted">—</span>
            </div>
            <div v-if="baseTeam.headCoach || baseTeam.assistantCoach" class="formation-footer__row">
              <span class="formation-footer__label">Staff</span>
              <span class="formation-footer__value">
                {{ [baseTeam.headCoach, baseTeam.assistantCoach].filter(Boolean).join(' · ') }}
              </span>
            </div>
          </footer>
        </div>
      </transition>
    </div>
  </div>
</template>

<style scoped>
.formation-stage {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: transparent;
}

.formation-scale-viewport {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 1920px;
  height: 1080px;
  transform-origin: center center;
}

.formation-fade-enter-active,
.formation-fade-leave-active {
  transition: opacity 0.45s ease, transform 0.45s ease;
}
.formation-fade-enter-from,
.formation-fade-leave-to {
  opacity: 0;
  transform: translateY(18px);
}

.formation-panel {
  position: absolute;
  inset: 60px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 0.5rem;
}

.formation-panel__bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    145deg,
    rgba(12, 15, 26, 0.95) 0%,
    color-mix(in srgb, var(--tc) 16%, rgba(9, 11, 22, 0.96)) 100%
  );
}

.formation-header {
  position: relative;
  display: flex;
  align-items: center;
  gap: 1.75rem;
  padding: 48px 64px 8px;
}

.formation-header__badge {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: 6px solid rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.formation-header__text h1 {
  margin: 0;
  font-size: 3.2rem;
  font-weight: 800;
  color: var(--tc);
  line-height: 1;
}

.formation-header__text p {
  margin: 0.3rem 0 0;
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.75);
}

.formation-header__team {
  margin-left: auto;
  text-align: right;
}

.formation-header__name {
  font-size: 1.6rem;
  font-weight: 800;
  color: #fff;
}

.formation-header__meta {
  margin-top: 0.35rem;
  font-size: 0.95rem;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
}

.formation-court {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  padding: 0 64px;
}

.formation-court__scaler {
  width: 800px;
  height: 220px;
  transform: scale(2.7);
  transform-origin: center center;
}

.formation-footer {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 24px 64px 44px;
}

.formation-footer__row {
  display: flex;
  align-items: baseline;
  gap: 1rem;
}

.formation-footer__label {
  flex-shrink: 0;
  font-size: 0.9rem;
  font-weight: 800;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--tc);
}

.formation-footer__value {
  font-size: 1.05rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.85);
}

.formation-footer__value--muted {
  color: rgba(255, 255, 255, 0.35);
}
</style>
