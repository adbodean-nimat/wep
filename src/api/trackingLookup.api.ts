import { ApiError, isRecord, request } from './http'

export interface TrackingLookupInput {
  pedido: string
  telefonoUltimos4: string
}

export function validTrackingLookup(input: TrackingLookupInput): boolean {
  return /^\d{1,20}$/.test(input.pedido.trim()) && /^\d{4}$/.test(input.telefonoUltimos4)
}

export function trackingLookupError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400) return 'Revisá el número de pedido y los últimos 4 dígitos del teléfono.'
    if (error.status === 404) return 'No encontramos una entrega con los datos ingresados. Revisalos o consultá con NIMAT si el seguimiento ya está disponible.'
    if (error.status === 429) return 'Realizaste varios intentos. Esperá unos minutos antes de volver a intentar.'
  }
  return 'No pudimos consultar tu entrega. Revisá tu conexión e intentá nuevamente más tarde.'
}

export async function lookupPublicTracking(input: TrackingLookupInput, signal?: AbortSignal): Promise<string> {
  if (!validTrackingLookup(input)) throw new ApiError('Datos de consulta inválidos.', 400)
  const data = await request('/public/tracking/lookup', {
    method: 'POST', public: true, signal, credentials: 'omit', referrerPolicy: 'no-referrer',
    body: JSON.stringify({ pedido: input.pedido.trim(), telefonoUltimos4: input.telefonoUltimos4 }),
  })
  if (!isRecord(data) || data.ok !== true || typeof data.publicId !== 'string'
    || !/^[A-Za-z0-9_-]{22,64}$/.test(data.publicId)) {
    throw new ApiError('Respuesta de seguimiento inválida.', 502)
  }
  return data.publicId
}
