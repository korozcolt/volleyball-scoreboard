<script setup lang="ts">
import { onMounted, ref } from 'vue'
import BroadcastLayout from '@/components/layout/BroadcastLayout.vue'
import TeamConfigCard from '@/components/broadcast/TeamConfigCard.vue'
import type { BackgroundStyle, BroadcastTeamConfig, LowerThirdStyle, TeamProfile, TeamSide } from '@/types/game.types'
import { libraryApi } from '@/services/libraryApi'
import { useBroadcastConfigStore } from '@/stores/broadcastConfig'
import { useMatchStore } from '@/stores/match'
import { useStatisticsStore } from '@/stores/statistics'

const broadcast = useBroadcastConfigStore()
const match = useMatchStore()
const statistics = useStatisticsStore()
const teamLibrary = ref<TeamProfile[]>([])
const libraryStatus = ref('')
const uploadingTeam = ref<TeamSide | null>(null)
const savingTeam = ref<TeamSide | null>(null)
const isArchiving = ref(false)

const updateTeam = (team: TeamSide, changes: Partial<BroadcastTeamConfig>) => {
  broadcast.updateTeam(team, changes)
}

const setBackground = (backgroundStyle: BackgroundStyle) => {
  broadcast.updateConfig({ backgroundStyle })
}

const setLowerThirdStyle = (lowerThirdStyle: LowerThirdStyle) => {
  broadcast.updateConfig({ lowerThirdStyle })
}

const loadTeamLibrary = async () => {
  try {
    teamLibrary.value = await libraryApi.listTeams()
    libraryStatus.value = teamLibrary.value.length
      ? `${teamLibrary.value.length} equipos guardados`
      : 'Biblioteca lista, sin equipos guardados'
  } catch (error) {
    libraryStatus.value = `Biblioteca no disponible: ${(error as Error).message}`
  }
}

const selectTeamProfile = (team: TeamSide, profileId: string) => {
  const profile = teamLibrary.value.find((item) => item.id === profileId)
  if (!profile) return
  updateTeam(team, {
    name: profile.name,
    shortCode: profile.shortCode,
    primaryColor: profile.primaryColor,
    logoUrl: profile.logoUrl,
  })
}

const saveTeamProfile = async (team: TeamSide) => {
  savingTeam.value = team
  try {
    const saved = await libraryApi.saveTeam(broadcast.config.teams[team])
    await loadTeamLibrary()
    libraryStatus.value = `Equipo guardado: ${saved.shortCode} · ${saved.name}`
  } catch (error) {
    libraryStatus.value = `No se pudo guardar el equipo: ${(error as Error).message}`
  } finally {
    savingTeam.value = null
  }
}

const uploadTeamLogo = async (team: TeamSide, file: File) => {
  uploadingTeam.value = team
  try {
    const asset = await libraryApi.uploadLogo(file)
    updateTeam(team, { logoUrl: asset.url })
    libraryStatus.value = `Logo optimizado y guardado (${Math.round(asset.size / 1024)} KB)`
  } catch (error) {
    libraryStatus.value = `No se pudo subir el logo: ${(error as Error).message}`
  } finally {
    uploadingTeam.value = null
  }
}

const archiveCurrentMatch = async () => {
  isArchiving.value = true
  try {
    const archived = await libraryApi.archiveMatch({
      gameState: match.getGameState(),
      statistics: statistics.state,
    })
    libraryStatus.value = `Partido guardado en histórico: ${archived.id}`
  } catch (error) {
    libraryStatus.value = `No se pudo guardar el partido: ${(error as Error).message}`
  } finally {
    isArchiving.value = false
  }
}

const setMatchFormat = (maxSets: 1 | 3 | 5) => {
  match.updateGameSettings({
    maxSets,
    pointsToWin: maxSets === 1 ? match.gameState.settings.pointsToWin : 25,
    decidingSetPoints: maxSets === 1 ? match.gameState.settings.pointsToWin : 15,
  })
}

const setPointsToWin = (pointsToWin: number) => {
  const sanitizedPoints = Math.max(1, Math.min(99, Number.isFinite(pointsToWin) ? pointsToWin : 25))
  match.updateGameSettings({
    pointsToWin: sanitizedPoints,
    decidingSetPoints:
      match.gameState.settings.maxSets === 1
        ? sanitizedPoints
        : match.gameState.settings.decidingSetPoints,
  })
}

const setDecidingSetPoints = (decidingSetPoints: number) => {
  match.updateGameSettings({
    decidingSetPoints: Math.max(1, Math.min(99, Number.isFinite(decidingSetPoints) ? decidingSetPoints : 15)),
  })
}

onMounted(loadTeamLibrary)
</script>

<template>
  <BroadcastLayout>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-broadcast-text">Configuración broadcast</h1>
        <p class="text-sm text-broadcast-muted">Equipos, assets globales y estilo de salida OBS.</p>
      </div>
      <button class="admin-button" @click="match.syncTeamsFromConfig">
        Guardar configuración
      </button>
    </div>

    <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <TeamConfigCard
        :team="broadcast.config.teams.local"
        side="local"
        label="Equipo local"
        :team-library="teamLibrary"
        :is-uploading="uploadingTeam === 'local'"
        :is-saving="savingTeam === 'local'"
        @update="updateTeam"
        @select-profile="selectTeamProfile"
        @save-profile="saveTeamProfile"
        @upload-logo="uploadTeamLogo"
      />
      <TeamConfigCard
        :team="broadcast.config.teams.visitor"
        side="visitor"
        label="Equipo visitante"
        :team-library="teamLibrary"
        :is-uploading="uploadingTeam === 'visitor'"
        :is-saving="savingTeam === 'visitor'"
        @update="updateTeam"
        @select-profile="selectTeamProfile"
        @save-profile="saveTeamProfile"
        @upload-logo="uploadTeamLogo"
      />
    </div>

    <section class="admin-card mt-6 p-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-broadcast-text">Persistencia</h2>
          <p class="text-sm text-broadcast-muted">
            {{ libraryStatus || 'Equipos, logos y partidos se guardan en el volumen persistente.' }}
          </p>
        </div>
        <div class="flex gap-2">
          <button class="admin-button" @click="loadTeamLibrary">
            Recargar biblioteca
          </button>
          <button class="admin-button" @click="archiveCurrentMatch" :disabled="isArchiving">
            {{ isArchiving ? 'Guardando...' : 'Guardar partido' }}
          </button>
        </div>
      </div>
    </section>

    <section class="admin-card mt-6 p-6">
      <div class="mb-6 border-b border-broadcast-outline pb-4">
        <h2 class="text-xl font-semibold text-broadcast-text">Formato del partido</h2>
        <p class="mt-1 text-sm text-broadcast-muted">
          Define la cantidad máxima de sets y la meta de puntos que usará el marcador.
        </p>
      </div>

      <div class="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div class="rounded border border-broadcast-outline bg-broadcast-surface-low p-4">
          <div class="mb-3 text-xs font-bold uppercase text-broadcast-muted">Cantidad máxima de sets</div>
          <div class="grid grid-cols-3 gap-3">
            <button
              v-for="format in ([1, 3, 5] as const)"
              :key="format"
              class="rounded border px-4 py-4 text-center transition"
              :class="
                match.gameState.settings.maxSets === format
                  ? 'border-broadcast-accent bg-broadcast-accent text-[#00354a]'
                  : 'border-broadcast-outline bg-broadcast-surface-high text-broadcast-text hover:border-broadcast-accent'
              "
              @click="setMatchFormat(format)"
            >
              <span class="block text-3xl font-black">{{ format }}</span>
              <span class="text-xs font-black uppercase">set{{ format > 1 ? 's' : '' }}</span>
            </button>
          </div>
        </div>

        <div class="grid gap-4 rounded border border-broadcast-outline bg-broadcast-surface-low p-4">
          <label>
            <span class="mb-2 block text-xs font-bold uppercase text-broadcast-muted">
              Puntos por set{{ match.gameState.settings.maxSets === 1 ? '' : ' regular' }}
            </span>
            <input
              class="admin-input"
              type="number"
              min="1"
              max="99"
              :value="match.gameState.settings.pointsToWin"
              @change="setPointsToWin(Number(($event.target as HTMLInputElement).value))"
            />
          </label>
          <label v-if="match.gameState.settings.maxSets > 1">
            <span class="mb-2 block text-xs font-bold uppercase text-broadcast-muted">
              Puntos del set decisivo
            </span>
            <input
              class="admin-input"
              type="number"
              min="1"
              max="99"
              :value="match.gameState.settings.decidingSetPoints"
              @change="setDecidingSetPoints(Number(($event.target as HTMLInputElement).value))"
            />
          </label>
          <div class="rounded border border-broadcast-outline bg-broadcast-surface px-3 py-2 text-sm font-semibold text-broadcast-muted">
            {{
              match.gameState.settings.maxSets === 1
                ? `Partido a 1 set de ${match.gameState.settings.pointsToWin} puntos.`
                : `Mejor de ${match.gameState.settings.maxSets}: sets regulares a ${match.gameState.settings.pointsToWin}, set decisivo a ${match.gameState.settings.decidingSetPoints}.`
            }}
          </div>
        </div>
      </div>
    </section>

    <section class="admin-card mt-6 p-6">
      <div class="mb-6 border-b border-broadcast-outline pb-4">
        <h2 class="text-xl font-semibold text-broadcast-text">Torneo y assets globales</h2>
      </div>

      <div class="grid gap-8 lg:grid-cols-2">
        <div class="grid gap-4">
          <label>
            <span class="mb-2 block text-xs font-bold uppercase text-broadcast-muted">Torneo</span>
            <input
              class="admin-input"
              :value="broadcast.config.tournament"
              @input="broadcast.updateConfig({ tournament: ($event.target as HTMLInputElement).value })"
            />
          </label>
          <label>
            <span class="mb-2 block text-xs font-bold uppercase text-broadcast-muted">Fase / ronda</span>
            <input
              class="admin-input"
              :value="broadcast.config.phase"
              @input="broadcast.updateConfig({ phase: ($event.target as HTMLInputElement).value })"
            />
          </label>
          <label>
            <span class="mb-2 block text-xs font-bold uppercase text-broadcast-muted">Cancha</span>
            <input
              class="admin-input"
              :value="broadcast.config.court"
              @input="broadcast.updateConfig({ court: ($event.target as HTMLInputElement).value })"
            />
          </label>

          <div class="rounded border border-broadcast-outline bg-broadcast-surface-low p-4">
            <div class="mb-3 text-xs font-bold uppercase text-broadcast-muted">
              Estilo de fondo broadcast
            </div>
            <div class="grid grid-cols-3 gap-3">
              <button
                class="relative h-20 overflow-hidden rounded border"
                :class="
                  broadcast.config.backgroundStyle === 'classic-dark'
                    ? 'border-broadcast-accent'
                    : 'border-broadcast-outline'
                "
                @click="setBackground('classic-dark')"
              >
                <span class="absolute inset-0 bg-gradient-to-br from-[#0f172a] to-[#031427]"></span>
                <span class="relative text-xs font-bold text-white">Clásico</span>
              </button>
              <button
                class="relative h-20 overflow-hidden rounded border"
                :class="
                  broadcast.config.backgroundStyle === 'steel-blue'
                    ? 'border-broadcast-accent'
                    : 'border-broadcast-outline'
                "
                @click="setBackground('steel-blue')"
              >
                <span class="absolute inset-0 bg-gradient-to-br from-[#1b2b3f] to-[#26364a]"></span>
                <span class="relative text-xs font-bold text-white">Acero</span>
              </button>
              <button
                class="h-20 rounded border border-broadcast-outline bg-broadcast-surface-high text-xs font-bold text-broadcast-muted"
                @click="setBackground('custom')"
              >
                Custom
              </button>
            </div>
          </div>
        </div>

        <div class="grid content-start gap-4">
          <label>
            <span class="mb-2 block text-xs font-bold uppercase text-broadcast-muted">Logo liga / torneo URL</span>
            <input
              class="admin-input"
              :value="broadcast.config.leagueLogoUrl"
              placeholder="https://..."
              @input="broadcast.updateConfig({ leagueLogoUrl: ($event.target as HTMLInputElement).value })"
            />
          </label>
          <label>
            <span class="mb-2 block text-xs font-bold uppercase text-broadcast-muted">Sponsor top-right URL</span>
            <input
              class="admin-input"
              :value="broadcast.config.sponsorLogoUrl"
              placeholder="https://..."
              @input="broadcast.updateConfig({ sponsorLogoUrl: ($event.target as HTMLInputElement).value })"
            />
          </label>
          <label>
            <span class="mb-2 block text-xs font-bold uppercase text-broadcast-muted">Lower thirds</span>
            <select
              class="admin-input"
              :value="broadcast.config.lowerThirdStyle"
              @change="setLowerThirdStyle(($event.target as HTMLSelectElement).value as LowerThirdStyle)"
            >
              <option value="glass">Glassmorphism</option>
              <option value="solid-dark">Sólido oscuro</option>
              <option value="high-contrast">Alto contraste</option>
            </select>
          </label>
        </div>
      </div>
    </section>
  </BroadcastLayout>
</template>
