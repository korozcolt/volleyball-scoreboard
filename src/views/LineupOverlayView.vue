<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import CourtLineup from '@/components/overlay/CourtLineup.vue'
import { useMatchScope } from '@/composables/useMatchScope'
import { useBroadcastConfigStore } from '@/stores/broadcastConfig'
import { useMatchStore } from '@/stores/match'
import { useOverlayControlStore } from '@/stores/overlayControl'


// ─── Design canvas ───────────────────────────────────────────────────────────
const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 1080

// ─── Stores ──────────────────────────────────────────────────────────────────
const match = useMatchStore()
const broadcast = useBroadcastConfigStore()
const overlay = useOverlayControlStore()

useMatchScope()

// ─── Scale ───────────────────────────────────────────────────────────────────
const scale = ref(1)
const updateScale = () => {
  scale.value = Math.min(
    window.innerWidth / DESIGN_WIDTH,
    window.innerHeight / DESIGN_HEIGHT,
  )
}
onMounted(() => {
  updateScale()
  window.addEventListener('resize', updateScale)
})
onUnmounted(() => window.removeEventListener('resize', updateScale))

// ─── Computed helpers ─────────────────────────────────────────────────────────
const showNames = computed(() => match.gameState.settings.enablePlayerNames)

const localColor = computed(() => match.gameState.local.primaryColor || '#7bd0ff')
const visitorColor = computed(() => match.gameState.visitor.primaryColor || '#ee3a5a')

const sponsorLogo = computed(() => broadcast.config.sponsorLogoUrl)
const leagueLogo = computed(() => match.gameState.leagueLogo || broadcast.config.leagueLogoUrl)

const scoreLabel = computed(() => {
  const l = match.gameState.local
  const v = match.gameState.visitor
  return `${l.score} – ${v.score}`
})

const setsLabel = computed(() => {
  const l = match.gameState.local
  const v = match.gameState.visitor
  return `Sets ${l.sets}–${v.sets}`
})

/** Roster list sorted by jersey number */
const sortedRoster = (side: 'local' | 'visitor') => {
  const roster = match.gameState[side].roster ?? []
  return [...roster].sort((a, b) => Number(a.number) - Number(b.number))
}

const localRoster = computed(() => sortedRoster('local'))
const visitorRoster = computed(() => sortedRoster('visitor'))

/** True when the team's jersey number is currently on the court */
const isOnCourt = (side: 'local' | 'visitor', number: string | number) =>
  match.gameState[side].rotation.some(n => String(n) === String(number))



// Visibility — driven by the overlay store so the controller can toggle it
const isVisible = computed(() => overlay.state.lineupVisible)
const lineupMode = computed(() => overlay.state.lineupMode || 'court')

const displayRole = (role?: string) => {
  if (!role) return ''
  const map: Record<string, string> = { S: 'ARMADOR', OH: 'PUNTA', MB: 'CENTRAL', OPP: 'OPUESTO', L: 'LÍBERO', DS: 'DEFENSA' }
  return map[role] || role
}
</script>

<template>
  <!-- Outer stage: transparent, fills the browser window -->
  <div class="lineup-stage">
    <div
      class="lineup-scale-viewport"
      :style="{ transform: `translate(-50%, -50%) scale(${scale})` }"
    >
      <!-- ─── Main panel ───────────────────────────────────────────────────── -->
      <transition name="lineup-fade">
        <div v-if="isVisible" class="lineup-panel">

          <!-- ══════════════ LIST VIEW ══════════════ -->
          <div v-if="lineupMode === 'list'" class="lineup-list-view">
            <!-- Header -->
            <div class="lineup-list-header">
              <div class="lineup-list-header__team" :style="{ '--tc': localColor }">
                <img v-if="match.gameState.local.logoUrl" :src="match.gameState.local.logoUrl" />
                <span v-else class="text-3xl font-black" :style="{ color: localColor }">{{ match.gameState.local.shortCode }}</span>
                <h2>{{ match.gameState.local.name }}</h2>
              </div>
              <div class="lineup-list-header__center">
                <h3>LINEUP</h3>
                <img v-if="leagueLogo" :src="leagueLogo" alt="League" class="h-12 w-auto object-contain opacity-90 mx-auto mt-2" />
              </div>
              <div class="lineup-list-header__team flex-row-reverse text-right" :style="{ '--tc': visitorColor }">
                <img v-if="match.gameState.visitor.logoUrl" :src="match.gameState.visitor.logoUrl" />
                <span v-else class="text-3xl font-black" :style="{ color: visitorColor }">{{ match.gameState.visitor.shortCode }}</span>
                <h2>{{ match.gameState.visitor.name }}</h2>
              </div>
            </div>

            <!-- Roster Lists -->
            <div class="lineup-list-grid">
              <!-- Local Roster -->
              <div class="lineup-list-roster" :style="{ '--tc': localColor }">
                <div
                  v-for="player in localRoster"
                  :key="player.id"
                  class="lineup-list-player"
                  :class="{ 'lineup-list-player--titular': isOnCourt('local', player.number) }"
                >
                  <div class="lineup-list-player__number">{{ player.number }}</div>
                  <div class="lineup-list-player__info">
                    <div class="lineup-list-player__name">{{ player.name }}</div>
                    <div v-if="player.role" class="lineup-list-player__role">{{ displayRole(player.role) }}</div>
                  </div>
                  <div v-if="player.isLibero" class="lineup-list-player__libero-badge">L</div>
                </div>
              </div>

              <!-- Visitor Roster -->
              <div class="lineup-list-roster lineup-list-roster--rtl" :style="{ '--tc': visitorColor }">
                <div
                  v-for="player in visitorRoster"
                  :key="player.id"
                  class="lineup-list-player lineup-list-player--rtl"
                  :class="{ 'lineup-list-player--titular': isOnCourt('visitor', player.number) }"
                >
                  <div v-if="player.isLibero" class="lineup-list-player__libero-badge">L</div>
                  <div class="lineup-list-player__info text-right">
                    <div class="lineup-list-player__name">{{ player.name }}</div>
                    <div v-if="player.role" class="lineup-list-player__role">{{ displayRole(player.role) }}</div>
                  </div>
                  <div class="lineup-list-player__number">{{ player.number }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- ══════════════ COURT VIEW ══════════════ -->
          <div v-else class="lineup-court-view">
            <!-- TOP BAR -->
            <header class="lineup-topbar">
              <img v-if="leagueLogo" :src="leagueLogo" alt="League" class="h-10 w-auto object-contain opacity-90" />
              <div v-else class="lineup-topbar__spacer" />

              <div class="lineup-topbar__center">
                <div class="lineup-topbar__tournament">{{ match.gameState.metadata.tournament }}</div>
                <div class="lineup-topbar__phase">{{ match.gameState.metadata.phase }} · Set {{ match.gameState.currentSet }}</div>
              </div>

              <img v-if="sponsorLogo" :src="sponsorLogo" alt="Sponsor" class="h-10 w-auto object-contain opacity-80" />
              <div v-else class="lineup-topbar__spacer" />
            </header>

            <!-- SCOREBOARD BAR -->
            <div class="lineup-scorebar">
              <div class="lineup-scorebar__team lineup-scorebar__team--local" :style="{ '--tc': localColor }">
                <img v-if="match.gameState.local.logoUrl" :src="match.gameState.local.logoUrl" class="h-12 w-12 object-contain" />
                <div v-else class="lineup-scorebar__code" :style="{ color: localColor }">{{ match.gameState.local.shortCode }}</div>
                <div class="lineup-scorebar__name">{{ match.gameState.local.name }}</div>
                <div v-if="match.gameState.local.serving" class="lineup-scorebar__serve-dot" />
              </div>

              <div class="lineup-scorebar__score">
                <div class="lineup-scorebar__points">{{ scoreLabel }}</div>
                <div class="lineup-scorebar__sets">{{ setsLabel }}</div>
              </div>

              <div class="lineup-scorebar__team lineup-scorebar__team--visitor" :style="{ '--tc': visitorColor }">
                <div v-if="match.gameState.visitor.serving" class="lineup-scorebar__serve-dot" />
                <div class="lineup-scorebar__name">{{ match.gameState.visitor.name }}</div>
                <div v-if="!match.gameState.visitor.logoUrl" class="lineup-scorebar__code" :style="{ color: visitorColor }">{{ match.gameState.visitor.shortCode }}</div>
                <img v-if="match.gameState.visitor.logoUrl" :src="match.gameState.visitor.logoUrl" class="h-12 w-12 object-contain" />
              </div>
            </div>

            <!-- MAIN CONTENT -->
            <div class="lineup-content">
              <!-- LOCAL TEAM -->
              <section class="lineup-team-panel" :style="{ '--tc': localColor }">
                <div class="lineup-court-wrapper">
                  <div class="lineup-court-label">TITULARES</div>
                  <CourtLineup :team="match.gameState.local" side="local" :show-names="showNames" />
                </div>
              </section>

              <!-- DIVIDER -->
              <div class="lineup-divider">
                <div class="lineup-divider__line" />
                <div class="lineup-divider__badge">VS</div>
                <div class="lineup-divider__line" />
              </div>

              <!-- VISITOR TEAM -->
              <section class="lineup-team-panel lineup-team-panel--visitor" :style="{ '--tc': visitorColor }">
                <div class="lineup-court-wrapper">
                  <div class="lineup-court-label">TITULARES</div>
                  <CourtLineup :team="match.gameState.visitor" side="visitor" :show-names="showNames" />
                </div>
              </section>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>
