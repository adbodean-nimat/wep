export const deliveryStates: Record<string, string> = { PROGRAMADA: 'Programada', ASIGNADA: 'Asignada', EN_REPARTO: 'En reparto', CLIENTE_AVISADO: 'Cliente avisado', ENTREGADA: 'Entregada', NO_ENTREGADA: 'No entregada', CANCELADA: 'Cancelada' }
export const noticeStates: Record<string, string> = { ENVIADO: 'Aceptado por WhatsApp', ENTREGADO: 'Entregado', LEIDO: 'Leído', PENDIENTE: 'Pendiente', ERROR: 'Error' }
export const orderStateLabels: Record<string, string> = { ...deliveryStates, PARCIAL: 'Entrega parcial', CON_INCIDENCIAS: 'Con incidencias', PENDIENTE: 'Pendiente' }
export function adminTone(value: string | null) {
  if (['ERROR', 'NO_ENTREGADA', 'CON_INCIDENCIAS'].includes(value || '')) return 'status-danger'
  if (value === 'PARCIAL') return 'status-warning'
  if (['ENTREGADA', 'ENTREGADO', 'LEIDO', 'OK'].includes(value || '')) return 'status-success'
  return 'status-neutral'
}
export function adminTime(value: string | null | undefined) {
  if (!value) return 'Sin registro'
  return new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}
