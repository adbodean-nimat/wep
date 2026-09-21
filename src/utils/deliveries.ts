import type { Delivery, DeliveryStatus, NoDeliveryReason, TripSummary } from '@/types/wep'

export const reasonLabels: Record<NoDeliveryReason, string> = {
  CLIENTE_AUSENTE: 'Cliente ausente', DOMICILIO_CERRADO: 'Domicilio cerrado',
  DIRECCION_INCORRECTA: 'Dirección incorrecta', CLIENTE_RECHAZA: 'Cliente rechaza entrega',
  SIN_ACCESO: 'Sin acceso', PROBLEMA_DE_CARGA: 'Problema de carga', OTRO: 'Otro',
}
export function isClosed(status: DeliveryStatus | null): boolean {
  return status !== null && ['ENTREGADA', 'NO_ENTREGADA', 'CANCELADA'].includes(status)
}
export function summarize(deliveries: Delivery[]): TripSummary {
  return {
    totalEntregas: deliveries.length,
    entregadas: deliveries.filter(d => d.estado.codigo === 'ENTREGADA').length,
    noEntregadas: deliveries.filter(d => d.estado.codigo === 'NO_ENTREGADA').length,
    canceladas: deliveries.filter(d => d.estado.codigo === 'CANCELADA').length,
  }
}
export function pendingCount(deliveries: Delivery[]): number {
  return deliveries.filter(d => !isClosed(d.estado.codigo)).length
}
export function moveDelivery(deliveries: Delivery[], index: number, offset: -1 | 1): Delivery[] {
  const next = [...deliveries]
  const target = index + offset
  if (index < 0 || index >= next.length || target < 0 || target >= next.length) return next
  ;[next[index], next[target]] = [next[target]!, next[index]!]
  return next
}
