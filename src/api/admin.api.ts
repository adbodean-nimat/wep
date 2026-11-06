import { ref } from 'vue'
import { request, ApiError, isRecord } from './http'
import type { AdminUser, DashboardData, TechnicalData, WepSettingsData, WepSettings, AdminVehicle, SettingsAudit } from '@/types/admin'
import type { WepIntegration, IntegrationTestResult } from '@/types/admin'
const key = 'wep_admin_session'
export const adminUser = ref<AdminUser | null>(null)
export function adminLogout() { sessionStorage.removeItem(key); adminUser.value = null }
function user(value: unknown): AdminUser {
  if (!isRecord(value) || !Number.isSafeInteger(value.id) || typeof value.username !== 'string'
    || typeof value.displayName !== 'string' || !['CONSULTA', 'TIC'].includes(String(value.role)) || typeof value.active !== 'boolean') {
    throw new ApiError('WEP devolvió un usuario inválido.', 502)
  }
  return value as unknown as AdminUser
}
async function call(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers)
  const token = sessionStorage.getItem(key)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  try {
    const result = await request(`/control${path}`, { ...options, headers, public: true, credentials: 'omit' })
    if (!isRecord(result)) throw new ApiError('WEP devolvió una respuesta inválida.', 502)
    return result
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) adminLogout()
    throw error
  }
}
export const adminApi = {
  async testIntegration(provider: WepIntegration, input: Record<string, unknown>): Promise<IntegrationTestResult> {
    const result = await call(`/integrations/${provider}/test`, { method: 'POST', body: JSON.stringify(input) })
    if (!isRecord(result.result) || typeof result.checkedAt !== 'string') throw new ApiError('La prueba devolvió una respuesta inválida.', 502)
    return result as unknown as IntegrationTestResult
  },
  async settings(): Promise<WepSettingsData> {
    const result = await call('/settings')
    if (!isRecord(result.config) || !Number.isSafeInteger(result.revision) || !Array.isArray(result.applied)) throw new ApiError('La configuración recibida es inválida.', 502)
    return result as unknown as WepSettingsData
  },
  async saveSettings(config: WepSettings, revision: number, token?: string): Promise<WepSettingsData> {
    return await call('/settings', { method: 'PUT', body: JSON.stringify({ config, revision, ...(token ? { token } : {}) }) }) as unknown as WepSettingsData
  },
  async settingsHistory(): Promise<SettingsAudit[]> {
    const result = await call('/settings/history')
    if (!Array.isArray(result.history)) throw new ApiError('El historial recibido es inválido.', 502)
    return result.history as SettingsAudit[]
  },
  async vehicles(): Promise<AdminVehicle[]> {
    const result = await call('/vehicles')
    if (!Array.isArray(result.vehicles)) throw new ApiError('La lista de camiones es inválida.', 502)
    return result.vehicles as AdminVehicle[]
  },
  async saveVehicle(id: number, loginEnabled: boolean, pin?: string) {
    await call(`/vehicles/${id}`, { method: 'PATCH', body: JSON.stringify({ loginEnabled, ...(pin ? { pin } : {}) }) })
  },
  async login(username: string, password: string) {
    const result = await call('/login', { method: 'POST', body: JSON.stringify({ username, password }) })
    const profile = user(result.user)
    if (typeof result.token !== 'string' || !result.token) throw new ApiError('No se recibió una sesión válida.', 502)
    sessionStorage.setItem(key, result.token); adminUser.value = profile
  },
  async restore() {
    if (!sessionStorage.getItem(key)) { adminUser.value = null; return false }
    const result = await call('/me'); adminUser.value = user(result.user); return true
  },
  async dashboard(params: URLSearchParams, signal?: AbortSignal): Promise<DashboardData> {
    const result = await call(`/dashboard?${params}`, { signal })
    if (!isRecord(result.summary) || !Array.isArray(result.deliveries) || !Array.isArray(result.vehicles)) throw new ApiError('El tablero recibió datos inválidos.', 502)
    return result as unknown as DashboardData
  },
  async technical(fecha: string, signal?: AbortSignal): Promise<TechnicalData> {
    const result = await call(`/technical?${new URLSearchParams({ fecha })}`, { signal })
    if (!Array.isArray(result.runs)) throw new ApiError('El diagnóstico recibió datos inválidos.', 502)
    return result as unknown as TechnicalData
  },
  async users() {
    const result = await call('/users')
    if (!Array.isArray(result.users)) throw new ApiError('La lista de usuarios es inválida.', 502)
    return result.users.map(user)
  },
  async saveUser(data: { username?: string; displayName: string; role: string; active?: boolean; password?: string }, id?: number) {
    const result = await call(id ? `/users/${id}` : '/users', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(data) })
    return user(result.user)
  },
}
