import { readonly, ref } from 'vue'
import { authApi } from '@/api/auth.api'
import { ApiError } from '@/api/http'
import { clearSession, restoreSession, setToken, setVehicle } from '@/auth/wepAuth'
import type { WepVehicle } from '@/types/auth'

const isAuthenticated = ref(false)
const isRestoring = ref(true)
const vehicle = ref<WepVehicle | null>(null)
const sessionMessage = ref('')
let restorePromise: Promise<void> | null = null

async function restore(): Promise<void> {
  if (restorePromise) return restorePromise
  restorePromise = (async () => {
    isRestoring.value = true
    const persisted = restoreSession()
    if (!persisted.token) {
      clearSession()
      isAuthenticated.value = false
      vehicle.value = null
      isRestoring.value = false
      return
    }
    try {
      const response = await authApi.me()
      setVehicle(response.vehiculo)
      vehicle.value = response.vehiculo
      isAuthenticated.value = true
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) clearSession()
      vehicle.value = null
      isAuthenticated.value = false
      if (!(error instanceof ApiError && error.status === 401)) sessionMessage.value = 'No pudimos validar tu sesión. Intentá ingresar nuevamente.'
    } finally {
      isRestoring.value = false
    }
  })()
  return restorePromise
}

async function login(vehiculoId: number, pin: string): Promise<void> {
  const response = await authApi.login(vehiculoId, pin)
  setToken(response.token)
  setVehicle(response.vehiculo)
  try {
    const verified = await authApi.me()
    setVehicle(verified.vehiculo)
    vehicle.value = verified.vehiculo
    isAuthenticated.value = true
    sessionMessage.value = ''
  } catch (error) {
    clearSession()
    vehicle.value = null
    isAuthenticated.value = false
    throw error
  }
}

function logout(): void {
  clearSession()
  vehicle.value = null
  isAuthenticated.value = false
  sessionMessage.value = ''
}

function expireSession(): void {
  clearSession()
  vehicle.value = null
  isAuthenticated.value = false
  sessionMessage.value = 'Tu sesión venció. Ingresá nuevamente.'
}

function clearSessionMessage(): void {
  sessionMessage.value = ''
}

export function useWepAuth() {
  return {
    isAuthenticated: readonly(isAuthenticated),
    isRestoring: readonly(isRestoring),
    vehicle: readonly(vehicle),
    sessionMessage: readonly(sessionMessage),
    login,
    logout,
    restore,
    expireSession,
    clearSessionMessage,
  }
}
