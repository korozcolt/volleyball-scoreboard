<script setup lang="ts">
import { BarChart3, CircleHelp, LogOut, Radio, Settings, Trophy, Users } from 'lucide-vue-next'
import { RouterLink, useRoute } from 'vue-router'
import { useBroadcastConfigStore } from '@/stores/broadcastConfig'
import { useOverlayControlStore } from '@/stores/overlayControl'

const route = useRoute()
const broadcast = useBroadcastConfigStore()
const overlay = useOverlayControlStore()

const navItems = [
  { to: '/controller', label: 'Partido', icon: Trophy },
  { to: '/statistics', label: 'Estadísticas', icon: BarChart3 },
  { to: '/settings', label: 'Equipos', icon: Users },
  { to: '/settings', label: 'Configuración', icon: Settings },
]
</script>

<template>
  <div class="min-h-screen bg-broadcast-background text-broadcast-text">
    <header
      class="sticky top-0 z-40 mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between border-b border-broadcast-outline bg-broadcast-background/95 px-6 backdrop-blur lg:px-12"
    >
      <div class="flex items-center gap-8">
        <RouterLink to="/controller" class="text-xl font-bold text-broadcast-accent">
          ProVolley Live
        </RouterLink>
        <nav class="hidden items-center gap-6 md:flex">
          <RouterLink
            to="/controller"
            class="border-b-2 pb-1 text-sm font-semibold transition"
            :class="
              route.path === '/controller'
                ? 'border-broadcast-text text-broadcast-text'
                : 'border-transparent text-broadcast-muted hover:text-broadcast-text'
            "
          >
            Dashboard
          </RouterLink>
          <RouterLink
            to="/overlay"
            target="_blank"
            class="border-b-2 border-transparent pb-1 text-sm font-semibold text-broadcast-muted transition hover:text-broadcast-text"
          >
            Overlay OBS
          </RouterLink>
          <RouterLink
            to="/settings"
            class="border-b-2 pb-1 text-sm font-semibold transition"
            :class="
              route.path === '/settings'
                ? 'border-broadcast-text text-broadcast-text'
                : 'border-transparent text-broadcast-muted hover:text-broadcast-text'
            "
          >
            Configuración
          </RouterLink>
        </nav>
      </div>

      <button
        class="inline-flex items-center gap-2 rounded bg-broadcast-accent px-4 py-2 text-sm font-bold text-[#00354a] shadow-[0_0_15px_rgba(123,208,255,0.28)] transition hover:bg-[#c4e7ff]"
        @click="overlay.setLive(!overlay.state.isLive)"
      >
        <Radio class="h-4 w-4" />
        {{ overlay.state.isLive ? 'En vivo' : 'Ir en vivo' }}
      </button>
    </header>

    <div class="mx-auto flex max-w-[1440px]">
      <aside
        class="hidden h-[calc(100vh-64px)] w-[280px] shrink-0 flex-col gap-2 overflow-y-auto border-r border-broadcast-outline bg-broadcast-surface-low p-4 md:flex"
      >
        <div class="mb-4 flex items-center gap-3 px-2">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-full border border-broadcast-outline bg-broadcast-surface-high"
          >
            <Radio class="h-5 w-5 text-broadcast-muted" />
          </div>
          <div>
            <h2 class="text-sm font-semibold leading-tight text-broadcast-text">
              {{ broadcast.config.court }}
            </h2>
            <p class="flex items-center gap-2 text-xs font-medium text-broadcast-alert">
              <span class="h-2 w-2 rounded-full bg-broadcast-alert broadcast-pulse"></span>
              Transmisión {{ overlay.state.isLive ? 'en vivo' : 'lista' }}
            </p>
          </div>
        </div>

        <RouterLink
          v-for="item in navItems"
          :key="item.label"
          :to="item.to"
          class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition"
          :class="
            route.path === item.to
              ? 'translate-x-1 bg-broadcast-accent text-[#00354a]'
              : 'text-broadcast-muted hover:bg-broadcast-surface-high hover:text-broadcast-text'
          "
        >
          <component :is="item.icon" class="h-4 w-4" />
          {{ item.label }}
        </RouterLink>

        <div class="mt-auto border-t border-broadcast-outline pt-4">
          <a
            class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-broadcast-muted"
            href="#"
          >
            <CircleHelp class="h-4 w-4" />
            Ayuda
          </a>
          <a
            class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-broadcast-danger"
            href="#"
          >
            <LogOut class="h-4 w-4" />
            Salir
          </a>
        </div>
      </aside>

      <main class="min-w-0 flex-1 p-4 md:h-[calc(100vh-64px)] md:overflow-y-auto md:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
