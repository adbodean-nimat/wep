const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires'

const argentinaTimeFormatter = new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: ARGENTINA_TIME_ZONE,
})

export function formatPublicTime(value: string | Date | null | undefined): string | null {
  if (value === null || value === undefined) return null

  if (typeof value === 'string') {
    const timeOnly = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/)
    if (timeOnly) {
      const hour = Number(timeOnly[1])
      const minute = Number(timeOnly[2])
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} hs`
      }
      return null
    }
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return `${argentinaTimeFormatter.format(date)} hs`
}

export function formatPublicLocality(value: string | null | undefined): string | null {
  const locality = value?.trim()
  if (!locality) return null
  return locality.replace(/^\d+\s*,\s*/, '').trim() || null
}
