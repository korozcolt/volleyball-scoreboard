<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <RouterView v-slot="{ Component }">
    <keep-alive include="SettingsView,ControllerView,MatchesView">
      <component :is="Component" />
    </keep-alive>
  </RouterView>
</template>
