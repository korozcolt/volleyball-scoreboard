<script setup lang="ts">
import { Shield } from 'lucide-vue-next'
import type { Team } from '@/types/game.types'

defineProps<{ team: Team; small?: boolean }>()
</script>

<template>
  <div class="flag-tile" :class="{ 'flag-tile-sm': small }">
    <img v-if="team.logoUrl" :src="team.logoUrl" :alt="team.name" class="h-full w-full object-contain" />
    <Shield v-else class="h-8 w-8 text-white/80" />
  </div>
</template>
