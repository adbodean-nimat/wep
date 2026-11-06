// @vitest-environment happy-dom
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { adminApi, adminLogout, adminUser } from '../src/api/admin.api'
import { ApiError } from '../src/api/http'
import Dashboard from '../src/views/admin/AdminDashboardView.vue'

vi.mock('vue-router', () => ({ useRouter: () => ({ replace: vi.fn() }) }))
let wrapper: VueWrapper | undefined
beforeEach(() => { vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:9999/api/wep'); sessionStorage.clear(); localStorage.clear(); adminUser.value = null })
afterEach(() => { wrapper?.unmount(); wrapper = undefined; vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs() })
const reader = { id: 1, username: 'ramiro', displayName: 'Ramiro', role: 'CONSULTA' as const, active: true, lastLoginAt: null }

it('mantiene sesión administrativa separada del chofer y revoca sólo esa sesión ante 401', async () => {
  localStorage.setItem('wep_token', 'driver-token')
  const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, token: 'admin-token', user: reader })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, user: reader })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ ok: false, message: 'Sesión vencida' }), { status: 401 }))
  vi.stubGlobal('fetch', fetcher)
  await adminApi.login('ramiro', 'secret-password')
  await adminApi.restore()
  const options = fetcher.mock.calls[1]![1] as RequestInit
  expect(new Headers(options.headers).get('Authorization')).toBe('Bearer admin-token')
  expect(options.cache).toBe('no-store')
  expect(sessionStorage.getItem('wep_admin_session')).toBe('admin-token')
  await expect(adminApi.restore()).rejects.toBeInstanceOf(ApiError)
  expect(adminUser.value).toBeNull()
  expect(sessionStorage.getItem('wep_admin_session')).toBeNull()
  expect(localStorage.getItem('wep_token')).toBe('driver-token')
})

it('el rol Consulta sólo consulta el tablero, sin controles TIC ni acciones operativas', async () => {
  adminUser.value = reader
  const dashboard = vi.spyOn(adminApi, 'dashboard').mockResolvedValue({ fecha: '2026-10-29', fetchedAt: '2026-10-29T12:00:00Z', page: 1, pageSize: 50,
    summary: { total: 0, viajes: 0, entregadas: 0, no_entregadas: 0, en_reparto: 0, sin_telefono: 0, errores_avisos: 0, avisos_enviados: 0 }, deliveries: [], vehicles: [] })
  const technical = vi.spyOn(adminApi, 'technical')
  wrapper = mount(Dashboard)
  await flushPromises()
  expect(dashboard).toHaveBeenCalledTimes(1)
  expect(technical).not.toHaveBeenCalled()
  expect(wrapper.text()).toContain('No hay entregas para estos filtros.')
  expect(wrapper.text()).not.toContain('Diagnóstico TIC')
  expect(wrapper.text()).not.toContain('Crear usuario')
  expect(wrapper.text()).not.toContain('Enviar WhatsApp')
  expect(wrapper.text()).not.toContain('Ejecutar sincronización')
  adminLogout()
})

it('un fallo no muestra indicadores en cero como si la operación estuviera vacía', async () => {
  adminUser.value = reader
  vi.spyOn(adminApi, 'dashboard').mockRejectedValue(new ApiError('No pudimos consultar WEP.', 503))
  wrapper = mount(Dashboard)
  await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain('No pudimos consultar WEP.')
  expect(wrapper.text()).not.toContain('No hay entregas para estos filtros.')
})
