<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { authRequired, authorized, refreshAuthStatus, setAdminToken } from '@/services/auth'

const route = useRoute()
const token = ref('')
const error = ref('')
const checking = ref(false)
const viewOnly = ref(false)

// Los overlays de OBS solo leen: nunca piden clave.
const visible = computed(() => authRequired.value && !authorized.value && !route.meta.isOverlay && !viewOnly.value)

onMounted(refreshAuthStatus)

const submit = async () => {
  const value = token.value.trim()
  if (!value) return
  checking.value = true
  error.value = ''
  setAdminToken(value)
  await refreshAuthStatus()
  checking.value = false
  if (authorized.value) {
    // Recarga para que la conexión en tiempo real se abra ya con la clave.
    window.location.reload()
  } else {
    setAdminToken('')
    error.value = 'Clave incorrecta.'
  }
}
</script>

<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
    role="dialog"
    aria-modal="true"
    aria-label="Clave de operador"
  >
    <form
      class="w-full max-w-sm rounded-xl border border-broadcast-outline bg-broadcast-background p-5 shadow-2xl"
      @submit.prevent="submit"
    >
      <h2 class="mb-1 text-lg font-black uppercase text-broadcast-text">Clave de operador</h2>
      <p class="mb-4 text-sm text-broadcast-muted">
        Este servidor protege los cambios. Sin la clave puedes ver el partido, pero no modificarlo.
      </p>
      <input
        v-model="token"
        type="password"
        autocomplete="current-password"
        class="admin-input mb-2 h-11 w-full"
        placeholder="Clave"
        autofocus
      />
      <p v-if="error" class="mb-2 text-sm font-bold text-broadcast-danger" role="alert">{{ error }}</p>
      <button type="submit" class="admin-button w-full justify-center" :disabled="checking || !token.trim()">
        {{ checking ? 'Verificando…' : 'Entrar' }}
      </button>
      <button
        type="button"
        class="mt-2 w-full rounded px-3 py-2 text-sm font-semibold text-broadcast-muted transition hover:text-broadcast-text"
        @click="viewOnly = true"
      >
        Solo ver, sin modificar
      </button>
    </form>
  </div>
</template>
