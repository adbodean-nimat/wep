import { ApiError, isRecord, request } from './http'
import type { LoginResponse, MeResponse, VehiclesResponse, WepVehicle } from '@/types/auth'

function isVehicle(value: unknown): value is WepVehicle {
  if (!isRecord(value)) return false
  return Number.isSafeInteger(value.id)
    && typeof value.nombre === 'string'
    && typeof value.patente === 'string'
    && (typeof value.codigoErp === 'string' || value.codigoErp === null)
}

function invalidResponse(): never {
  throw new ApiError('La respuesta de WEP no tiene el formato esperado.', 502)
}

export const authApi = {
  async vehicles(signal?: AbortSignal): Promise<VehiclesResponse> {
    const data = await request('/auth/vehiculos', { public: true, signal })
    if (!isRecord(data) || data.ok !== true || !Array.isArray(data.vehiculos) || !data.vehiculos.every(isVehicle)) invalidResponse()
    return { ok: true, vehiculos: data.vehiculos }
  },
  async login(vehiculoId: number, pin: string): Promise<LoginResponse> {
    const data = await request('/auth/login', {
      method: 'POST',
      public: true,
      body: JSON.stringify({ vehiculoId, pin }),
    })
    if (!isRecord(data) || data.ok !== true || typeof data.token !== 'string' || !data.token || !isVehicle(data.vehiculo)) invalidResponse()
    return { ok: true, token: data.token, vehiculo: data.vehiculo }
  },
  async me(): Promise<MeResponse> {
    const data = await request('/auth/me')
    if (!isRecord(data) || data.ok !== true || !isVehicle(data.vehiculo)) invalidResponse()
    return { ok: true, vehiculo: data.vehiculo }
  },
}
