import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { getPublicTracking } from '../src/api/publicTracking.api'
import TrackingSchedule from '../src/components/public/TrackingSchedule.vue'
import TrackingStatusCard from '../src/components/public/TrackingStatusCard.vue'
import type { PublicTracking } from '../src/types/publicTracking'
import { formatOrderNumber } from '../src/utils/publicTrackingFormatters'
import { getPublicStatusTitle } from '../src/utils/publicTrackingPresentation'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('Notas de Pedido en el tracking público', () => {
  it.each([
    ['PROGRAMADA', 'Tu pedido #883524 está programado'],
    ['ASIGNADA', 'Tu pedido #883524 está programado'],
    ['EN_REPARTO', 'Tu pedido #883524 está en camino'],
    ['CLIENTE_AVISADO', 'Tu pedido #883524 está próximo a llegar'],
    ['ENTREGADA', 'Tu pedido #883524 fue entregado'],
    ['NO_ENTREGADA', 'No pudimos entregar tu pedido #883524'],
    ['CANCELADA', 'Tu pedido #883524 fue cancelado'],
    ['CERRADA_PARCIAL', 'Tu pedido #883524 fue parcialmente entregado'],
  ] as const)('muestra el pedido en %s y conserva el fallback', async (status, title) => {
    expect(getPublicStatusTitle(status, '883524')).toBe(title)
    for (const principal of [null, undefined, '']) {
      expect(getPublicStatusTitle(status, principal)).toBe(getPublicStatusTitle(status))
      expect(getPublicStatusTitle(status, principal)).not.toContain('#')
    }
    const html = await renderToString(createSSRApp(TrackingStatusCard, {
      status, pedidoPrincipal: '883524', etaMinutos: 25,
    }))
    expect(html).toContain(title)
    if (status === 'CLIENTE_AVISADO') {
      expect(html).toContain('Llegada estimada: aproximadamente 25 minutos')
      expect(html).toContain('Estamos cerca de tu destino.')
    } else {
      expect(html).not.toContain('Llegada estimada')
    }
    if (status === 'EN_REPARTO') expect(html).toContain('Tu pedido salió de NIMAT y se encuentra en reparto.')
    if (status === 'ENTREGADA') expect(html).toContain('Tu entrega fue realizada correctamente.')
  })

  it.each([
    { principal: '883524', otros: [] },
    { principal: '883524', otros: ['883611', '883645'] },
    { principal: null, otros: [] },
  ] satisfies PublicTracking['pedido'][])('conserva y presenta el DTO de pedido %j', async pedido => {
    vi.stubEnv('VITE_API_BASE_URL', '/api/wep')
    const payload = {
      pedido,
      estado: { codigo: 'PROGRAMADA', nombre: 'Programada' },
      fechaEntrega: '2026-09-30',
      horario: { desde: '07:30', hasta: '10:30' },
      destino: { localidad: 'EL REDOMON' },
      ultimaActualizacion: null,
      viaje: { enCurso: false },
      vehiculo: { posicionDisponible: false },
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, tracking: payload }))))
    const tracking = await getPublicTracking('abcdefghijklmnopqrstuv')
    expect(tracking.pedido).toEqual(pedido)
    const html = await renderToString(createSSRApp(TrackingSchedule, {
      pedido: tracking.pedido,
      fechaEntrega: tracking.fechaEntrega,
      horario: tracking.horario,
      destino: tracking.destino,
    }))
    expect(html).toContain('Detalles de la entrega')
    expect(html).toContain('07:30 - 10:30 hs')
    expect(html).toContain('EL REDOMON')
    if (pedido.principal) {
      expect(html.match(/#883524/g)).toHaveLength(1)
      expect(html).toContain(pedido.otros.length ? 'Pedido principal' : '>Pedido</dt>')
      for (const otro of pedido.otros) expect(html).toContain(`#${otro}`)
    } else {
      expect(html).not.toContain('Pedido')
      expect(html).not.toContain('#')
    }
    expect(html.includes('Otros pedidos asociados')).toBe(pedido.otros.length > 0)
  })

  it('trata los pedidos como identificadores y conserva ceros iniciales', () => {
    expect(formatOrderNumber('883524')).toBe('#883524')
    expect(formatOrderNumber('00883524')).toBe('#00883524')
  })
})
