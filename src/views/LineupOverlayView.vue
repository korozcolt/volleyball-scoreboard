<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import CourtLineup from '@/components/overlay/CourtLineup.vue'
import { useMatchScope } from '@/composables/useMatchScope'
import { useBroadcastConfigStore } from '@/stores/broadcastConfig'
import { useMatchStore } from '@/stores/match'
import { useOverlayControlStore } from '@/stores/overlayControl'
import { useStatisticsStore } from '@/stores/statistics'

// ─── Design canvas ───────────────────────────────────────────────────────────
const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 1080

// ─── Stores ──────────────────────────────────────────────────────────────────
const match = useMatchStore()
const broadcast = useBroadcastConfigStore()
const overlay = useOverlayControlStore()
const statistics = useStatisticsStore()
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
  return [...roster].sort((a, b) => a.number - b.number)
}

const localRoster = computed(() => sortedRoster('local'))
const visitorRoster = computed(() => sortedRoster('visitor'))

/** True when the team's jersey number is currently on the court */
const isOnCourt = (side: 'local' | 'visitor', number: number) =>
  match.gameState[side].rotation.includes(number)

const efficiency = (side: 'local' | 'visitor') => statistics.teamEfficiency(side)

// Visibility — driven by the overlay store so the controller can toggle it
const isVisible = computed(() => overlay.state.lineupVisible)
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

          <!-- ══════════════ TOP BAR ══════════════ -->
          <header class="lineup-topbar">
            <!-- League logo -->
            <img
              v-if="leagueLogo"
              :src="leagueLogo"
              alt="League"
              class="h-10 w-auto object-contain opacity-90"
            />
            <div v-else class="lineup-topbar__spacer" />

            <!-- Tournament info -->
            <div class="lineup-topbar__center">
              <div class="lineup-topbar__tournament">
                {{ match.gameState.metadata.tournament }}
              </div>
              <div class="lineup-topbar__phase">
                {{ match.gameState.metadata.phase }} · Set {{ match.gameState.currentSet }}
              </div>
            </div>

            <!-- Sponsor logo -->
            <img
              v-if="sponsorLogo"
              :src="sponsorLogo"
              alt="Sponsor"
              class="h-10 w-auto object-contain opacity-80"
            />
            <div v-else class="lineup-topbar__spacer" />
          </header>

          <!-- ══════════════ SCOREBOARD BAR ══════════════ -->
          <div class="lineup-scorebar">
            <!-- Local team identity -->
            <div class="lineup-scorebar__team lineup-scorebar__team--local" :style="{ '--tc': localColor }">
              <img
                v-if="match.gameState.local.logoUrl"
                :src="match.gameState.local.logoUrl"
                :alt="match.gameState.local.name"
                class="h-12 w-12 object-contain"
              />
              <div v-else class="lineup-scorebar__code" :style="{ color: localColor }">
                {{ match.gameState.local.shortCode }}
              </div>
              <div class="lineup-scorebar__name">{{ match.gameState.local.name }}</div>
              <div v-if="match.gameState.local.serving" class="lineup-scorebar__serve-dot" />
            </div>

            <!-- Score center -->
            <div class="lineup-scorebar__score">
              <div class="lineup-scorebar__points">{{ scoreLabel }}</div>
              <div class="lineup-scorebar__sets">{{ setsLabel }}</div>
            </div>

            <!-- Visitor team identity -->
            <div class="lineup-scorebar__team lineup-scorebar__team--visitor" :style="{ '--tc': visitorColor }">
              <div v-if="match.gameState.visitor.serving" class="lineup-scorebar__serve-dot" />
              <div class="lineup-scorebar__name">{{ match.gameState.visitor.name }}</div>
              <div v-if="!match.gameState.visitor.logoUrl" class="lineup-scorebar__code" :style="{ color: visitorColor }">
                {{ match.gameState.visitor.shortCode }}
              </div>
              <img
                v-if="match.gameState.visitor.logoUrl"
                :src="match.gameState.visitor.logoUrl"
                :alt="match.gameState.visitor.name"
                class="h-12 w-12 object-contain"
              />
            </div>
          </div>

          <!-- ══════════════ MAIN CONTENT ══════════════ -->
          <div class="lineup-content">

            <!-- ── LOCAL TEAM ── -->
            <section class="lineup-team-panel" :style="{ '--tc': localColor }">
              <div class="lineup-team-panel__header">
                <img
                  v-if="match.gameState.local.logoUrl"
                  :src="match.gameState.local.logoUrl"
                  :alt="match.gameState.local.name"
                  class="lineup-team-panel__logo"
                />
                <div>
                  <div class="lineup-team-panel__name">{{ match.gameState.local.name }}</div>
                  <div class="lineup-team-panel__meta">
                    EFI {{ efficiency('local') }}% ·
                    {{ statistics.state.local.attackPoints }} ATQ ·
                    {{ statistics.state.local.aces }} ACE ·
                    {{ statistics.state.local.blockPoints }} BLK
                  </div>
                </div>
              </div>

              <!-- Court diagram -->
              <div class="lineup-court-wrapper">
                <div class="lineup-court-label">CANCHA — ROTACIÓN ACTUAL</div>
                <CourtLineup
                  :team="match.gameState.local"
                  side="local"
                  :show-names="showNames"
                />
              </div>

              <!-- Roster table -->
              <div class="lineup-roster">
                <div class="lineup-roster__header">ROSTER</div>
                <div
                  v-for="player in localRoster"
                  :key="player.id"
                  class="lineup-roster__row"
                  :class="{ 'lineup-roster__row--oncourt': isOnCourt('local', player.number) }"
                >
                  <span class="lineup-roster__number">#{{ player.number }}</span>
                  <span class="lineup-roster__name">{{ player.name }}</span>
                  <span
                    class="lineup-roster__indicator"
                    :class="isOnCourt('local', player.number) ? 'lineup-roster__indicator--active' : ''"
                  />
                </div>
                <div
                  v-if="!localRoster.length"
                  class="lineup-roster__empty"
                >
                  Sin roster cargado
                </div>
              </div>
            </section>

            <!-- ── DIVIDER ── -->
            <div class="lineup-divider">
              <div class="lineup-divider__line" />
              <div class="lineup-divider__badge">VS</div>
              <div class="lineup-divider__line" />
            </div>

            <!-- ── VISITOR TEAM ── -->
            <section class="lineup-team-panel lineup-team-panel--visitor" :style="{ '--tc': visitorColor }">
              <div class="lineup-team-panel__header lineup-team-panel__header--rtl">
                <div class="text-right">
                  <div class="lineup-team-panel__name">{{ match.gameState.visitor.name }}</div>
                  <div class="lineup-team-panel__meta">
                    EFI {{ efficiency('visitor') }}% ·
                    {{ statistics.state.visitor.attackPoints }} ATQ ·
                    {{ statistics.state.visitor.aces }} ACE ·
                    {{ statistics.state.visitor.blockPoints }} BLK
                  </div>
                </div>
                <img
                  v-if="match.gameState.visitor.logoUrl"
                  :src="match.gameState.visitor.logoUrl"
                  :alt="match.gameState.visitor.name"
                  class="lineup-team-panel__logo"
                />
              </div>

              <!-- Court diagram -->
              <div class="lineup-court-wrapper">
                <div class="lineup-court-label">CANCHA — ROTACIÓN ACTUAL</div>
                <CourtLineup
                  :team="match.gameState.visitor"
                  side="visitor"
                  :show-names="showNames"
                />
              </div>

              <!-- Roster table -->
              <div class="lineup-roster lineup-roster--rtl">
                <div class="lineup-roster__header">ROSTER</div>
                <div
                  v-for="player in visitorRoster"
                  :key="player.id"
                  class="lineup-roster__row"
                  :class="{ 'lineup-roster__row--oncourt': isOnCourt('visitor', player.number) }"
                >
                  <span
                    class="lineup-roster__indicator"
                    :class="isOnCourt('visitor', player.number) ? 'lineup-roster__indicator--active' : ''"
                  />
                  <span class="lineup-roster__name lineup-roster__name--right">{{ player.name }}</span>
                  <span class="lineup-roster__number">#{{ player.number }}</span>
                </div>
                <div
                  v-if="!visitorRoster.length"
                  class="lineup-roster__empty"
                >
                  Sin roster cargado
                </div>
              </div>
            </section>
          </div>

        </div>
      </transition>
    </div>
  </div>
</template>
