<script setup lang="ts">
import { Upload } from 'lucide-vue-next'
import type { BroadcastTeamConfig, TeamSide } from '@/types/game.types'

defineProps<{
  team: BroadcastTeamConfig
  side: TeamSide
  label: string
}>()

const emit = defineEmits<{
  update: [team: TeamSide, changes: Partial<BroadcastTeamConfig>]
}>()
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
      <span class="rounded-full border border-broadcast-outline bg-broadcast-surface-high px-3 py-1 text-xs font-bold text-broadcast-muted">
        {{ side === 'local' ? 'Equipo A' : 'Equipo B' }}
      </span>
    </div>

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

    <div
      class="mt-4 flex cursor-default flex-col items-center justify-center rounded border-2 border-dashed border-broadcast-outline bg-broadcast-surface-high p-5 text-center"
    >
      <Upload class="mb-2 h-8 w-8 text-broadcast-muted" />
      <span class="text-sm font-bold text-broadcast-text">Pega una URL PNG/SVG transparente</span>
      <span class="mt-1 text-xs text-broadcast-muted">Carga local de archivos queda lista para una fase posterior.</span>
    </div>
  </section>
</template>
