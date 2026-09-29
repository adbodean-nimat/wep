import type { PublicTrackingStatus } from '@/types/publicTracking'
import { formatNumber } from '@/utils/formatters'

export type PublicTrackingState = 'PROGRAMADA' | 'EN_CAMINO' | 'PROXIMA' | 'ENTREGADA' | 'NO_ENTREGADA' | 'CANCELADA' | 'PARCIAL'

export const PUBLIC_PROGRESS_STEPS = [
  'Entrega programada',
  'En camino',
  'Próxima a llegar',
  'Entregada',
] as const

export function getPublicTrackingState(status: PublicTrackingStatus): PublicTrackingState {
  switch (status) {
    case 'PROGRAMADA':
    case 'ASIGNADA': return 'PROGRAMADA'
    case 'EN_REPARTO': return 'EN_CAMINO'
    case 'CLIENTE_AVISADO': return 'PROXIMA'
    case 'ENTREGADA': return 'ENTREGADA'
    case 'NO_ENTREGADA': return 'NO_ENTREGADA'
    case 'CANCELADA': return 'CANCELADA'
    case 'CERRADA_PARCIAL': return 'PARCIAL'
  }
}

export function getPublicProgressStep(status: PublicTrackingStatus): number | null {
  switch (getPublicTrackingState(status)) {
    case 'PROGRAMADA': return 0
    case 'EN_CAMINO': return 1
    case 'PROXIMA': return 2
    case 'ENTREGADA': return 3
    default: return null
  }
}

export function getPublicStatusTitle(status: PublicTrackingStatus): string {
  switch (getPublicTrackingState(status)) {
    case 'PROGRAMADA': return 'Tu entrega está programada'
    case 'EN_CAMINO': return 'Tu entrega está en camino'
    case 'PROXIMA': return 'Tu entrega está próxima'
    case 'ENTREGADA': return 'Tu entrega fue realizada'
    case 'NO_ENTREGADA': return 'No pudimos completar la entrega'
    case 'CANCELADA': return 'Entrega cancelada'
    case 'PARCIAL': return 'Entrega parcialmente completada'
  }
}

export function getPublicStatusDescription(status: PublicTrackingStatus): string {
  switch (getPublicTrackingState(status)) {
    case 'PROGRAMADA': return 'Estamos preparando tu entrega para la fecha prevista.'
    case 'EN_CAMINO': return 'Tu pedido salió de NIMAT y se encuentra en reparto.'
    case 'PROXIMA': return 'Estamos cerca de tu destino.'
    case 'ENTREGADA': return 'Tu entrega fue realizada correctamente.'
    case 'NO_ENTREGADA': return 'No fue posible completar la entrega en esta oportunidad.'
    case 'CANCELADA': return 'Esta entrega fue cancelada.'
    case 'PARCIAL': return 'Parte de la entrega pudo ser completada.'
  }
}

export function isPublicTrackingActive(status: PublicTrackingStatus): boolean {
  const state = getPublicTrackingState(status)
  return state === 'EN_CAMINO' || state === 'PROXIMA'
}

export function getPublicEtaLabel(status: PublicTrackingStatus, etaMinutos: number | null | undefined): string | null {
  if (status !== 'CLIENTE_AVISADO' || typeof etaMinutos !== 'number'
    || !Number.isSafeInteger(etaMinutos) || etaMinutos < 0) return null
  return `Llegada estimada: aproximadamente ${formatNumber(etaMinutos)} minutos`
}
