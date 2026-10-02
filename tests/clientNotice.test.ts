import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { wepApi } from '../src/api/wep.api'

beforeEach(() => vi.stubEnv('VITE_API_BASE_URL', '/api/wep'))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

function respond(notificacion: unknown) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
    ok: true,
    message: 'Cliente avisado correctamente para la parada',
    parada: { estado: { codigo: 'EN_REPARTO' } },
    entrega: { id: 101 },
    notificacion,
  }))))
}

describe('confirmación del aviso por WhatsApp', () => {
  it('rechaza HTTP 200 con PEDIDO_NO_DISPONIBLE sin confirmar un aviso', async () => {
    respond({ tipo: 'EN_CAMINO', canal: 'WHATSAPP', resultado: 'PEDIDO_NO_DISPONIBLE', errorCodigo: 'PEDIDO_NO_DISPONIBLE' })
    await expect(wepApi.stopNotice(10, 'stop_ab12cd34')).rejects.toMatchObject({
      code: 'PEDIDO_NO_DISPONIBLE',
      message: 'No se envió WhatsApp: la parada no tiene una Nota de Pedido disponible.',
    })
  })

  it.each([undefined, null, {}, { estado: 'ERROR', canal: 'WHATSAPP' },
    { estado: 'PENDIENTE', canal: 'WHATSAPP' },
    { estado: 'ENVIADO', canal: 'WHATSAPP', resultado: 'ERROR' },
  ])('rechaza notificaciones sin envío confirmado (%j)', async notification => {
    respond(notification)
    await expect(wepApi.stopNotice(10, 'stop_ab12cd34')).rejects.toMatchObject({ code: 'AVISO_NO_CONFIRMADO' })
  })

  it.each(['ENVIADA', 'YA_NOTIFICADA'])('conserva el resultado %s y el ETA', async resultado => {
    const notificacion = { tipo: 'EN_CAMINO', canal: 'WHATSAPP', estado: 'ENVIADO',
      resultado, etaMinutos: 25, enviadoAt: '2026-09-30T13:00:00Z', messageId: 'wamid.test' }
    respond(notificacion)
    const response = await wepApi.stopNotice(10, 'stop_ab12cd34')
    expect(response.notificacion).toEqual(notificacion)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('mantiene compatibilidad con el aviso individual sin resultado', async () => {
    respond({ tipo: 'EN_CAMINO', canal: 'WHATSAPP', estado: 'ENVIADO', enviadoAt: '2026-09-30T13:00:00Z' })
    await expect(wepApi.notice(101)).resolves.toMatchObject({ notificacion: { estado: 'ENVIADO' } })
  })
})
