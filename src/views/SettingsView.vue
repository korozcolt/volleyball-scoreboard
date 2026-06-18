<script setup lang="ts">
defineOptions({ name: 'SettingsView' })
import { computed, onMounted, ref } from 'vue'
import { AlertTriangle, CheckCircle2, Info } from 'lucide-vue-next'
import BroadcastLayout from '@/components/layout/BroadcastLayout.vue'
import TeamConfigCard from '@/components/broadcast/TeamConfigCard.vue'
import { useMatchScope } from '@/composables/useMatchScope'
import type { BackgroundStyle, BroadcastTeamConfig, LowerThirdStyle, TeamPlayer, TeamProfile, TeamSide } from '@/types/game.types'
import { libraryApi } from '@/services/libraryApi'
import { useBroadcastConfigStore } from '@/stores/broadcastConfig'
import { useMatchStore } from '@/stores/match'
import { useStatisticsStore } from '@/stores/statistics'

const broadcast = useBroadcastConfigStore()
const match = useMatchStore()
const statistics = useStatisticsStore()
const scope = useMatchScope()
const teamLibrary = ref<TeamProfile[]>([])
const libraryStatus = ref('')
const uploadingTeam = ref<TeamSide | null>(null)
const savingTeam = ref<TeamSide | null>(null)
const isArchiving = ref(false)
const activeProfileIds = ref<Record<TeamSide, string>>({ local: '', visitor: '' })
const playerDrafts = ref<Record<TeamSide, { number: number; name: string; isLibero: boolean; role?: string; active?: boolean }>>({
  local: { number: 1, name: '', isLibero: false, role: '' },
  visitor: { number: 1, name: '', isLibero: false, role: '' },
})
const saveNotice = ref<{
  type: 'success' | 'warning' | 'error' | 'info'
  message: string
} | null>(null)
let noticeTimer: number | undefined

const notify = (message: string, type: 'success' | 'warning' | 'error' | 'info' = 'success') => {
  saveNotice.value = { message, type }
  libraryStatus.value = message

  if (noticeTimer) window.clearTimeout(noticeTimer)
  noticeTimer = window.setTimeout(() => {
    saveNotice.value = null
  }, 5200)
}

const updateTeam = (team: TeamSide, changes: Partial<BroadcastTeamConfig>) => {
  broadcast.updateTeam(team, changes)
}

const rosterBySide = computed<Record<TeamSide, TeamPlayer[]>>(() => ({
  local: teamLibrary.value.find((team) => team.id === activeProfileIds.value.local)?.players ?? [],
  visitor: teamLibrary.value.find((team) => team.id === activeProfileIds.value.visitor)?.players ?? [],
}))

const applyConfigToCurrentMatch = () => {
  const applied = match.syncTeamsFromConfig()
  notify(
    applied
      ? 'Configuración aplicada al partido actual.'
      : 'El partido actual ya tiene progreso. La configuración quedó guardada para el próximo partido.',
    applied ? 'success' : 'warning',
  )
}

const setBackground = (backgroundStyle: BackgroundStyle) => {
  broadcast.updateConfig({ backgroundStyle })
}

const setLowerThirdStyle = (lowerThirdStyle: LowerThirdStyle) => {
  broadcast.updateConfig({ lowerThirdStyle })
}

const loadTeamLibrary = async (showNotice = true) => {
  try {
    teamLibrary.value = await libraryApi.listTeams()
    const message = teamLibrary.value.length
      ? `${teamLibrary.value.length} equipos guardados.`
      : 'Biblioteca lista, sin equipos guardados.'
    libraryStatus.value = message
    if (showNotice) notify(message, 'info')
  } catch (error) {
    const message = `Biblioteca no disponible: ${(error as Error).message}`
    libraryStatus.value = message
    if (showNotice) notify(message, 'error')
  }
}

const selectTeamProfile = (team: TeamSide, profileId: string) => {
  const profile = teamLibrary.value.find((item) => item.id === profileId)
  if (!profile) return
  activeProfileIds.value[team] = profile.id
  updateTeam(team, {
    name: profile.name,
    shortCode: profile.shortCode,
    primaryColor: profile.primaryColor,
    logoUrl: profile.logoUrl,
  })
  notify(`${profile.shortCode} cargado en ${team === 'local' ? 'equipo local' : 'equipo visitante'}.`, 'success')
}

const saveTeamProfile = async (team: TeamSide) => {
  savingTeam.value = team
  try {
    const saved = await libraryApi.saveTeam(broadcast.config.teams[team])
    activeProfileIds.value[team] = saved.id
    await loadTeamLibrary(false)
    notify(`Equipo guardado: ${saved.shortCode} · ${saved.name}`, 'success')
  } catch (error) {
    notify(`No se pudo guardar el equipo: ${(error as Error).message}`, 'error')
  } finally {
    savingTeam.value = null
  }
}

const savePlayer = async (team: TeamSide, existing?: TeamPlayer) => {
  const profileId = activeProfileIds.value[team]
  if (!profileId) {
    notify('Guarda o selecciona primero un equipo de la biblioteca.', 'warning')
    return
  }

    const draft = existing
      ? { number: existing.number, name: existing.name, active: existing.active, id: existing.id, isLibero: existing.isLibero, role: existing.role }
      : playerDrafts.value[team]

    try {
      await libraryApi.savePlayer(profileId, {
        id: existing?.id,
        number: Math.max(0, Math.min(99, Number(draft.number) || 0)),
        name: draft.name.trim() || `Jugador ${draft.number}`,
        active: draft.active !== undefined ? draft.active : true,
        isLibero: draft.isLibero || false,
        role: draft.role || undefined,
      })
      
      if (!existing) playerDrafts.value[team] = { number: Math.min(99, playerDrafts.value[team].number + 1), name: '', isLibero: false, role: '' }
      await loadTeamLibrary(false)
    notify('Jugador guardado en el roster.', 'success')
  } catch (error) {
    notify(`No se pudo guardar el jugador: ${(error as Error).message}`, 'error')
  }
}

const deletePlayer = async (team: TeamSide, player: TeamPlayer) => {
  const profileId = activeProfileIds.value[team]
  if (!profileId) return
  try {
    await libraryApi.deletePlayer(profileId, player.id)
    await loadTeamLibrary(false)
    notify(`Jugador #${player.number} eliminado del roster.`, 'success')
  } catch (error) {
    notify(`No se pudo eliminar el jugador: ${(error as Error).message}`, 'error')
  }
}

const applyRosterToMatch = (team: TeamSide) => {
  const roster = rosterBySide.value[team].map((player, index) => ({
    id: `${team}-${player.number}`,
    teamPlayerId: player.id,
    number: player.number,
    name: player.name,
    position: index + 1,
    active: player.active,
    isLibero: player.isLibero,
    role: player.role,
  }))
  match.setTeamRoster(team, roster)
  notify(`Roster aplicado a ${team === 'local' ? 'equipo local' : 'equipo visitante'}.`, 'success')
}

const uploadTeamLogo = async (team: TeamSide, file: File) => {
  uploadingTeam.value = team
  try {
    const asset = await libraryApi.uploadLogo(file)
    updateTeam(team, { logoUrl: asset.url })
    notify(`Logo optimizado y guardado (${Math.round(asset.size / 1024)} KB).`, 'success')
  } catch (error) {
    notify(`No se pudo subir el logo: ${(error as Error).message}`, 'error')
  } finally {
    uploadingTeam.value = null
  }
}

const archiveCurrentMatch = async () => {
  isArchiving.value = true
  try {
    const archived = await libraryApi.archiveMatch({
      matchId: scope.matchId.value,
      gameState: match.getGameState(),
      statistics: statistics.state,
    })
    notify(`Partido guardado en histórico: ${archived.id}`, 'success')
  } catch (error) {
    notify(`No se pudo guardar el partido: ${(error as Error).message}`, 'error')
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

onMounted(async () => {
  await loadTeamLibrary(false)
  const setProfileIfMatch = (team: TeamSide) => {
    const configTeam = broadcast.config.teams[team]
    const profile = teamLibrary.value.find(
      p => p.shortCode === configTeam.shortCode && p.name === configTeam.name
    )
    if (profile) activeProfileIds.value[team] = profile.id
  }
  setProfileIfMatch('local')
  setProfileIfMatch('visitor')
})
</script>

<template>
  <BroadcastLayout>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-broadcast-text">Configuración broadcast</h1>
        <p class="text-sm text-broadcast-muted">Equipos, assets globales y estilo de salida OBS.</p>
      </div>
      <button class="admin-button" @click="applyConfigToCurrentMatch">
        Guardar configuración
      </button>
    </div>

    <div
      v-if="saveNotice"
      class="mb-6 flex items-start gap-3 rounded border px-4 py-3 shadow-[0_14px_30px_rgba(0,0,0,0.22)]"
      :class="{
        'border-broadcast-accent bg-broadcast-accent/12 text-broadcast-accent': saveNotice.type === 'success',
        'border-broadcast-alert bg-broadcast-alert/12 text-broadcast-alert': saveNotice.type === 'warning',
        'border-broadcast-danger bg-broadcast-danger/12 text-broadcast-danger': saveNotice.type === 'error',
        'border-broadcast-outline bg-broadcast-surface-high text-broadcast-text': saveNotice.type === 'info',
      }"
      role="status"
      aria-live="polite"
    >
      <CheckCircle2 v-if="saveNotice.type === 'success'" class="mt-0.5 h-5 w-5 shrink-0" />
      <AlertTriangle v-else-if="saveNotice.type === 'warning' || saveNotice.type === 'error'" class="mt-0.5 h-5 w-5 shrink-0" />
      <Info v-else class="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <div class="text-sm font-black uppercase tracking-wide">
          {{
            saveNotice.type === 'success'
              ? 'Guardado'
              : saveNotice.type === 'warning'
                ? 'Atención'
                : saveNotice.type === 'error'
                  ? 'No guardado'
                  : 'Estado'
          }}
        </div>
        <div class="text-sm font-semibold text-broadcast-text">{{ saveNotice.message }}</div>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <TeamConfigCard
        :team="broadcast.config.teams.local"
        side="local"
        label="Equipo local"
        :team-library="teamLibrary"
        :active-profile-id="activeProfileIds.local || ''"
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
        :active-profile-id="activeProfileIds.visitor || ''"
        :is-uploading="uploadingTeam === 'visitor'"
        :is-saving="savingTeam === 'visitor'"
        @update="updateTeam"
        @select-profile="selectTeamProfile"
        @save-profile="saveTeamProfile"
        @upload-logo="uploadTeamLogo"
      />
    </div>

    <section class="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
      <div
        v-for="side in (['local', 'visitor'] as const)"
        :key="side"
        class="admin-card p-5"
      >
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-broadcast-outline pb-4">
          <div>
            <h2 class="text-lg font-semibold text-broadcast-text">
              Roster {{ side === 'local' ? 'local' : 'visitante' }}
            </h2>
            <p class="text-sm text-broadcast-muted">
              {{ activeProfileIds[side] ? 'Jugadores guardados para reutilizar este equipo.' : 'Selecciona o guarda un equipo para editar jugadores.' }}
            </p>
          </div>
          <button
            class="admin-button"
            type="button"
            :disabled="!activeProfileIds[side] || rosterBySide[side].length < 6"
            @click="applyRosterToMatch(side)"
          >
            Aplicar al partido
          </button>
        </div>

        <div class="mb-4 grid grid-cols-[90px_1fr_auto] gap-2">
          <input
            v-model.number="playerDrafts[side].number"
            class="admin-input text-center font-black"
            type="number"
            min="1"
            max="99"
            placeholder="#"
            :disabled="!activeProfileIds[side]"
          />
          <input
            v-model="playerDrafts[side].name"
            class="admin-input"
            placeholder="Nombre del jugador"
            :disabled="!activeProfileIds[side]"
          />
          <select
            v-model="playerDrafts[side].role"
            class="admin-input h-full"
            :disabled="!activeProfileIds[side]"
          >
            <option value="">Posición (Opcional)</option>
            <option value="S">Armador (S)</option>
            <option value="OH">Punta (OH)</option>
            <option value="MB">Central (MB)</option>
            <option value="OPP">Opuesto (OPP)</option>
            <option value="L">Líbero (L)</option>
            <option value="DS">Defensa (DS)</option>
          </select>
          <button class="admin-button" :disabled="!activeProfileIds[side]" @click="savePlayer(side)">
            Agregar
          </button>
        </div>

        <div class="mb-4 flex items-center gap-2">
          <label class="flex cursor-pointer items-center gap-2" :class="{ 'opacity-50': !activeProfileIds[side] }">
            <input
              v-model="playerDrafts[side].isLibero"
              type="checkbox"
              class="rounded border-broadcast-outline bg-transparent"
              :disabled="!activeProfileIds[side]"
            />
            <span class="text-xs font-semibold text-broadcast-muted">Jugador es Líbero (L)</span>
          </label>
        </div>

        <div class="grid gap-2">
          <div
            v-for="player in rosterBySide[side]"
            :key="player.id"
            class="grid grid-cols-[76px_1fr_120px_auto_auto_auto] items-center gap-2 rounded border border-broadcast-outline bg-broadcast-surface-high p-2"
          >
            <input
              class="admin-input text-center font-black"
              type="number"
              min="1"
              max="99"
              :value="player.number"
              @change="savePlayer(side, { ...player, number: Number(($event.target as HTMLInputElement).value) })"
            />
            <input
              v-model="player.name"
              class="admin-input h-8 text-sm"
              placeholder="Nombre"
              @blur="savePlayer(side, player)"
              @keydown.enter="($event.target as HTMLInputElement).blur()"
            />
            
            <select
              class="admin-input h-8 text-[10px] uppercase font-bold"
              :value="player.role ?? ''"
              @change="savePlayer(side, { ...player, role: ($event.target as HTMLSelectElement).value })"
            >
              <option value="">---</option>
              <option value="S">Armador</option>
              <option value="OH">Punta</option>
              <option value="MB">Central</option>
              <option value="OPP">Opuesto</option>
              <option value="L">Líbero</option>
              <option value="DS">Defensa</option>
            </select>

            <button
              class="flex items-center justify-center rounded px-2 py-1 text-[10px] font-black uppercase tracking-wider transition-colors"
              :class="player.isLibero ? 'bg-[#ffcf4a]/20 text-[#ffcf4a]' : 'bg-broadcast-surface text-broadcast-muted hover:bg-broadcast-surface-low hover:text-white'"
              @click="player.isLibero = !player.isLibero; savePlayer(side, player)"
            >
              Líbero
            </button>

            <button
              class="flex h-8 w-8 items-center justify-center rounded transition-colors"
              @click="savePlayer(side, { ...player, active: !player.active })"
            >
              {{ player.active ? 'Activo' : 'Inactivo' }}
            </button>
            <button class="admin-button-danger" @click="deletePlayer(side, player)">
              Borrar
            </button>
          </div>
          <div
            v-if="activeProfileIds[side] && !rosterBySide[side].length"
            class="rounded border border-dashed border-broadcast-outline p-4 text-center text-sm text-broadcast-muted"
          >
            Este equipo todavía no tiene jugadores guardados.
          </div>
        </div>
      </div>
    </section>

    <section class="admin-card mt-6 p-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-broadcast-text">Persistencia</h2>
          <p class="text-sm text-broadcast-muted">
            {{ libraryStatus || 'Equipos, logos y partidos se guardan en el volumen persistente.' }}
          </p>
        </div>
        <div class="flex gap-2">
          <button class="admin-button" @click="() => loadTeamLibrary()">
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
