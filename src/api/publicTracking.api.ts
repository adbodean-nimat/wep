import { ApiError, isRecord, request } from './http'
import type { PublicTracking, PublicTrackingStatus } from '@/types/publicTracking'

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

function publicRoute(value: unknown): PublicTracking['ruta'] {
  if (!isRecord(value)) return { disponible: false }
  const destination = isRecord(value.destino)
    && typeof value.destino.latitud === 'number' && Math.abs(value.destino.latitud) <= 90
    && typeof value.destino.longitud === 'number' && Math.abs(value.destino.longitud) <= 180
    ? { latitud: value.destino.latitud, longitud: value.destino.longitud }
    : undefined
  const geometry = isRecord(value.geometry) && value.geometry.type === 'LineString'
    && Array.isArray(value.geometry.coordinates)
    && value.geometry.coordinates.length >= 2
    && value.geometry.coordinates.every((point: unknown) => Array.isArray(point)
      && point.length === 2 && typeof point[0] === 'number' && Math.abs(point[0]) <= 180
      && typeof point[1] === 'number' && Math.abs(point[1]) <= 90)
    ? { type: 'LineString' as const, coordinates: value.geometry.coordinates as [number, number][] }
    : undefined
  return {
    disponible: value.disponible === true && geometry !== undefined,
    ...(value.disponible === true && geometry ? { geometry } : {}),
    ...(destination ? { destino: destination } : {}),
    ...(typeof value.distanciaMetros === 'number' && Number.isFinite(value.distanciaMetros) ? { distanciaMetros: value.distanciaMetros } : {}),
    ...(typeof value.duracionSegundos === 'number' && Number.isFinite(value.duracionSegundos) ? { duracionSegundos: value.duracionSegundos } : {}),
    ...(isNullableString(value.generadaAt) ? { generadaAt: value.generadaAt } : {}),
  }
}

function isPublicTracking(value: unknown): value is PublicTracking {
  if (!isRecord(value) || !isRecord(value.estado) || !isRecord(value.horario)
    || !isRecord(value.destino) || !isRecord(value.viaje)
    || !isPublicVehicle(value.vehiculo)) return false

  return typeof value.estado.codigo === 'string'
    && (value.pedido === undefined || (isRecord(value.pedido)
      && isNullableString(value.pedido.principal)
      && Array.isArray(value.pedido.otros)
      && value.pedido.otros.every((pedido: unknown) => typeof pedido === 'string')))
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
  const source = data.tracking as PublicTracking
  const eta = source.etaMinutos
  // Sólo conservamos los campos del contrato público, incluso si la API agrega datos.
  return {
    pedido: source.pedido
      ? { principal: source.pedido.principal, otros: [...source.pedido.otros] }
      : { principal: null, otros: [] },
    estado: { codigo: source.estado.codigo, nombre: source.estado.nombre },
    fechaEntrega: source.fechaEntrega,
    horario: { desde: source.horario.desde, hasta: source.horario.hasta },
    destino: { localidad: source.destino.localidad },
    ruta: source.estado.codigo === 'CLIENTE_AVISADO' ? publicRoute(source.ruta) : { disponible: false },
    ultimaActualizacion: source.ultimaActualizacion,
    viaje: { enCurso: source.viaje.enCurso },
    vehiculo: source.vehiculo.posicionDisponible
      ? { posicionDisponible: true, latitud: source.vehiculo.latitud, longitud: source.vehiculo.longitud, fechaPosicion: source.vehiculo.fechaPosicion }
      : { posicionDisponible: false },
    ...(typeof eta === 'number' && Number.isSafeInteger(eta) && eta >= 0 ? { etaMinutos: eta } : {}),
  }
}
