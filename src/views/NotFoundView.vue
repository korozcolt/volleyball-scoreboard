<template>
  <div class="not-found-view min-h-screen bg-gray-900 text-white flex items-center justify-center">
    <div class="text-center">
      <!-- Error Icon -->
      <div class="mb-8">
        <div class="text-8xl mb-4">🏐</div>
        <h1 class="text-6xl font-bold text-red-400 mb-2">404</h1>
        <h2 class="text-2xl font-semibold text-gray-300 mb-4">
          Página no encontrada
        </h2>
      </div>

      <!-- Error Message -->
      <div class="mb-8 max-w-md mx-auto">
        <p class="text-gray-400 text-lg mb-6">
          Lo sentimos, la página que buscas no existe o ha sido movida.
        </p>
        <p class="text-gray-500 text-sm">
          Verifica la URL o regresa al inicio para continuar navegando.
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
        <router-link
          to="/"
          class="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          🏠 Ir al Inicio
        </router-link>
        
        <button
          @click="goBack"
          class="inline-block px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
        >
          ← Volver Atrás
        </button>
      </div>

      <!-- Quick Links -->
      <div class="mt-12 pt-8 border-t border-gray-700">
        <h3 class="text-lg font-medium text-gray-300 mb-4">Enlaces rápidos</h3>
        <div class="flex flex-wrap justify-center gap-4">
          <router-link
            to="/controller"
            class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors text-sm"
          >
            🎮 Panel de Control
          </router-link>
          
          <router-link
            to="/overlay"
            class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors text-sm"
          >
            📺 Overlay
          </router-link>
          
          <router-link
            to="/settings"
            class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors text-sm"
          >
            ⚙️ Configuración
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goBack = () => {
  if (window.history.length > 1) {
    router.go(-1)
  } else {
    router.push('/')
  }
}
</script>

<style scoped>
/* Animación sutil para el icono */
.not-found-view .text-8xl {
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
}
</style>