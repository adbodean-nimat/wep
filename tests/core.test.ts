import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { localDate, timeWindow, validLocalDate } from '../src/utils/formatters'
import { isClosed, moveDelivery, pendingCount } from '../src/utils/deliveries'
import { flattenStopDeliveries, isStopClosed, moveStop, pendingStopCount, totalOrderCount } from '../src/utils/stops'
import { request } from '../src/api/http'
import { wepApi } from '../src/api/wep.api'
import { getPublicTracking } from '../src/api/publicTracking.api'
import { clearSession, getToken, setToken } from '../src/auth/wepAuth'
import type { Delivery, WepStop } from '../src/types/wep'

function memoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => [...values.keys()][index] ?? null,
    removeItem: key => { values.delete(key) },
    setItem: (key, value) => { values.set(key, value) },
  }
}

beforeEach(() => {
  vi.stubGlobal('window', { localStorage: memoryStorage() })
  clearSession()
})
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })
describe('Fecha y estados operativos', () => {
  it('construye el día desde componentes locales, no desde UTC', () => {
    expect(localDate(new Date(2026, 8, 14, 23, 59))).toBe('2026-09-14')
    expect(localDate(new Date(2026, 8, 14, 0, 1))).toBe('2026-09-14')
    expect(validLocalDate('2026-02-30')).toBe(false)
    expect(validLocalDate('2026-09-14')).toBe(true)
  })
  it('no inventa ventanas horarias', () => {
    expect(timeWindow(null, null)).toBe('')
    expect(timeWindow('09:00:00', '11:00:00')).toBe('09:00 – 11:00')
  })
  it('sólo permite cerrar con estados terminales conocidos', () => {
    expect(['ENTREGADA', 'NO_ENTREGADA', 'CANCELADA'].every(s => isClosed(s as Delivery['estado']['codigo']))).toBe(true)
    expect(isClosed('CLIENTE_AVISADO')).toBe(false)
    expect(isClosed(null)).toBe(false)
    expect(isStopClosed('CERRADA_PARCIAL')).toBe(true)
    expect(isStopClosed('CLIENTE_AVISADO')).toBe(false)
  })
  it('mueve paradas como bloques y aplana todas sus órdenes en el nuevo orden', () => {
    const stop = (grupoId: string, ids: number[], estado: WepStop['estado']['codigo'] = 'PROGRAMADA') => ({
      grupoId,
      estado: { codigo: estado, nombre: estado },
      cantidadOrdenes: ids.length,
      entregas: ids.map(id => ({ id })),
    }) as WepStop
    const original = [stop('stop_a', [101, 102]), stop('stop_b', [103])]
    const moved = moveStop(original, 1, -1)
    expect(moved.map(item => item.grupoId)).toEqual(['stop_b', 'stop_a'])
    expect(flattenStopDeliveries(moved).map(delivery => delivery.id)).toEqual([103, 101, 102])
    expect(totalOrderCount(moved)).toBe(3)
    expect(pendingStopCount([...moved, stop('stop_c', [104], 'CERRADA_PARCIAL')])).toBe(2)
    expect(original.map(item => item.grupoId)).toEqual(['stop_a', 'stop_b'])
  })
  it('reordena sin perder entregas y sin modificar la lista original', () => {
    const list = [1, 2, 3].map(id => ({ id, estado: { codigo: 'EN_REPARTO', nombre: 'En reparto' } }) as Delivery)
    expect(moveDelivery(list, 2, -1).map(d => d.id)).toEqual([1, 3, 2])
    expect(moveDelivery(list, 0, -1).map(d => d.id)).toEqual([1, 2, 3])
    expect(list.map(d => d.id)).toEqual([1, 2, 3])
    expect(pendingCount(list)).toBe(3)
  })
})
describe('Cliente HTTP', () => {
  it('envía el token de sesión como Bearer', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '/api/wep')
    setToken('token-de-prueba')
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response('{"ok":true}'))
    vi.stubGlobal('fetch', fetchMock)
    await request('/pwa/viajes')
    const headers = new Headers(fetchMock.mock.calls[0]![1]!.headers)
    expect(headers.get('Authorization')).toBe('Bearer token-de-prueba')
  })
  it('no envía Authorization cuando el token está vacío', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '/api/wep')
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response('{"ok":true}'))
    vi.stubGlobal('fetch', fetchMock)
    await request('/pwa/viajes')
    expect(new Headers(fetchMock.mock.calls[0]![1]!.headers).has('Authorization')).toBe(false)
  })
  it('no envía el token guardado a endpoints públicos', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '/api/wep')
    setToken('token-de-prueba')
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response('{"ok":true}'))
    vi.stubGlobal('fetch', fetchMock)
    await request('/auth/vehiculos', { public: true })
    expect(new Headers(fetchMock.mock.calls[0]![1]!.headers).has('Authorization')).toBe(false)
  })
  it('consulta tracking público sin Bearer y deserializa sólo el contrato esperado', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '/api/wep')
    setToken('token-interno-que-no-debe-salir')
    const payload = {
      ok: true,
      tracking: {
        estado: { codigo: 'EN_REPARTO', nombre: 'En reparto' },
        fechaEntrega: '2026-09-18',
        horario: { desde: '07:30', hasta: '10:30' },
        destino: { localidad: 'CONCORDIA' },
        ultimaActualizacion: '2026-09-18T12:00:00.000Z',
        viaje: { enCurso: true },
        vehiculo: {
          posicionDisponible: true,
          latitud: -31.3929,
          longitud: -58.0209,
          fechaPosicion: '2026-09-18T12:01:00.000Z',
        },
      },
    }
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(payload)))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getPublicTracking('abcXYZ_123-abcdefghijkl')).resolves.toEqual(payload.tracking)
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/wep/public/tracking/abcXYZ_123-abcdefghijkl')
    expect(new Headers(fetchMock.mock.calls[0]![1]!.headers).has('Authorization')).toBe(false)
  })
  it('preserva el 404 uniforme del tracking y rechaza contratos incompletos', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '/api/wep')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('{"ok":false,"message":"Seguimiento no disponible"}', { status: 404 })))
    await expect(getPublicTracking('abcdefghijklmnopqrstuv')).rejects.toMatchObject({ status: 404 })

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('{"ok":true,"tracking":{"estado":{"codigo":"ENTREGADA","nombre":"Entregada"}}}')))
    await expect(getPublicTracking('abcdefghijklmnopqrstuv')).rejects.toMatchObject({ status: 502 })
  })
  it('limpia la sesión cuando un endpoint protegido responde 401', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '/api/wep')
    setToken('token-de-prueba')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Solicitud no autorizada', { status: 401 })))
    await expect(request('/pwa/viajes')).rejects.toMatchObject({ status: 401, message: 'Tu sesión venció. Ingresá nuevamente.' })
    expect(getToken()).toBeNull()
  })
  it('requiere configuración explícita', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    await expect(request('/pwa/viajes')).rejects.toThrow('VITE_API_BASE_URL')
  })
  it('no cachea API y preserva body y método', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:9999/api/wep/')
    const fetch = vi.fn().mockResolvedValue(new Response('{"ok":true}'))
    vi.stubGlobal('fetch', fetch)
    await request('/pwa/viajes/10/orden', { method: 'PUT', body: '{"entregas":[]}' })
    expect(fetch).toHaveBeenCalledWith('http://localhost:9999/api/wep/pwa/viajes/10/orden', expect.objectContaining({ cache: 'no-store', method: 'PUT', body: '{"entregas":[]}' }))
  })
  it('usa una única petición por acción de parada con viajeId y grupoId', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '/api/wep')
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => new Response('{"ok":true,"parada":{}}'))
    vi.stubGlobal('fetch', fetch)
    await wepApi.stopDeliver(10, 'stop_ab12cd34')
    await wepApi.stopNoDelivery(10, 'stop_ab12cd34', { motivo: 'CLIENTE_AUSENTE', observacion: 'Sin respuesta' })
    expect(fetch).toHaveBeenNthCalledWith(1, '/api/wep/pwa/viajes/10/paradas/stop_ab12cd34/entregar', expect.objectContaining({ method: 'POST' }))
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/wep/pwa/viajes/10/paradas/stop_ab12cd34/no-entregado', expect.objectContaining({ method: 'POST', body: '{"motivo":"CLIENTE_AUSENTE","observacion":"Sin respuesta"}' }))
  })
  it('resuelve el QR autenticado mediante la capa API', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '/api/wep')
    setToken('token-de-prueba')
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      qr: { division: '0001', tipo: 'NPC', pedido: '0000883524' },
      viaje: { id: 10, numeroVuelta: 1 },
      parada: { grupoId: 'stop_ab12cd34' },
      accionSugerida: 'AVISAR_CLIENTE',
    })))
    vi.stubGlobal('fetch', fetch)
    await wepApi.resolveQr(' WEP|0001|NPC|0000883524 ')
    const requestOptions = fetch.mock.calls[0]![1]!
    expect(fetch.mock.calls[0]![0]).toBe('/api/wep/pwa/qr/resolve')
    expect(requestOptions).toEqual(expect.objectContaining({ method: 'POST', body: '{"qr":"WEP|0001|NPC|0000883524"}' }))
    expect(new Headers(requestOptions.headers).get('Authorization')).toBe('Bearer token-de-prueba')
  })
  it('conserva el mensaje público del 409', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '/api/wep')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"ok":false,"message":"La entrega ya tiene un aviso enviado"}', { status: 409 })))
    await expect(request('/pwa/entregas/101/avisar')).rejects.toMatchObject({ status: 409, message: 'La entrega ya tiene un aviso enviado' })
  })
  it('no muestra HTML de errores', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '/api/wep')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<h1>Error interno</h1>', { status: 500 })))
    await expect(request('/pwa/viajes')).rejects.toThrow('HTTP 500')
  })
  it('rechaza una respuesta de éxito que no sea JSON', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '/api/wep')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>SPA</html>')))
    await expect(request('/pwa/viajes')).rejects.toThrow('respuesta no válida')
  })
})
