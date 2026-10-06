import { ref } from 'vue'

const STORAGE_KEY = 'volleystream.adminToken'

// El servidor puede exigir una clave de operador para escribir (ADMIN_TOKEN). Los overlays de OBS solo
// leen y nunca la necesitan.
export const authRequired = ref(false)
export const authorized = ref(true)

export const getAdminToken = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

export const setAdminToken = (token: string) => {
  try {
    if (token) localStorage.setItem(STORAGE_KEY, token)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Sin almacenamiento (modo privado): la clave solo dura esta sesión de la página.
  }
}

export const authHeaders = (): Record<string, string> => {
  const token = getAdminToken()
  return token ? { 'x-admin-token': token } : {}
}

export const markUnauthorized = () => {
  authRequired.value = true
  authorized.value = false
}

export const refreshAuthStatus = async () => {
  try {
    const response = await fetch('/api/auth/status', { headers: authHeaders() })
    if (!response.ok) return
    const status = (await response.json()) as { required: boolean; authorized: boolean }
    authRequired.value = status.required
    authorized.value = status.authorized
  } catch {
    // Sin red no se puede saber; no se bloquea la interfaz.
  }
}
