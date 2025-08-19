<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useScoreboardStore } from '@stores/scoreboard'

const route = useRoute()
const scoreboardStore = useScoreboardStore()

// Inicializar el store cuando se monta la aplicación
onMounted(() => {
  scoreboardStore.initializeGame()
})

// Cleanup al desmontar
onUnmounted(() => {
  // Cualquier cleanup necesario
})
</script>

<template>
  <div id="app" class="min-h-screen">
    <!-- Router View Principal -->
    <RouterView />

    <!-- Indicador de desarrollo (solo en dev) -->
    <div
      v-if="$route.meta?.isOverlay && import.meta.env.DEV"
      class="fixed top-2 right-2 bg-red-500 text-white px-2 py-1 text-xs rounded z-50 opacity-75"
    >
      OVERLAY MODE - DEV
    </div>
  </div>
</template>

<style>
/* Reset básico y configuración global */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  line-height: 1.15;
  -webkit-text-size-adjust: 100%;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-weight: 400;
  line-height: 1.6;
  color: #333;
  background-color: #f8fafc;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  width: 100%;
  min-height: 100vh;
}

/* Configuración especial para overlay */
body.overlay-mode {
  background: transparent !important;
  overflow: hidden !important;
  cursor: none !important;
}

body.overlay-mode #app {
  background: transparent;
}

/* Configuración de fuentes para el scoreboard */
.font-scoreboard {
  font-family: 'Impact', 'Arial Black', Arial, sans-serif;
  letter-spacing: -0.02em;
}

.font-display {
  font-family: 'Arial Black', Arial, sans-serif;
  font-weight: 900;
}

/* Animaciones globales */
@keyframes scoreUpdate {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes setWin {
  0%,
  100% {
    transform: scale(1);
  }
  25% {
    transform: scale(1.1) rotate(-2deg);
  }
  75% {
    transform: scale(1.1) rotate(2deg);
  }
}

@keyframes servingPulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.05);
  }
}

@keyframes slideIn {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes scaleIn {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes shimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

/* Clases de utilidad para animaciones */
.score-animation {
  animation: scoreUpdate 0.6s ease-in-out;
}

.set-animation {
  animation: setWin 1s ease-in-out;
}

.serving-pulse {
  animation: servingPulse 2s infinite;
}

.slide-in {
  animation: slideIn 0.5s ease-out;
}

.fade-in {
  animation: fadeIn 0.3s ease-in;
}

.scale-in {
  animation: scaleIn 0.4s ease-out;
}

/* Shimmer effect */
.shimmer {
  position: relative;
  overflow: hidden;
}

.shimmer::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: shimmer 2s infinite;
}

/* Responsive utilities */
@media (max-width: 768px) {
  .text-responsive {
    font-size: clamp(0.875rem, 2.5vw, 1.125rem);
  }

  .score-responsive {
    font-size: clamp(2rem, 8vw, 4rem);
  }
}

/* Configuración para impresión */
@media print {
  body {
    background: white !important;
  }

  .no-print {
    display: none !important;
  }
}

/* Configuración para modo oscuro */
@media (prefers-color-scheme: dark) {
  body:not(.overlay-mode) {
    background-color: #1a202c;
    color: #e2e8f0;
  }
}

/* Scrollbar personalizado */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Configuración para overlay mode */
.overlay-mode ::-webkit-scrollbar {
  display: none;
}

/* Focus styles */
button:focus,
input:focus,
select:focus,
textarea:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Configuración para reducir motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Utilities para el desarrollo */
.debug-grid {
  background-image:
    linear-gradient(rgba(255, 0, 0, 0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 0, 0, 0.1) 1px, transparent 1px);
  background-size: 20px 20px;
}

/* Configuración específica de Tailwind */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Componentes personalizados */
@layer components {
  .btn-primary {
    @apply bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200;
  }

  .btn-secondary {
    @apply bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200;
  }

  .btn-danger {
    @apply bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200;
  }

  .card {
    @apply bg-white rounded-lg shadow-md p-6 border border-gray-200;
  }

  .card-dark {
    @apply bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700 text-white;
  }
}

/* Utilities personalizadas */
@layer utilities {
  .text-shadow {
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
  }

  .text-shadow-lg {
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  }

  .bg-gradient-radial {
    background: radial-gradient(var(--tw-gradient-stops));
  }

  .bg-gradient-conic {
    background: conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops));
  }
}
</style>
