import type { StopStatus, WepStop, WepStopDelivery } from '@/types/wep'

export function isStopClosed(status: StopStatus): boolean {
  return ['ENTREGADA', 'NO_ENTREGADA', 'CANCELADA', 'CERRADA_PARCIAL'].includes(status)
}

export function pendingStopCount(stops: WepStop[]): number {
  return stops.filter(stop => !isStopClosed(stop.estado.codigo)).length
}

export function totalOrderCount(stops: WepStop[]): number {
  return stops.reduce((total, stop) => total + stop.cantidadOrdenes, 0)
}

export function moveStop(stops: WepStop[], index: number, offset: -1 | 1): WepStop[] {
  const next = [...stops]
  const target = index + offset
  if (index < 0 || index >= next.length || target < 0 || target >= next.length) return next
  ;[next[index], next[target]] = [next[target]!, next[index]!]
  return next
}

export function flattenStopDeliveries(stops: WepStop[]): WepStopDelivery[] {
  return stops.flatMap(stop => stop.entregas)
}
