import { ApiError, isRecord, request } from './http'

export async function lookupPublicTracking(pedido: string, telefonoUltimos4: string, signal?: AbortSignal): Promise<string> {
  const data = await request('/public/tracking/lookup', {
    method: 'POST', public: true, signal, credentials: 'omit', referrerPolicy: 'no-referrer',
    body: JSON.stringify({ pedido, telefonoUltimos4 }),
  })
  if (!isRecord(data) || data.ok !== true || typeof data.publicId !== 'string'
    || !/^[A-Za-z0-9_-]{22,64}$/.test(data.publicId)) {
    throw new ApiError('No pudimos consultar tu entrega en este momento.', 502)
  }
  return data.publicId
}
