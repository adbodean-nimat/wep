import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../src/api/http'
import { lookupPublicTracking, trackingLookupError, validTrackingLookup } from '../src/api/trackingLookup.api'

const input = { pedido: '883524', telefonoUltimos4: '0056' }
const publicId = 'abcdefghijklmnopqrstuvwx12345678'
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('consulta pública por pedido', () => {
  it.each([
    ['', '0056'], ['abc', '0056'], ['1e3', '0056'], ['-1', '0056'], ['1.1', '0056'],
    ['1'.repeat(21), '0056'], ['883524', '123'], ['883524', '12345'], ['883524', '12a4'], ['883524', ' 1234'],
  ])('rechaza pedido %s y teléfono %s sin usar la red', async (pedido, telefonoUltimos4) => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    expect(validTrackingLookup({ pedido, telefonoUltimos4 })).toBe(false)
    await expect(lookupPublicTracking({ pedido, telefonoUltimos4 })).rejects.toMatchObject({ status: 400 })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('envía POST público, conserva ceros y no pone datos en URL ni encabezados', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://example.test/api/wep/')
    vi.stubGlobal('localStorage', { getItem: () => 'driver-secret' })
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, publicId })))
    vi.stubGlobal('fetch', fetch)
    const signal = new AbortController().signal
    await expect(lookupPublicTracking({ ...input, pedido: ' 883524 ' }, signal)).resolves.toBe(publicId)
    const [url, options] = fetch.mock.calls[0]!
    expect(url).toBe('https://example.test/api/wep/public/tracking/lookup')
    expect(options).toMatchObject({ method: 'POST', cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' })
    expect(JSON.parse(options.body)).toEqual(input)
    expect(options.headers.has('Authorization')).toBe(false)
    expect(options.signal).toBeInstanceOf(AbortSignal)
  })

  it.each([400, 404, 429, 500])('maneja HTTP %s sin mostrar mensajes arbitrarios del servidor', async status => {
    vi.stubEnv('VITE_API_BASE_URL', '/api/wep')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: false, message: 'secret 0056' }), { status })))
    let failure: unknown
    try { await lookupPublicTracking(input) } catch (error) { failure = error }
    expect(failure).toMatchObject({ status })
    expect(trackingLookupError(failure)).not.toContain('secret')
    expect(trackingLookupError(failure)).not.toContain('0056')
    expect(trackingLookupError(failure)).toBeTruthy()
  })

  it.each([{}, { ok: false, publicId }, { ok: true, publicId: '//evil.test' }, { ok: true, publicId: 'short' }, { ok: true, publicId: 123 }])('rechaza respuestas inválidas %j', async payload => {
    vi.stubEnv('VITE_API_BASE_URL', '/api/wep')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(payload))))
    await expect(lookupPublicTracking(input)).rejects.toBeInstanceOf(ApiError)
  })

  it('maneja fallos de red sin revelar el cuerpo enviado', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '/api/wep')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('secret 0056')))
    await expect(lookupPublicTracking(input)).rejects.toMatchObject({ status: 0 })
  })
})
