<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Play, Monitor, Settings, Github, ExternalLink } from 'lucide-vue-next'
import { openInNewWindow } from '@/router'
import { ROUTES } from '@utils/constants'

const router = useRouter()
const isLoading = ref(false)

// Estadísticas del proyecto (pueden venir de una API o store)
const projectStats = ref({
  version: '0.1.0',
  lastUpdate: new Date().toLocaleDateString(),
  features: 12,
  supportedFormats: 4,
})

const features = [
  {
    title: 'Panel de Control Completo',
    description: 'Interfaz intuitiva para manejar todos los aspectos del partido',
    icon: '🎮',
  },
  {
    title: 'Overlay para OBS',
    description: 'Vista profesional optimizada para transmisiones en vivo',
    icon: '📺',
  },
  {
    title: 'Sincronización en Tiempo Real',
    description: 'Actualizaciones instantáneas entre controlador y overlay',
    icon: '⚡',
  },
  {
    title: 'Animaciones Fluidas',
    description: 'Efectos visuales profesionales para eventos del juego',
    icon: '✨',
  },
  {
    title: 'Atajos de Teclado',
    description: 'Control rápido y eficiente durante el partido',
    icon: '⌨️',
  },
  {
    title: 'Totalmente Personalizable',
    description: 'Configura equipos, colores y reglas según tus necesidades',
    icon: '🎨',
  },
]

const quickActions = [
  {
    title: 'Iniciar Control',
    description: 'Abrir panel de administración del marcador',
    action: () => navigateToController(),
    icon: Play,
    color: 'bg-blue-600 hover:bg-blue-700',
    primary: true,
  },
  {
    title: 'Ver Overlay',
    description: 'Abrir vista para transmisión en OBS',
    action: () => navigateToOverlay(),
    icon: Monitor,
    color: 'bg-green-600 hover:bg-green-700',
  },
  {
    title: 'Configuración',
    description: 'Personalizar configuraciones del sistema',
    action: () => router.push(ROUTES.SETTINGS),
    icon: Settings,
    color: 'bg-gray-600 hover:bg-gray-700',
  },
]

const navigateToController = async () => {
  isLoading.value = true
  try {
    await router.push(ROUTES.CONTROLLER)
  } finally {
    isLoading.value = false
  }
}

const navigateToOverlay = async () => {
  isLoading.value = true
  try {
    await router.push(ROUTES.OVERLAY)
  } finally {
    isLoading.value = false
  }
}

const openControllerInNewWindow = () => {
  openInNewWindow(ROUTES.CONTROLLER, 'controller')
}

const openOverlayInNewWindow = () => {
  openInNewWindow(ROUTES.OVERLAY, 'overlay')
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
    <!-- Header -->
    <header class="relative overflow-hidden">
      <div class="absolute inset-0 bg-black opacity-20"></div>
      <div class="relative container mx-auto px-4 py-16 text-center">
        <div class="mb-8">
          <h1 class="text-6xl font-bold text-white mb-4 font-display">
            🏐
            <span
              class="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent"
            >
              Volleyball Scoreboard
            </span>
          </h1>
          <p class="text-xl text-blue-200 max-w-2xl mx-auto">
            Sistema profesional de marcador de volleyball diseñado específicamente para
            transmisiones deportivas en vivo con OBS Studio
          </p>
        </div>

        <!-- Estadísticas del proyecto -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto mb-8">
          <div class="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4">
            <div class="text-2xl font-bold text-white">v{{ projectStats.version }}</div>
            <div class="text-sm text-blue-200">Versión</div>
          </div>
          <div class="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4">
            <div class="text-2xl font-bold text-white">{{ projectStats.features }}+</div>
            <div class="text-sm text-blue-200">Características</div>
          </div>
          <div class="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4">
            <div class="text-2xl font-bold text-white">100%</div>
            <div class="text-sm text-blue-200">Open Source</div>
          </div>
          <div class="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4">
            <div class="text-2xl font-bold text-white">0ms</div>
            <div class="text-sm text-blue-200">Latencia</div>
          </div>
        </div>

        <!-- Acciones rápidas -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          <div
            v-for="action in quickActions"
            :key="action.title"
            class="group cursor-pointer"
            @click="action.action"
          >
            <div
              class="p-6 rounded-2xl transition-all duration-300 transform group-hover:scale-105 group-hover:shadow-2xl"
              :class="[
                action.color,
                action.primary ? 'ring-4 ring-yellow-400 ring-opacity-50' : '',
              ]"
            >
              <component :is="action.icon" class="w-8 h-8 text-white mx-auto mb-4" />
              <h3 class="text-lg font-bold text-white mb-2">{{ action.title }}</h3>
              <p class="text-sm text-white text-opacity-90">{{ action.description }}</p>

              <div v-if="action.primary" class="mt-3">
                <span
                  class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-400 text-gray-900"
                >
                  Recomendado
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Características principales -->
    <section class="py-16 bg-white bg-opacity-5 backdrop-blur-sm">
      <div class="container mx-auto px-4">
        <div class="text-center mb-12">
          <h2 class="text-4xl font-bold text-white mb-4">Características Principales</h2>
          <p class="text-lg text-blue-200 max-w-2xl mx-auto">
            Todo lo que necesitas para una transmisión deportiva profesional
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div
            v-for="feature in features"
            :key="feature.title"
            class="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-6 transition-all duration-300 hover:bg-opacity-20 hover:transform hover:scale-105"
          >
            <div class="text-4xl mb-4">{{ feature.icon }}</div>
            <h3 class="text-xl font-bold text-white mb-3">{{ feature.title }}</h3>
            <p class="text-blue-200">{{ feature.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Guía rápida -->
    <section class="py-16">
      <div class="container mx-auto px-4">
        <div class="text-center mb-12">
          <h2 class="text-4xl font-bold text-white mb-4">Inicio Rápido</h2>
          <p class="text-lg text-blue-200 max-w-2xl mx-auto">Comienza en 3 simples pasos</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div class="text-center">
            <div
              class="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold"
            >
              1
            </div>
            <h3 class="text-xl font-bold text-white mb-3">Abrir Controlador</h3>
            <p class="text-blue-200 mb-4">
              Configura los equipos y comienza a controlar el partido desde el panel de
              administración
            </p>
            <button
              @click="openControllerInNewWindow"
              class="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ExternalLink class="w-4 h-4" />
              Abrir en nueva ventana
            </button>
          </div>

          <div class="text-center">
            <div
              class="bg-green-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold"
            >
              2
            </div>
            <h3 class="text-xl font-bold text-white mb-3">Configurar OBS</h3>
            <p class="text-blue-200 mb-4">
              Agrega el overlay como fuente de navegador en OBS Studio para la transmisión
            </p>
            <button
              @click="openOverlayInNewWindow"
              class="inline-flex items-center gap-2 text-green-400 hover:text-green-300 transition-colors"
            >
              <ExternalLink class="w-4 h-4" />
              Ver overlay
            </button>
          </div>

          <div class="text-center">
            <div
              class="bg-purple-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold"
            >
              3
            </div>
            <h3 class="text-xl font-bold text-white mb-3">¡Transmitir!</h3>
            <p class="text-blue-200 mb-4">
              Los cambios en el controlador se reflejan automáticamente en el overlay de OBS
            </p>
            <span class="inline-flex items-center gap-2 text-purple-400">
              <span class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Sincronización automática
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="py-8 bg-black bg-opacity-20">
      <div class="container mx-auto px-4 text-center">
        <div class="flex flex-col md:flex-row items-center justify-between">
          <div class="text-blue-200 mb-4 md:mb-0">
            <p>&copy; 2024 Volleyball Scoreboard. Desarrollado con ❤️ y Vue.js</p>
          </div>

          <div class="flex items-center gap-4">
            <a
              href="https://github.com/tu-usuario/volleyball-scoreboard"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
            >
              <Github class="w-5 h-5" />
              GitHub
            </a>

            <span class="text-blue-200">v{{ projectStats.version }}</span>
          </div>
        </div>
      </div>
    </footer>

    <!-- Loading overlay -->
    <div
      v-if="isLoading"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-6 text-center">
        <div
          class="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"
        ></div>
        <p class="text-gray-700">Cargando...</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Animaciones adicionales específicas para la vista de inicio */
@keyframes float {
  0%,
  100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

.float-animation {
  animation: float 6s ease-in-out infinite;
}

/* Gradient text effect */
.gradient-text {
  background: linear-gradient(45deg, #3b82f6, #8b5cf6, #ef4444);
  background-size: 300% 300%;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: gradient-shift 3s ease infinite;
}

@keyframes gradient-shift {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}
</style>
