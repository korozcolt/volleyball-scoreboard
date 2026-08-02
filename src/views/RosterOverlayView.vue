<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Volleyball } from 'lucide-vue-next'
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
const team = computed(() => match.gameState[side.value])
const teamColor = computed(() => team.value.primaryColor || '#7bd0ff')

const roster = computed(() =>
  [...(team.value.roster ?? [])].sort((a, b) => Number(a.number) - Number(b.number)),
)

const displayRole = (role?: string) => {
  if (!role) return '–'
  const map: Record<string, string> = { S: 'S', OH: 'OH', MB: 'MB', OPP: 'OPP', L: 'L', DS: 'DS' }
  return map[role] || role
}

const isVisible = computed(() => overlay.state.rosterVisible[side.value])

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
  <div class="roster-stage">
    <div class="roster-scale-viewport" :style="{ transform: `translate(-50%, -50%) scale(${scale})` }">
      <transition name="roster-fade">
        <div v-if="isVisible" class="roster-panel" :style="{ '--tc': teamColor }">
          <div class="roster-panel__bg" />
          <div class="roster-panel__diagonal" />

          <div class="roster-side-label">
            <span>Team Roster</span>
          </div>

          <header class="roster-header">
            <div class="roster-header__badge">
              <Volleyball class="h-9 w-9" />
            </div>
            <div class="roster-header__text">
              <h1>{{ team.name }}</h1>
              <p>{{ match.gameState.metadata.tournament }} · {{ match.gameState.metadata.phase }}</p>
            </div>
          </header>

          <div class="roster-list">
            <div v-for="player in roster" :key="player.id" class="roster-row">
              <div class="roster-row__num">{{ player.number }}</div>
              <div class="roster-row__pos" :class="{ 'roster-row__pos--libero': player.isLibero }">
                {{ displayRole(player.role) }}
              </div>
              <div class="roster-row__name">
                {{ player.name }}
              </div>
            </div>
            <div v-if="!roster.length" class="roster-empty">Plantel sin cargar</div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<style scoped>
.roster-stage {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: transparent;
}

.roster-scale-viewport {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 1920px;
  height: 1080px;
  transform-origin: center center;
}

.roster-fade-enter-active,
.roster-fade-leave-active {
  transition: opacity 0.45s ease, transform 0.45s ease;
}
.roster-fade-enter-from,
.roster-fade-leave-to {
  opacity: 0;
  transform: translateY(18px);
}

.roster-panel {
  position: absolute;
  inset: 60px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 0.5rem;
}

.roster-panel__bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(6, 9, 22, 0.96) 0%,
    color-mix(in srgb, var(--tc) 22%, rgba(10, 8, 26, 0.96)) 100%
  );
}

.roster-panel__diagonal {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 40%;
  height: 85%;
  background: linear-gradient(200deg, transparent 0%, rgba(0, 0, 0, 0.55) 45%, rgba(0, 0, 0, 0.7) 100%);
  clip-path: polygon(38% 100%, 8% 62%, 22% 26%, 52% 6%, 84% 14%, 100% 44%, 100% 100%);
}

.roster-side-label {
  position: absolute;
  left: 0;
  top: 56px;
  bottom: 56px;
  width: 88px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-left: 4px solid var(--tc);
}

.roster-side-label span {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  white-space: nowrap;
  font-size: 2.4rem;
  font-weight: 800;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--tc);
}

.roster-header {
  position: relative;
  display: flex;
  align-items: center;
  gap: 1.75rem;
  padding: 56px 56px 24px 168px;
}

.roster-header__badge {
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

.roster-header__text h1 {
  margin: 0;
  font-size: 2.75rem;
  font-weight: 800;
  color: #fff;
  line-height: 1;
}

.roster-header__text p {
  margin: 0.5rem 0 0;
  font-size: 1.1rem;
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.65);
}

.roster-list {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 8px 56px 40px 168px;
  overflow: hidden;
}

.roster-row {
  display: flex;
  align-items: stretch;
  gap: 6px;
  height: 46px;
  flex-shrink: 0;
}

.roster-row__num {
  width: 46px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
}

.roster-row__pos {
  width: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.04em;
  background: color-mix(in srgb, var(--tc) 90%, black 10%);
}

.roster-row__pos--libero {
  background: #ff3b30;
}

.roster-row__name {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  padding-left: 24px;
  font-size: 1.25rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #fff;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--tc) 90%, black 5%) 0%,
    color-mix(in srgb, var(--tc) 15%, transparent) 100%
  );
}

.roster-empty {
  padding: 2rem 0;
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.4);
  font-style: italic;
}
</style>
