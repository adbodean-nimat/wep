import { describe, expect, it } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import TrackingStatusCard from '../src/components/public/TrackingStatusCard.vue'
import type { PublicTrackingStatus } from '../src/types/publicTracking'
import {
  getPublicProgressStep,
  getPublicEtaLabel,
  getPublicStatusDescription,
  getPublicStatusTitle,
  getPublicTrackingState,
  isPublicTrackingActive,
  PUBLIC_PROGRESS_STEPS,
} from '../src/utils/publicTrackingPresentation'

describe('presentación del tracking público', () => {
  it.each([
    ['PROGRAMADA', 'PROGRAMADA', 0, false, 'Tu entrega está programada'],
    ['ASIGNADA', 'PROGRAMADA', 0, false, 'Tu entrega está programada'],
    ['EN_REPARTO', 'EN_CAMINO', 1, true, 'Tu entrega está en camino'],
    ['CLIENTE_AVISADO', 'PROXIMA', 2, true, 'Tu entrega está próxima'],
    ['ENTREGADA', 'ENTREGADA', 3, false, 'Tu entrega fue realizada'],
    ['NO_ENTREGADA', 'NO_ENTREGADA', null, false, 'No pudimos completar la entrega'],
    ['CANCELADA', 'CANCELADA', null, false, 'Entrega cancelada'],
    ['CERRADA_PARCIAL', 'PARCIAL', null, false, 'Entrega parcialmente completada'],
  ] as const)('%s se presenta como %s', (internal, publicState, step, active, title) => {
    const status: PublicTrackingStatus = internal
    expect(getPublicTrackingState(status)).toBe(publicState)
    expect(getPublicProgressStep(status)).toBe(step)
    expect(isPublicTrackingActive(status)).toBe(active)
    expect(getPublicStatusTitle(status)).toBe(title)
    expect(getPublicStatusDescription(status)).not.toBe('')
  })

  it('mantiene exactamente cuatro hitos públicos', () => {
    expect(PUBLIC_PROGRESS_STEPS).toEqual([
      'Entrega programada', 'En camino', 'Próxima a llegar', 'Entregada',
    ])
  })

  it('presenta el ETA recibido sólo para CLIENTE_AVISADO', async () => {
    expect(getPublicEtaLabel('CLIENTE_AVISADO', 25)).toBe('Llegada estimada: aproximadamente 25 minutos')
    expect(getPublicEtaLabel('CLIENTE_AVISADO', 0)).toBe('Llegada estimada: aproximadamente 0 minutos')
    const html = await renderToString(createSSRApp(TrackingStatusCard, { status: 'CLIENTE_AVISADO', etaMinutos: 25 }))
    expect(html).toContain('Llegada estimada: aproximadamente 25 minutos')
    expect(html).toContain('text-lg font-bold')
  })

  it.each(['PROGRAMADA', 'ASIGNADA', 'EN_REPARTO', 'ENTREGADA', 'NO_ENTREGADA', 'CANCELADA', 'CERRADA_PARCIAL'] as PublicTrackingStatus[])(
    'omite el ETA en %s aunque llegue un valor', async status => {
      expect(getPublicEtaLabel(status, 25)).toBeNull()
      const html = await renderToString(createSSRApp(TrackingStatusCard, { status, etaMinutos: 25 }))
      expect(html).not.toContain('Llegada estimada')
    },
  )

  it.each([undefined, null, -1, NaN, Infinity, 2.5])('omite un ETA ausente o inválido (%s)', async eta => {
    expect(getPublicEtaLabel('CLIENTE_AVISADO', eta)).toBeNull()
    const html = await renderToString(createSSRApp(TrackingStatusCard, { status: 'CLIENTE_AVISADO', etaMinutos: eta ?? undefined }))
    expect(html).not.toContain('Llegada estimada')
  })
})
