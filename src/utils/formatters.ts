export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function displayDate(date = new Date()): string {
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(date)
}

export function dateFromLocal(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year!, month! - 1, day!)
}
export function validLocalDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && localDate(dateFromLocal(value)) === value
}
export function timeWindow(from: string | null, to: string | null): string {
  if (from && to) return `${from.slice(0, 5)} – ${to.slice(0, 5)}`
  return from ? `Desde ${from.slice(0, 5)}` : to ? `Hasta ${to.slice(0, 5)}` : ''
}
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(value)
}
export function mapAddress(street: string | null, locality: string | null): string {
  const cleanLocality = locality?.replace(/^\s*\d+\s*,\s*/, '').trim()
  const parts = [street?.trim(), cleanLocality, 'Concordia', 'Entre Ríos', 'Argentina']
    .filter((value): value is string => !!value)
  return parts.filter((value, index) => (
    parts.findIndex(part => part.localeCompare(value, 'es', { sensitivity: 'base' }) === 0) === index
  )).join(', ')
}
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado. Intentá de nuevo.'
}
