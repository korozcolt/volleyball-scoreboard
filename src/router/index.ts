import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { ROUTES, STORAGE_KEYS } from '@utils/constants'

// Importaciones lazy de las vistas para code splitting
const ControllerView = () => import('@/views/ControllerView.vue')
const OverlayView = () => import('@/views/OverlayView.vue')
const HomeView = () => import('@/views/HomeView.vue')
const MatchesView = () => import('@/views/MatchesView.vue')
const SettingsView = () => import('@/views/SettingsView.vue')
const StatisticsView = () => import('@/views/StatisticsView.vue')

const legacyMatchRedirect = (base: string) => {
  const lastMatchId =
    typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.LAST_MATCH_ID) : null
  return lastMatchId ? `${base}/${lastMatchId}` : ROUTES.MATCHES
}

const routes: Array<RouteRecordRaw> = [
  {
    path: ROUTES.HOME,
    name: 'Home',
    component: HomeView,
    meta: {
      title: 'VolleyStream Broadcast Dashboard',
      description: 'Suite de marcador y overlay OBS para transmisiones de volleyball',
    },
  },
  {
    path: ROUTES.MATCHES,
    name: 'Matches',
    component: MatchesView,
    meta: {
      title: 'Partidos | VolleyStream',
      description: 'Sesiones de partidos y enlaces aislados para controller y OBS',
    },
  },
  {
    path: `${ROUTES.CONTROLLER}/:matchId`,
    name: 'Controller',
    component: ControllerView,
    meta: {
      title: 'Control de Partido | VolleyStream',
      description: 'Panel operativo para marcador, saque, sets, timeouts y overlays',
      requiresFullscreen: false,
    },
  },
  {
    path: `${ROUTES.OVERLAY}/:matchId`,
    name: 'Overlay',
    component: OverlayView,
    meta: {
      title: 'Overlay OBS | VolleyStream',
      description: 'Salida limpia para OBS con marcador de volleyball sincronizado',
      requiresFullscreen: true,
      isOverlay: true,
    },
  },
  {
    path: `${ROUTES.STATISTICS}/:matchId`,
    name: 'Statistics',
    component: StatisticsView,
    meta: {
      title: 'Estadisticas | VolleyStream',
      description: 'Modulo de estadisticas en vivo para el partido',
    },
  },
  {
    path: `${ROUTES.SETTINGS}/:matchId`,
    name: 'Settings',
    component: SettingsView,
    meta: {
      title: 'Configuracion Broadcast | VolleyStream',
      description: 'Configuracion de equipos, torneo, sponsor, colores y estilo visual',
    },
  },
  { path: ROUTES.CONTROLLER, redirect: () => legacyMatchRedirect(ROUTES.CONTROLLER) },
  { path: ROUTES.OVERLAY, redirect: () => legacyMatchRedirect(ROUTES.OVERLAY) },
  { path: ROUTES.STATISTICS, redirect: () => legacyMatchRedirect(ROUTES.STATISTICS) },
  { path: ROUTES.SETTINGS, redirect: () => legacyMatchRedirect(ROUTES.SETTINGS) },
  // Rutas de redirección para compatibilidad
  {
    path: '/control',
    redirect: () => legacyMatchRedirect(ROUTES.CONTROLLER),
  },
  {
    path: '/obs',
    redirect: () => legacyMatchRedirect(ROUTES.OVERLAY),
  },
  {
    path: '/stream',
    redirect: () => legacyMatchRedirect(ROUTES.OVERLAY),
  },
  // Ruta 404
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFoundView.vue'),
    meta: {
      title: 'Pagina no encontrada | VolleyStream',
    },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  // Configuración de scroll behavior
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  },
})

// Guards de navegación
router.beforeEach((to, from, next) => {
  // Actualizar el título de la página
  if (to.meta?.title) {
    document.title = to.meta.title as string
  }

  // Actualizar meta description
  if (to.meta?.description) {
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', to.meta.description as string)
    }
  }

  // Configuraciones especiales para el overlay
  if (to.meta?.isOverlay) {
    // Ocultar cursor en overlay para OBS
    document.body.style.cursor = 'none'

    // Evitar scroll en overlay
    document.body.style.overflow = 'hidden'

    // Fondo transparente para overlay
    document.body.style.background = 'transparent'

    // Agregar clase especial para overlay
    document.body.classList.add('overlay-mode')
  } else {
    // Restaurar configuraciones normales
    document.body.style.cursor = 'auto'
    document.body.style.overflow = 'auto'
    document.body.style.background = ''
    document.body.classList.remove('overlay-mode')
  }

  // Configuración para fullscreen si es necesario
  if (to.meta?.requiresFullscreen && !document.fullscreenElement) {
    // Solo sugerir fullscreen, no forzar
    console.log('💡 Tip: Para mejor experiencia en OBS, usa modo fullscreen')
  }

  next()
})

// Manejo de errores de carga de rutas
router.onError((error) => {
  console.error('Error de navegación:', error)

  // Intentar recargar la página si hay error de chunk loading
  if (error.message.includes('Loading chunk')) {
    window.location.reload()
  }
})

// Helper para navegación programática
export const navigateTo = {
  home: () => router.push(ROUTES.HOME),
  controller: () => router.push(ROUTES.CONTROLLER),
  overlay: () => router.push(ROUTES.OVERLAY),
  settings: () => router.push(ROUTES.SETTINGS),
}

// Helper para detectar la ruta actual
export const useCurrentRoute = () => {
  return {
    isHome: () => router.currentRoute.value.path === ROUTES.HOME,
    isController: () => router.currentRoute.value.path === ROUTES.CONTROLLER,
    isOverlay: () => router.currentRoute.value.path === ROUTES.OVERLAY,
    isSettings: () => router.currentRoute.value.path === ROUTES.SETTINGS,
  }
}

// Función para abrir rutas en nuevas ventanas (útil para desarrollo)
export const openInNewWindow = (route: string, windowName: string = '_blank') => {
  const url = router.resolve(route).href
  window.open(url, windowName, 'width=1200,height=800')
}

// Configuración específica para desarrollo
if (import.meta.env.DEV) {
  // Agregar helpers globales en desarrollo
  ; (window as Window & { volleyball?: object }).volleyball = {
    router,
    navigateTo,
    openController: () => openInNewWindow(ROUTES.MATCHES, 'controller'),
    openOverlay: () => openInNewWindow(ROUTES.MATCHES, 'overlay'),
  }
}

export default router
