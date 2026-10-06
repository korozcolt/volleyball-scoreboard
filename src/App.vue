<script setup lang="ts">
import { RouterView } from 'vue-router'
import AdminTokenGate from '@/components/common/AdminTokenGate.vue'
</script>

<template>
  <RouterView v-slot="{ Component }">
    <keep-alive include="SettingsView,ControllerView,MatchesView">
      <component :is="Component" />
    </keep-alive>
  </RouterView>
  <AdminTokenGate />
</template>
