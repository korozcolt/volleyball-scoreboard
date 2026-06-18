<script setup lang="ts">
import { BarChart3, CircleHelp, ExternalLink, LogOut, Menu, MonitorCog, Radio, Settings, Trophy, Users, X } from 'lucide-vue-next'
import { RouterLink, useRoute } from 'vue-router'
import { computed, ref } from 'vue'
import { useBroadcastConfigStore } from '@/stores/broadcastConfig'
import { useOverlayControlStore } from '@/stores/overlayControl'

const route = useRoute()
const broadcast = useBroadcastConfigStore()
const overlay = useOverlayControlStore()
const sidebarCollapsed = ref(false)
const mobileMenuOpen = ref(false)
const matchId = computed(() => {
  const param = route.params.matchId
  return Array.isArray(param) ? param[0] : param
})
const scopedPath = (base: string) => (matchId.value ? `${base}/${matchId.value}` : '/matches')
const isActive = (to: string) =>
  to === '/matches' ? route.path === '/matches' : route.path.startsWith(to.split('/').slice(0, 2).join('/'))

const navItems = computed(() => [
  { to: '/matches', label: 'Partidos', icon: Trophy, external: false },
  { to: scopedPath('/controller'), label: 'Partido', icon: MonitorCog, external: false },
  { to: scopedPath('/statistics'), label: 'Estadísticas', icon: BarChart3, external: false },
  { to: scopedPath('/settings'), label: 'Configuración', icon: Settings, external: false },
  { to: scopedPath('/overlay'), label: 'Overlay OBS', icon: Radio, external: true },
  { to: scopedPath('/lineup'), label: 'Lineup OBS', icon: Users, external: true },
])
</script>

<template>
  <div class="min-h-screen bg-broadcast-background text-broadcast-text">
    <header
      class="sticky top-0 z-40 mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between border-b border-broadcast-outline bg-broadcast-background/95 px-6 backdrop-blur lg:px-12"
    >
      <div class="flex items-center gap-8">
        <button
          class="inline-flex h-10 w-10 items-center justify-center rounded border border-broadcast-outline bg-broadcast-surface-high text-broadcast-text transition hover:bg-broadcast-surface-highest md:hidden"
          type="button"
          aria-label="Abrir menú"
          @click="mobileMenuOpen = true"
        >
          <Menu class="h-5 w-5" />
        </button>
        <RouterLink to="/matches" class="text-xl font-bold text-broadcast-accent">
          ProVolley Live
        </RouterLink>
        <nav class="hidden items-center gap-6 md:flex">
          <RouterLink
            :to="scopedPath('/controller')"
            class="border-b-2 pb-1 text-sm font-semibold transition"
            :class="
              route.path.startsWith('/controller')
                ? 'border-broadcast-text text-broadcast-text'
                : 'border-transparent text-broadcast-muted hover:text-broadcast-text'
            "
          >
            Dashboard
          </RouterLink>
          <RouterLink
            :to="scopedPath('/overlay')"
            target="_blank"
            class="border-b-2 border-transparent pb-1 text-sm font-semibold text-broadcast-muted transition hover:text-broadcast-text"
          >
            Overlay OBS
          </RouterLink>
          <RouterLink
            :to="scopedPath('/settings')"
            class="border-b-2 pb-1 text-sm font-semibold transition"
            :class="
              route.path.startsWith('/settings')
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
        class="hidden h-[calc(100vh-64px)] shrink-0 flex-col gap-2 overflow-y-auto border-r border-broadcast-outline bg-broadcast-surface-low p-4 transition-[width] duration-200 md:flex"
        :class="sidebarCollapsed ? 'w-[76px]' : 'w-[280px]'"
      >
        <button
          class="mb-2 flex h-10 items-center justify-center rounded border border-broadcast-outline bg-broadcast-surface-high text-broadcast-muted transition hover:text-broadcast-text"
          type="button"
          :aria-label="sidebarCollapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'"
          @click="sidebarCollapsed = !sidebarCollapsed"
        >
          <Menu v-if="sidebarCollapsed" class="h-5 w-5" />
          <X v-else class="h-5 w-5" />
        </button>

        <div
          class="mb-4 flex items-center gap-3 px-2"
          :class="sidebarCollapsed ? 'justify-center px-0' : ''"
        >
          <div
            class="flex h-10 w-10 items-center justify-center rounded-full border border-broadcast-outline bg-broadcast-surface-high"
          >
            <Radio class="h-5 w-5 text-broadcast-muted" />
          </div>
          <div v-if="!sidebarCollapsed">
            <h2 class="text-sm font-semibold leading-tight text-broadcast-text">
              {{ broadcast.config.court }}
            </h2>
            <p class="flex items-center gap-2 text-xs font-medium text-broadcast-alert">
              <span class="h-2 w-2 rounded-full bg-broadcast-alert broadcast-pulse"></span>
              Transmisión {{ overlay.state.isLive ? 'en vivo' : 'lista' }}
            </p>
          </div>
        </div>

        <template v-for="item in navItems" :key="item.label">
          <!-- External link (overlays open in new tab) -->
          <a
            v-if="item.external"
            :href="item.to"
            target="_blank"
            rel="noopener"
            class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-broadcast-muted transition hover:bg-broadcast-surface-high hover:text-broadcast-text"
            :title="sidebarCollapsed ? item.label : undefined"
            :class="sidebarCollapsed ? 'justify-center px-0' : 'translate-x-1'"
          >
            <component :is="item.icon" class="h-4 w-4" />
            <span v-if="!sidebarCollapsed" class="flex items-center gap-1.5">
              {{ item.label }}
              <ExternalLink class="h-3 w-3 opacity-50" />
            </span>
          </a>
          <!-- Internal navigation -->
          <RouterLink
            v-else
            :to="item.to"
            class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition"
            :title="sidebarCollapsed ? item.label : undefined"
            :class="
              [
                isActive(item.to)
                  ? 'bg-broadcast-accent text-[#00354a]'
                  : 'text-broadcast-muted hover:bg-broadcast-surface-high hover:text-broadcast-text',
                sidebarCollapsed ? 'justify-center px-0' : 'translate-x-1',
              ]
            "
          >
            <component :is="item.icon" class="h-4 w-4" />
            <span v-if="!sidebarCollapsed">{{ item.label }}</span>
          </RouterLink>
        </template>

        <div class="mt-auto border-t border-broadcast-outline pt-4">
          <a
            class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-broadcast-muted"
            :class="sidebarCollapsed ? 'justify-center px-0' : ''"
            href="#"
            :title="sidebarCollapsed ? 'Ayuda' : undefined"
          >
            <CircleHelp class="h-4 w-4" />
            <span v-if="!sidebarCollapsed">Ayuda</span>
          </a>
          <a
            class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-broadcast-danger"
            :class="sidebarCollapsed ? 'justify-center px-0' : ''"
            href="#"
            :title="sidebarCollapsed ? 'Salir' : undefined"
          >
            <LogOut class="h-4 w-4" />
            <span v-if="!sidebarCollapsed">Salir</span>
          </a>
        </div>
      </aside>

      <main class="min-w-0 flex-1 p-4 md:h-[calc(100vh-64px)] md:overflow-y-auto md:p-6">
        <slot />
      </main>
    </div>

    <div
      v-if="mobileMenuOpen"
      class="fixed inset-0 z-50 bg-black/60 md:hidden"
      @click.self="mobileMenuOpen = false"
    >
      <aside class="h-full w-[280px] border-r border-broadcast-outline bg-broadcast-surface-low p-4">
        <div class="mb-4 flex items-center justify-between">
          <span class="text-lg font-bold text-broadcast-accent">ProVolley Live</span>
          <button
            class="flex h-10 w-10 items-center justify-center rounded border border-broadcast-outline bg-broadcast-surface-high"
            type="button"
            aria-label="Cerrar menú"
            @click="mobileMenuOpen = false"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <template v-for="item in navItems" :key="item.label">
          <a
            v-if="item.external"
            :href="item.to"
            target="_blank"
            rel="noopener"
            class="mb-2 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-broadcast-muted transition hover:bg-broadcast-surface-high hover:text-broadcast-text"
            @click="mobileMenuOpen = false"
          >
            <component :is="item.icon" class="h-4 w-4" />
            <span class="flex items-center gap-1.5">{{ item.label }} <ExternalLink class="h-3 w-3 opacity-50" /></span>
          </a>
          <RouterLink
            v-else
            :to="item.to"
            class="mb-2 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition"
            :class="
              isActive(item.to)
                ? 'bg-broadcast-accent text-[#00354a]'
                : 'text-broadcast-muted hover:bg-broadcast-surface-high hover:text-broadcast-text'
            "
            @click="mobileMenuOpen = false"
          >
            <component :is="item.icon" class="h-4 w-4" />
            {{ item.label }}
          </RouterLink>
        </template>
      </aside>
    </div>
  </div>
</template>
