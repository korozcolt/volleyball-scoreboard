<script setup lang="ts">
import BroadcastLayout from '@/components/layout/BroadcastLayout.vue'
import TeamConfigCard from '@/components/broadcast/TeamConfigCard.vue'
import type { BackgroundStyle, BroadcastTeamConfig, LowerThirdStyle, TeamSide } from '@/types/game.types'
import { useBroadcastConfigStore } from '@/stores/broadcastConfig'
import { useMatchStore } from '@/stores/match'

const broadcast = useBroadcastConfigStore()
const match = useMatchStore()

const updateTeam = (team: TeamSide, changes: Partial<BroadcastTeamConfig>) => {
  broadcast.updateTeam(team, changes)
}

const setBackground = (backgroundStyle: BackgroundStyle) => {
  broadcast.updateConfig({ backgroundStyle })
}

const setLowerThirdStyle = (lowerThirdStyle: LowerThirdStyle) => {
  broadcast.updateConfig({ lowerThirdStyle })
}
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
        @update="updateTeam"
      />
      <TeamConfigCard
        :team="broadcast.config.teams.visitor"
        side="visitor"
        label="Equipo visitante"
        @update="updateTeam"
      />
    </div>

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
