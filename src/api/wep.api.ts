import { ApiError, isRecord, request } from './http'
import type { DeliveredResponse, DeliveryDetailResponse, FinishResponse, NoDeliveryPayload, NoDeliveryResponse, NoticeResponse, OrderResponse, QrResolveResponse, StartResponse, StopDeliveredResponse, StopNoDeliveryResponse, StopNoticeResponse, TripsResponse } from '@/types/wep'

// Única frontera de deserialización; los tipos reflejan el código real del backend.
async function api<T>(path: string, key: string, options?: RequestInit): Promise<T> {
  const data = await request(path, options)
  if (!isRecord(data) || data.ok !== true || !(key in data)) throw new ApiError('La respuesta de WEP no tiene el formato esperado.', 502)
  return data as T
}
function idPath(id: number): number {
  if (!Number.isSafeInteger(id) || id <= 0) throw new ApiError('El identificador no es válido.', 400)
  return id
}
function groupPath(grupoId: string): string {
  if (!grupoId.trim()) throw new ApiError('El identificador de parada no es válido.', 400)
  return encodeURIComponent(grupoId)
}
const post = { method: 'POST' }

async function noticeApi<T>(path: string, key: string): Promise<T> {
  const data = await api<unknown>(path, key, post)
  const notification = isRecord(data) && isRecord(data.notificacion) ? data.notificacion : null
  if (notification?.resultado === 'PEDIDO_NO_DISPONIBLE' || notification?.errorCodigo === 'PEDIDO_NO_DISPONIBLE') {
    throw new ApiError('No se envió WhatsApp: la parada no tiene una Nota de Pedido disponible.', 422, 'PEDIDO_NO_DISPONIBLE')
  }
  if (!notification || notification.estado !== 'ENVIADO' || notification.canal !== 'WHATSAPP'
    || (notification.resultado !== undefined && notification.resultado !== 'ENVIADA' && notification.resultado !== 'YA_NOTIFICADA')) {
    throw new ApiError('WEP no confirmó el envío del aviso por WhatsApp. Actualizá la parada y revisá su estado.', 502, 'AVISO_NO_CONFIRMADO')
  }
  return data as T
}

export const wepApi = {
  trips: (fecha: string, signal?: AbortSignal) => api<TripsResponse>(`/pwa/viajes?${new URLSearchParams({ fecha })}`, 'viajes', { signal }),
  delivery: (id: number, signal?: AbortSignal) => api<DeliveryDetailResponse>(`/pwa/entregas/${idPath(id)}`, 'entrega', { signal }),
  order: (id: number, entregas: { id: number; orden: number }[]) => api<OrderResponse>(`/pwa/viajes/${idPath(id)}/orden`, 'entregas', { method: 'PUT', body: JSON.stringify({ entregas }) }),
  start: (id: number) => api<StartResponse>(`/pwa/viajes/${idPath(id)}/iniciar`, 'viaje', post),
  notice: (id: number) => noticeApi<NoticeResponse>(`/pwa/entregas/${idPath(id)}/avisar`, 'entrega'),
  deliver: (id: number) => api<DeliveredResponse>(`/pwa/entregas/${idPath(id)}/entregar`, 'entrega', post),
  noDelivery: (id: number, payload: NoDeliveryPayload) => api<NoDeliveryResponse>(`/pwa/entregas/${idPath(id)}/no-entregado`, 'entrega', { ...post, body: JSON.stringify(payload) }),
  stopNotice: (tripId: number, grupoId: string) => noticeApi<StopNoticeResponse>(`/pwa/viajes/${idPath(tripId)}/paradas/${groupPath(grupoId)}/avisar`, 'parada'),
  stopDeliver: (tripId: number, grupoId: string) => api<StopDeliveredResponse>(`/pwa/viajes/${idPath(tripId)}/paradas/${groupPath(grupoId)}/entregar`, 'parada', post),
  stopNoDelivery: (tripId: number, grupoId: string, payload: NoDeliveryPayload) => api<StopNoDeliveryResponse>(`/pwa/viajes/${idPath(tripId)}/paradas/${groupPath(grupoId)}/no-entregado`, 'parada', { ...post, body: JSON.stringify(payload) }),
  resolveQr: (qr: string) => {
    const value = qr.trim()
    if (!value) throw new ApiError('El código QR no es válido.', 400)
    return api<QrResolveResponse>('/pwa/qr/resolve', 'parada', { ...post, body: JSON.stringify({ qr: value }) })
  },
  finish: (id: number) => api<FinishResponse>(`/pwa/viajes/${idPath(id)}/finalizar`, 'resumen', post),
}
