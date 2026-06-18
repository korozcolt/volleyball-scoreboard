<script setup lang="ts">
import { Database, Save, Upload } from 'lucide-vue-next'
import type { BroadcastTeamConfig, TeamProfile, TeamSide } from '@/types/game.types'

defineProps<{
  team: BroadcastTeamConfig
  side: TeamSide
  label: string
  teamLibrary?: TeamProfile[]
  activeProfileId?: string
  isUploading?: boolean
  isSaving?: boolean
}>()

const emit = defineEmits<{
  update: [team: TeamSide, changes: Partial<BroadcastTeamConfig>]
  selectProfile: [team: TeamSide, profileId: string]
  saveProfile: [team: TeamSide]
  uploadLogo: [team: TeamSide, file: File]
}>()

const onFileChange = (side: TeamSide, event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) emit('uploadLogo', side, file)
  input.value = ''
}
</script>

<template>
  <section class="admin-card relative overflow-hidden p-6">
    <div
      class="absolute bottom-0 top-0 w-1"
      :class="side === 'local' ? 'left-0' : 'right-0'"
      :style="{ backgroundColor: team.primaryColor }"
    ></div>
    <div class="mb-6 flex items-center justify-between border-b border-broadcast-outline pb-4">
      <h3 class="text-xl font-semibold text-broadcast-text">{{ label }}</h3>
      <button
        class="admin-button"
        type="button"
        @click="emit('saveProfile', side)"
        :disabled="isSaving"
      >
        <Save class="h-4 w-4" />
        {{ isSaving ? 'Guardando' : 'Guardar equipo' }}
      </button>
    </div>

    <label class="mb-4 block">
      <span class="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-broadcast-muted">
        <Database class="h-3.5 w-3.5" />
        Biblioteca de equipos
      </span>
      <select
        class="admin-input"
        :value="activeProfileId"
        @change="emit('selectProfile', side, ($event.target as HTMLSelectElement).value)"
      >
        <option value="">Seleccionar equipo guardado...</option>
        <option v-for="profile in teamLibrary" :key="profile.id" :value="profile.id">
          {{ profile.shortCode }} · {{ profile.name }}
        </option>
      </select>
    </label>

    <div class="grid grid-cols-3 gap-4">
      <label class="col-span-2">
        <span class="mb-2 block text-xs font-bold uppercase text-broadcast-muted">Nombre</span>
        <input
          class="admin-input"
          :value="team.name"
          placeholder="Nombre del equipo"
          @input="emit('update', side, { name: ($event.target as HTMLInputElement).value })"
        />
      </label>
      <label>
        <span class="mb-2 block text-xs font-bold uppercase text-broadcast-muted">Código</span>
        <input
          class="admin-input text-center font-black uppercase"
          maxlength="4"
          :value="team.shortCode"
          placeholder="ABC"
          @input="emit('update', side, { shortCode: ($event.target as HTMLInputElement).value })"
        />
      </label>
    </div>

    <label class="mt-4 block">
      <span class="mb-2 block text-xs font-bold uppercase text-broadcast-muted">Color principal</span>
      <div class="flex gap-3">
        <input
          class="h-10 w-12 rounded border border-broadcast-outline bg-transparent p-1"
          type="color"
          :value="team.primaryColor"
          @input="emit('update', side, { primaryColor: ($event.target as HTMLInputElement).value })"
        />
        <input
          class="admin-input font-mono"
          :value="team.primaryColor"
          placeholder="#00A6E0"
          @input="emit('update', side, { primaryColor: ($event.target as HTMLInputElement).value })"
        />
      </div>
    </label>

    <label class="mt-4 block">
      <span class="mb-2 block text-xs font-bold uppercase text-broadcast-muted">Logo / bandera URL</span>
      <input
        class="admin-input"
        :value="team.logoUrl"
        placeholder="https://..."
        @input="emit('update', side, { logoUrl: ($event.target as HTMLInputElement).value })"
      />
    </label>

    <label
      class="mt-4 flex cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed border-broadcast-outline bg-broadcast-surface-high p-5 text-center transition hover:border-broadcast-accent"
    >
      <Upload class="mb-2 h-8 w-8 text-broadcast-muted" />
      <span class="text-sm font-bold text-broadcast-text">
        {{ isUploading ? 'Procesando logo...' : 'Subir logo local' }}
      </span>
      <span class="mt-1 text-xs text-broadcast-muted">
        PNG/JPG/WebP se comprime a WebP. SVG se conserva como vector.
      </span>
      <input
        class="hidden"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        :disabled="isUploading"
        @change="onFileChange(side, $event)"
      />
    </label>
  </section>
</template>
