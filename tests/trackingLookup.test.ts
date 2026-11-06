import { afterEach, expect, it, vi } from 'vitest'
import { lookupPublicTracking } from '../src/api/trackingLookup.api'
import { ApiError } from '../src/api/http'

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

it('envía el lookup público por POST sin token y conserva sólo publicId', async () => {
  vi.stubEnv('VITE_API_BASE_URL', '/api/wep')
  const getItem = vi.fn().mockReturnValue('sesion-privada-del-chofer')
  vi.stubGlobal('window', { localStorage: { getItem } })
  const publicId = 'abcdefghijklmnopqrstuvwx12345678'
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, publicId })))
  vi.stubGlobal('fetch', fetch)
  expect(await lookupPublicTracking('883611', '3569')).toBe(publicId)
  const [url, options] = fetch.mock.calls[0]!
  expect(url).toBe('/api/wep/public/tracking/lookup')
  expect(options.method).toBe('POST')
  expect(options.cache).toBe('no-store')
  expect(options.credentials).toBe('omit')
  expect(options.referrerPolicy).toBe('no-referrer')
  expect(options.headers.has('Authorization')).toBe(false)
  expect(getItem).not.toHaveBeenCalled()
  expect(JSON.parse(options.body)).toEqual({ pedido: '883611', telefonoUltimos4: '3569' })
})

it.each([null, {}, { ok: false }, { ok: true, publicId: 123 }, { ok: true, publicId: 'x'.repeat(65) }])(
  'rechaza una respuesta incompleta o malformada (%j)', async payload => {
    vi.stubEnv('VITE_API_BASE_URL', '/api/wep')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(payload))))
    await expect(lookupPublicTracking('883524', '3569')).rejects.toBeInstanceOf(ApiError)
  },
)

it('convierte un fallo de red en un error controlado sin filtrar su contenido', async () => {
  vi.stubEnv('VITE_API_BASE_URL', '/api/wep')
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('detalle privado')))
  await expect(lookupPublicTracking('883524', '3569')).rejects.toMatchObject({ status: 0 })
})

it('propaga la cancelación al transporte', async () => {
  vi.stubEnv('VITE_API_BASE_URL', '/api/wep')
  const controller = new AbortController()
  const fetch = vi.fn().mockImplementation((_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new DOMException('Cancelado', 'AbortError')))
  }))
  vi.stubGlobal('fetch', fetch)
  const result = lookupPublicTracking('883524', '3569', controller.signal)
  controller.abort()
  await expect(result).rejects.toMatchObject({ name: 'AbortError' })
  expect(fetch.mock.calls[0]![1].signal.aborted).toBe(true)
})

it.each([400, 404, 429, 500])('conserva el status %s para los mensajes controlados de la vista', async status => {
  vi.stubEnv('VITE_API_BASE_URL', '/api/wep')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: false, message: 'Error' }), { status })))
  await expect(lookupPublicTracking('883524', '3569')).rejects.toMatchObject({ status })
})

it.each(['//evil.example', '../chofer', 'invalid'])('rechaza publicId inválido %s antes de navegar', async publicId => {
  vi.stubEnv('VITE_API_BASE_URL', '/api/wep')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, publicId }))))
  await expect(lookupPublicTracking('883524', '3569')).rejects.toBeInstanceOf(ApiError)
})
