import { describe, expect, it } from 'vitest'
import { formatPublicLocality, formatPublicTime } from '../src/utils/publicTrackingFormatters'

describe('Formateadores del tracking público', () => {
  it('muestra fechas ISO en horario argentino de 24 horas y agrega hs una sola vez', () => {
    expect(formatPublicTime('2026-09-18T16:05:00-03:00')).toBe('16:05 hs')
    expect(formatPublicTime('2026-09-18T19:05:00.000Z')).toBe('16:05 hs')
    expect(formatPublicTime('07:30')).toBe('07:30 hs')
  })

  it('omite horas ausentes o inválidas', () => {
    expect(formatPublicTime(null)).toBeNull()
    expect(formatPublicTime(undefined)).toBeNull()
    expect(formatPublicTime('25:70')).toBeNull()
    expect(formatPublicTime('valor inválido')).toBeNull()
  })

  it('quita sólo un código numérico inicial seguido de coma', () => {
    expect(formatPublicLocality('1067, EL REDOMON')).toBe('EL REDOMON')
    expect(formatPublicLocality('  1234 ,  CONCORDIA  ')).toBe('CONCORDIA')
    expect(formatPublicLocality('CONCORDIA')).toBe('CONCORDIA')
    expect(formatPublicLocality('VILLA ZORRAQUIN')).toBe('VILLA ZORRAQUIN')
    expect(formatPublicLocality('25 DE MAYO')).toBe('25 DE MAYO')
  })

  it('omite localidades vacías sin producir errores', () => {
    expect(formatPublicLocality(null)).toBeNull()
    expect(formatPublicLocality(undefined)).toBeNull()
    expect(formatPublicLocality('')).toBeNull()
    expect(formatPublicLocality('   ')).toBeNull()
  })
})
