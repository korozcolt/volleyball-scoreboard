// Importar estilos de Tailwind CSS
import './style.css'

import App from './App.vue'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'

// Crear la aplicación Vue
const app = createApp(App)

// Configurar Pinia para el state management
const pinia = createPinia()

// Configurar plugins
app.use(pinia)
app.use(router)

// Configuración global para desarrollo
if (import.meta.env.DEV) {
  // Exponer instancias globales para debugging
  app.config.globalProperties.$dev = {
    router,
    pinia,
  }

  // Configurar devtools
  app.config.performance = true

  // Log de inicialización
  console.log('🏐 Volleyball Scoreboard - Modo Desarrollo')
  console.log('📁 Rutas disponibles:')
  console.log('  🏠 Home: /')
  console.log('  🎮 Controlador: /controller')
  console.log('  📺 Overlay: /overlay')
  console.log('  ⚙️ Configuración: /settings')
}

// Manejar errores no capturados
app.config.errorHandler = (err, instance, info) => {
  console.error('❌ Error en la aplicación:', err)
  console.error('📍 Información:', info)

  // En producción, aquí podrías enviar el error a un servicio de logging
  if (!import.meta.env.DEV) {
    // Ejemplo: enviar a servicio de monitoring
    // sendErrorToService(err, info)
  }
}

// Configurar propiedades globales
app.config.globalProperties.$version = import.meta.env.PACKAGE_VERSION || '0.1.0'
app.config.globalProperties.$env = import.meta.env.MODE

// Montar la aplicación
app.mount('#app')

// Configuración adicional para el entorno
if (typeof window !== 'undefined') {
  // Event listener para cambios de visibilidad (útil para OBS)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      document.title = `En pausa | ${router.currentRoute.value.meta.title ?? 'VolleyStream'}`
    } else {
      document.title = String(router.currentRoute.value.meta.title ?? 'VolleyStream Broadcast Dashboard')
    }
  })

  // Detectar si está corriendo en OBS
  const isInOBS = (window as Window & { obsstudio?: unknown }).obsstudio !== undefined
  if (isInOBS) {
    document.body.classList.add('obs-environment')
    console.log('📺 Detectado entorno OBS Studio')
  }

  // Configuración para desarrollo con múltiples ventanas
  if (import.meta.env.DEV) {
    // Helper para abrir controlador y overlay simultáneamente
    ; (window as Window & { openDualMode?: () => void }).openDualMode = () => {
      window.open('/controller', 'controller', 'width=1200,height=800,left=0,top=0')
      window.open('/overlay', 'overlay', 'width=1920,height=200,left=0,top=800')
    }

    // Log de información útil
    console.log('🔧 Funciones de desarrollo disponibles:')
    console.log('  openDualMode() - Abrir controlador y overlay')
    console.log('  $dev - Acceso a router y pinia')
  }
}

// Configurar interceptor para localStorage (para debugging)
if (import.meta.env.DEV) {
  const originalSetItem = localStorage.setItem
  localStorage.setItem = function (key: string, value: string) {
    if (key.includes('volleyball')) {
      console.log('💾 LocalStorage update:', key, JSON.parse(value))
    }
    return originalSetItem.apply(this, [key, value])
  }
}

// Exportar la instancia de la aplicación para testing
export default app
