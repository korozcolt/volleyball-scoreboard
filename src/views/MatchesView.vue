<script setup lang="ts">
defineOptions({ name: 'MatchesView' })
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { ExternalLink, MonitorCog, Plus, Radio, RefreshCw, Settings, Users } from 'lucide-vue-next'
import BroadcastLayout from '@/components/layout/BroadcastLayout.vue'
import { libraryApi } from '@/services/libraryApi'
import type {
  BroadcastConfig,
  MatchSession,
  MatchTeamPlayer,
  Team,
  TeamProfile,
  TeamSide,
} from '@/types/game.types'
import { DEFAULT_BROADCAST_CONFIG, DEFAULT_GAME_SETTINGS, STORAGE_KEYS } from '@/utils/constants'

const router = useRouter()
const sessions = ref<MatchSession[]>([])
const teams = ref<TeamProfile[]>([])
const isLoading = ref(false)
const isCreating = ref(false)
const status = ref('')
const form = ref({
  title: '',
  format: 5 as 1 | 3 | 5,
  localTeamProfileId: '',
  visitorTeamProfileId: '',
})

const activeSessions = computed(() =>
  sessions.value.filter((session) => session.status !== 'archived'),
)

const loadData = async () => {
  isLoading.value = true
  status.value = ''
  try {
    const [nextSessions, nextTeams] = await Promise.all([
      libraryApi.listMatchSessions(),
      libraryApi.listTeams(),
    ])
    sessions.value = nextSessions
    teams.value = nextTeams
    status.value = nextSessions.length
      ? `${nextSessions.length} partidos cargados.`
      : 'No hay partidos creados todavía.'
  } catch (error) {
    status.value = `No se pudo cargar la lista: ${(error as Error).message}`
  } finally {
    isLoading.value = false
  }
}

const teamById = (teamId: string) => teams.value.find((team) => team.id === teamId)

const toRosterSnapshot = (side: TeamSide, profile?: TeamProfile): MatchTeamPlayer[] => {
  const source = profile?.players?.filter((player) => player.active) ?? []
  if (source.length > 0) {
    return source.map((player, index) => ({
      id: `${side}-${player.number}`,
      teamPlayerId: player.id,
      number: player.number,
      name: player.name,
      position: index + 1,
      active: player.active,
      isLibero: player.isLibero,
      role: player.role,
    }))
  }

  return [1, 2, 3, 4, 5, 6].map((number) => ({
    id: `${side}-${number}`,
    teamId: profile?.id ?? side,
    number,
    name: `Jugador ${number}`,
    active: true,
    position: number,
  }))
}

const createTeam = (side: TeamSide, config: BroadcastConfig, profile?: TeamProfile): Team => {
  const roster = toRosterSnapshot(side, profile)
  // Initially put the first 6 available players on court
  const rotation = roster.slice(0, 6).map((player) => player.number)
  
  // Fill with dummy numbers if roster has fewer than 6 players
  while (rotation.length < 6) {
    rotation.push(String(rotation.length + 1))
  }

  return {
    id: side,
    name: config.teams[side].name,
    shortCode: config.teams[side].shortCode,
    logoUrl: config.teams[side].logoUrl,
    logo: config.teams[side].logoUrl,
    score: 0,
    sets: 0,
    serving: side === 'local',
    currentPlayer: rotation[0] ?? '1',
    rotation,
    roster,
    players: roster.map((player) => ({
      id: Number(player.id) || 0,
      number: player.number,
      name: player.name,
      position: player.position,
      active: player.active,
    })),
    rotationState: {
      positions: rotation,
      currentPlayerNumber: rotation[0] ?? 1,
      history: [],
    },
    primaryColor: config.teams[side].primaryColor,
    color: config.teams[side].primaryColor,
    timeoutsUsed: 0,
  }
}

const createSession = async () => {
  isCreating.value = true
  status.value = ''

  try {
    const localProfile = teamById(form.value.localTeamProfileId)
    const visitorProfile = teamById(form.value.visitorTeamProfileId)
    const config: BroadcastConfig = {
      ...DEFAULT_BROADCAST_CONFIG,
      teams: {
        local: localProfile
          ? {
              name: localProfile.name,
              shortCode: localProfile.shortCode,
              primaryColor: localProfile.primaryColor,
              logoUrl: localProfile.logoUrl,
            }
          : DEFAULT_BROADCAST_CONFIG.teams.local,
        visitor: visitorProfile
          ? {
              name: visitorProfile.name,
              shortCode: visitorProfile.shortCode,
              primaryColor: visitorProfile.primaryColor,
              logoUrl: visitorProfile.logoUrl,
            }
          : DEFAULT_BROADCAST_CONFIG.teams.visitor,
      },
    }
    const now = Date.now()
    const state = {
      local: createTeam('local', config, localProfile),
      visitor: createTeam('visitor', config, visitorProfile),
      currentSet: 1,
      completedSets: [],
      history: [],
      gameFinished: false,
      status: 'idle' as const,
      startTime: now,
      currentSetStartedAt: now,
      settings: {
        ...DEFAULT_GAME_SETTINGS,
        maxSets: form.value.format,
        pointsToWin: form.value.format === 1 ? DEFAULT_GAME_SETTINGS.pointsToWin : 25,
        decidingSetPoints: form.value.format === 1 ? DEFAULT_GAME_SETTINGS.pointsToWin : 15,
      },
      metadata: {
        court: config.court,
        tournament: config.tournament,
        phase: config.phase,
      },
      leagueLogo: config.leagueLogoUrl,
    }

    const session = await libraryApi.createMatchSession({
      title: form.value.title.trim() || `${config.teams.local.shortCode} vs ${config.teams.visitor.shortCode}`,
      format: form.value.format,
      localTeamProfileId: localProfile?.id,
      visitorTeamProfileId: visitorProfile?.id,
      config,
      state,
      statistics: undefined,
      overlay: undefined,
    })

    await loadData()
    localStorage.setItem(STORAGE_KEYS.LAST_MATCH_ID, session.id)
    await router.push(`/controller/${session.id}`)
  } catch (error) {
    status.value = `No se pudo crear el partido: ${(error as Error).message}`
  } finally {
    isCreating.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <BroadcastLayout>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-broadcast-text">Partidos</h1>
        <p class="text-sm text-broadcast-muted">
          Crea sesiones aisladas para que cada controller y overlay tenga su propio estado.
        </p>
      </div>
      <button class="admin-button" :disabled="isLoading" @click="loadData">
        <RefreshCw class="h-4 w-4" />
        Recargar
      </button>
    </div>

    <section class="admin-card mb-6 p-5">
      <div class="mb-5 flex items-center gap-2 border-b border-broadcast-outline pb-4">
        <Plus class="h-5 w-5 text-broadcast-accent" />
        <h2 class="text-lg font-semibold text-broadcast-text">Nuevo partido</h2>
      </div>

      <div class="grid gap-4 lg:grid-cols-[1fr_170px_1fr_1fr_auto]">
        <input
          v-model="form.title"
          class="admin-input"
          placeholder="Título opcional"
        />
        <select v-model.number="form.format" class="admin-input">
          <option :value="5">Mejor de 5</option>
          <option :value="3">Mejor de 3</option>
          <option :value="1">1 set</option>
        </select>
        <select v-model="form.localTeamProfileId" class="admin-input">
          <option value="">Local por defecto</option>
          <option v-for="team in teams" :key="team.id" :value="team.id">
            {{ team.shortCode }} · {{ team.name }}
          </option>
        </select>
        <select v-model="form.visitorTeamProfileId" class="admin-input">
          <option value="">Visitante por defecto</option>
          <option v-for="team in teams" :key="team.id" :value="team.id">
            {{ team.shortCode }} · {{ team.name }}
          </option>
        </select>
        <button class="admin-button" :disabled="isCreating" @click="createSession">
          {{ isCreating ? 'Creando...' : 'Crear' }}
        </button>
      </div>
      <p class="mt-3 text-sm font-semibold text-broadcast-muted">{{ status }}</p>
    </section>

    <section class="grid gap-4">
      <article
        v-for="session in activeSessions"
        :key="session.id"
        class="admin-card p-5"
      >
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div class="text-lg font-black text-broadcast-text">
              {{ session.title || `${session.config?.teams.local.shortCode} vs ${session.config?.teams.visitor.shortCode}` }}
            </div>
            <div class="mt-1 text-sm font-semibold text-broadcast-muted">
              {{ session.config?.teams.local.name || 'Local' }} vs
              {{ session.config?.teams.visitor.name || 'Visitante' }} ·
              {{ session.status }} · {{ session.format }} sets
            </div>
            <div class="mt-1 font-mono text-xs text-broadcast-muted">{{ session.id }}</div>
          </div>

          <div class="flex flex-wrap gap-2">
            <RouterLink class="admin-button" :to="`/controller/${session.id}`">
              <MonitorCog class="h-4 w-4" />
              Controller
            </RouterLink>
            <RouterLink class="admin-button" :to="`/settings/${session.id}`">
              <Settings class="h-4 w-4" />
              Config
            </RouterLink>
            <RouterLink class="admin-button" :to="`/overlay/${session.id}`" target="_blank">
              <Radio class="h-4 w-4" />
              Overlay
              <ExternalLink class="h-3 w-3" />
            </RouterLink>
            <RouterLink class="admin-button" :to="`/lineup/${session.id}`" target="_blank">
              <Users class="h-4 w-4" />
              Lineup
              <ExternalLink class="h-3 w-3" />
            </RouterLink>
          </div>
        </div>
      </article>

      <div
        v-if="!activeSessions.length && !isLoading"
        class="rounded border border-dashed border-broadcast-outline bg-broadcast-surface-low p-8 text-center text-broadcast-muted"
      >
        Todavía no hay partidos activos. Crea uno arriba para obtener sus enlaces aislados.
      </div>
    </section>
  </BroadcastLayout>
</template>
