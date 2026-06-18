<script setup lang="ts">
import { MonitorCog, Radio, Settings } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
</script>

<template>
  <main class="min-h-screen bg-broadcast-background px-6 py-10 text-broadcast-text">
    <section class="mx-auto max-w-5xl">
      <div class="mb-10">
        <p class="mb-3 text-sm font-black uppercase tracking-widest text-broadcast-accent">
          VolleyStream
        </p>
        <h1 class="text-4xl font-black">Broadcast Dashboard</h1>
        <p class="mt-3 max-w-2xl text-broadcast-muted">
          Control local-first para marcador, configuración visual y overlay OBS de volleyball.
        </p>
      </div>

      <div class="grid gap-4 md:grid-cols-3">
        <RouterLink class="admin-card block p-6 transition hover:border-broadcast-accent" to="/matches">
          <MonitorCog class="mb-5 h-8 w-8 text-broadcast-accent" />
          <h2 class="text-xl font-bold">Panel de partido</h2>
          <p class="mt-2 text-sm text-broadcast-muted">Puntaje, saque, timeouts, preview e historial.</p>
        </RouterLink>
        <RouterLink class="admin-card block p-6 transition hover:border-broadcast-accent" to="/matches">
          <Settings class="mb-5 h-8 w-8 text-broadcast-accent" />
          <h2 class="text-xl font-bold">Configuración</h2>
          <p class="mt-2 text-sm text-broadcast-muted">Equipos, colores, códigos, logos y torneo.</p>
        </RouterLink>
        <RouterLink
          class="admin-card block p-6 transition hover:border-broadcast-accent"
          to="/matches"
        >
          <Radio class="mb-5 h-8 w-8 text-broadcast-accent" />
          <h2 class="text-xl font-bold">Overlay OBS</h2>
          <p class="mt-2 text-sm text-broadcast-muted">Salida transparente lista para fuente navegador.</p>
        </RouterLink>
      </div>
    </section>
  </main>
</template>
