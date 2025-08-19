import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { ROUTES } from '@utils/constants'

// Importaciones lazy de las vistas para code splitting
const ControllerView = () => import('@/views/ControllerView.vue')
const OverlayView = () => import('@/views/OverlayView.vue')
const HomeView = () => import('@/views/HomeView.vue')
const SettingsView = () => import('@/views/SettingsView.vue')

const routes: Array<RouteRecordRaw> = [
  {
    path: ROUTES.HOME,
    name: 'Home',
    component: HomeView,
    meta: {
      title: 'Volleyball Scoreboard',
      description: 'Sistema profesional de marcador de volleyball',
    },
  },
  {
    path: ROUTES.CONTROLLER,
    name: 'Controller',
    component: ControllerView,
    meta: {
      title: 'Panel de Control - Volleyball Scoreboard',
      description: 'Panel de administración del marcador',
      requiresFullscreen: false,
    },
  },
  {
    path: ROUTES.OVERLAY,
    name: 'Overlay',
    component: OverlayView,
    meta: {
      title: 'Overlay - Volleyball Scoreboard',
      description: 'Overlay para transmisión en OBS',
      requiresFullscreen: true,
      isOverlay: true,
    },
  },
  {
    path: ROUTES.SETTINGS,
    name: 'Settings',
    component: SettingsView,
    meta: {
      title: 'Configuración - Volleyball Scoreboard',
      description: 'Configuración del sistema',
    },
  },
  // Rutas de redirección para compatibilidad
  {
    path: '/control',
    redirect: ROUTES.CONTROLLER,
  },
  {
    path: '/obs',
    redirect: ROUTES.OVERLAY,
  },
  {
    path: '/stream',
    redirect: ROUTES.OVERLAY,
  },
  // Ruta 404
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFoundView.vue'),
    meta: {
      title: 'Página no encontrada',
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
  ; (window as any).volleyball = {
    router,
    navigateTo,
    openController: () => openInNewWindow(ROUTES.CONTROLLER, 'controller'),
    openOverlay: () => openInNewWindow(ROUTES.OVERLAY, 'overlay'),
  }
}

export default router
