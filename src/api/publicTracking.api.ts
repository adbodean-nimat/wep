import { ApiError, isRecord, request } from './http'
import type { PublicTracking, PublicTrackingResponse, PublicTrackingStatus } from '@/types/publicTracking'

const statuses = new Set<PublicTrackingStatus>([
  'PROGRAMADA',
  'ASIGNADA',
  'EN_REPARTO',
  'CLIENTE_AVISADO',
  'ENTREGADA',
  'NO_ENTREGADA',
  'CANCELADA',
  'CERRADA_PARCIAL',
])

function isNullableString(value: unknown): value is string | null {
  return typeof value === 'string' || value === null
}

function isPublicVehicle(value: unknown): boolean {
  if (!isRecord(value) || typeof value.posicionDisponible !== 'boolean') return false
  if (!value.posicionDisponible) return true

  return typeof value.latitud === 'number'
    && Number.isFinite(value.latitud)
    && typeof value.longitud === 'number'
    && Number.isFinite(value.longitud)
    && isNullableString(value.fechaPosicion)
}

function isPublicTracking(value: unknown): value is PublicTracking {
  if (!isRecord(value) || !isRecord(value.estado) || !isRecord(value.horario)
    || !isRecord(value.destino) || !isRecord(value.viaje)
    || !isPublicVehicle(value.vehiculo)) return false

  return typeof value.estado.codigo === 'string'
    && statuses.has(value.estado.codigo as PublicTrackingStatus)
    && typeof value.estado.nombre === 'string'
    && isNullableString(value.fechaEntrega)
    && isNullableString(value.horario.desde)
    && isNullableString(value.horario.hasta)
    && isNullableString(value.destino.localidad)
    && isNullableString(value.ultimaActualizacion)
    && typeof value.viaje.enCurso === 'boolean'
}

export async function getPublicTracking(publicId: string, signal?: AbortSignal): Promise<PublicTracking> {
  const id = publicId.trim()
  if (!id) throw new ApiError('El enlace de seguimiento no es válido.', 404)

  const data = await request(`/public/tracking/${encodeURIComponent(id)}`, { public: true, signal })
  if (!isRecord(data) || data.ok !== true || !isPublicTracking(data.tracking)) {
    throw new ApiError('La respuesta de WEP no tiene el formato esperado.', 502)
  }
  return (data as PublicTrackingResponse).tracking
}
