import type { WepVehicle } from '@/types/auth'

const TOKEN_KEY = 'wep_token'
const VEHICLE_KEY = 'wep_vehicle'

function storage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage
}

function isVehicle(value: unknown): value is WepVehicle {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const candidate = value as Record<string, unknown>
  return Number.isSafeInteger(candidate.id)
    && typeof candidate.nombre === 'string'
    && typeof candidate.patente === 'string'
    && (typeof candidate.codigoErp === 'string' || candidate.codigoErp === null)
}

export function getToken(): string | null {
  return storage()?.getItem(TOKEN_KEY)?.trim() || null
}

export function setToken(token: string): void {
  storage()?.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  storage()?.removeItem(TOKEN_KEY)
}

export function getVehicle(): WepVehicle | null {
  const serialized = storage()?.getItem(VEHICLE_KEY)
  if (!serialized) return null
  try {
    const vehicle: unknown = JSON.parse(serialized)
    return isVehicle(vehicle) ? vehicle : null
  } catch {
    clearVehicle()
    return null
  }
}

export function setVehicle(vehicle: WepVehicle): void {
  storage()?.setItem(VEHICLE_KEY, JSON.stringify(vehicle))
}

export function clearVehicle(): void {
  storage()?.removeItem(VEHICLE_KEY)
}

export function clearSession(): void {
  clearToken()
  clearVehicle()
}

export function restoreSession(): { token: string | null; vehicle: WepVehicle | null } {
  return { token: getToken(), vehicle: getVehicle() }
}
