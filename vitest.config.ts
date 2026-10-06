import { URL, fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Configuración aparte de vite.config.ts: las pruebas no necesitan los plugins de Vue/devtools.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@utils': fileURLToPath(new URL('./src/utils', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.spec.ts'],
    setupFiles: ['src/__tests__/setup.ts'],
  },
})
