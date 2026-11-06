// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import AdminSettings from '../src/components/admin/AdminSettings.vue'
import AdminVehicles from '../src/components/admin/AdminVehicles.vue'
import { adminApi, adminLogout } from '../src/api/admin.api'
import { ApiError } from '../src/api/http'
import { toast } from 'vue-sonner'
import type { WepSettingsData } from '../src/types/admin'

let wrapper: VueWrapper | undefined
vi.mock('vue-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
function fixture(): WepSettingsData {
  const template = () => ({ enabled: true, name: '', language: 'es_AR' })
  return { revision: 1, updatedAt: null, tokenConfigured: true, applied: [], config: {
    integrations: { gestya: { enabled: true, timeoutMs: 10000 }, google: { enabled: true, timeoutMs: 10000 }, heigit: { enabled: true, timeoutMs: 10000 } },
    sync: { enabled: true, blocked: false, cron: '*/5 * * * *', daysBack: 0, daysAhead: 7, vehicleCodes: ['101', '102', '103'] },
    programmed: { enabled: false, dryRun: true, cron: '*/5 * * * *', start: '06:00', end: '21:00', weekdays: [0, 1, 2, 3, 4, 5, 6] },
    meta: { paused: false, testRouting: { enabled: false, phone: '' }, phoneNumberId: '', apiVersion: '', templates: { programmed: template(), enReparto: template(), enCamino: template(), enCaminoZona: template() } },
  } }
}
beforeEach(() => { vi.clearAllMocks(); vi.spyOn(adminApi, 'settingsHistory').mockResolvedValue([]) })
afterEach(() => { wrapper?.unmount(); wrapper = undefined; vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); adminLogout() })

it('mantiene separadas la pausa automática y el bloqueo global al guardar; conserva el token si está vacío', async () => {
  const original = fixture()
  vi.spyOn(adminApi, 'settings').mockResolvedValue(original)
  const save = vi.spyOn(adminApi, 'saveSettings').mockImplementation(async config => ({ ...fixture(), revision: 2, config }))
  wrapper = mount(AdminSettings); await flushPromises()
  const checkboxes = wrapper.findAll('input[type="checkbox"]')
  await checkboxes[0]!.setValue(false)
  await checkboxes[1]!.setValue(true)
  await wrapper.find('form').trigger('submit'); await flushPromises()
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ sync: expect.objectContaining({ enabled: false, blocked: true, vehicleCodes: ['101', '102', '103'] }) }), 1, undefined)
  expect(toast.success).toHaveBeenCalledWith('Configuración guardada', expect.any(Object))
  expect(wrapper.text()).toContain('Pendiente de confirmar en el ejecutor')
  expect(original.config.sync.enabled).toBe(true)
})

it('reemplaza el token solo si se ingresó uno y limpia el campo tras guardar', async () => {
  vi.spyOn(adminApi, 'settings').mockResolvedValue(fixture())
  const save = vi.spyOn(adminApi, 'saveSettings').mockImplementation(async config => ({ ...fixture(), revision: 2, config }))
  wrapper = mount(AdminSettings); await flushPromises()
  const input = wrapper.find('input[type="password"]')
  expect((input.element as HTMLInputElement).value).toBe('')
  await input.setValue('wep-secret-new')
  await wrapper.find('form').trigger('submit'); await flushPromises()
  expect(save).toHaveBeenCalledWith(expect.anything(), 1, 'wep-secret-new')
  expect((input.element as HTMLInputElement).value).toBe('')
  expect(wrapper.text()).not.toContain('wep-secret-new')
})

it('verificar aplicación no sobrescribe un borrador y detecta cambios de otra persona', async () => {
  const initial = fixture(), newer = fixture(); newer.revision = 2
  vi.spyOn(adminApi, 'settings').mockResolvedValueOnce(initial).mockResolvedValueOnce(newer)
  wrapper = mount(AdminSettings); await flushPromises()
  await wrapper.findAll('input[type="checkbox"]')[1]!.setValue(true)
  await wrapper.findAll('button').find(b => b.text() === 'Verificar aplicación')!.trigger('click'); await flushPromises()
  expect((wrapper.findAll('input[type="checkbox"]')[1]!.element as HTMLInputElement).checked).toBe(true)
  expect(wrapper.text()).toContain('Hay una versión guardada por otra persona')
  expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
})

it('ante rechazo de versión conserva el borrador y muestra el error', async () => {
  vi.spyOn(adminApi, 'settings').mockResolvedValue(fixture())
  vi.spyOn(adminApi, 'saveSettings').mockRejectedValue(new ApiError('Otra persona modificó la configuración.', 409))
  wrapper = mount(AdminSettings); await flushPromises()
  await wrapper.findAll('input[type="checkbox"]')[1]!.setValue(true)
  await wrapper.find('form').trigger('submit'); await flushPromises()
  expect(wrapper.find('[role="alert"]').text()).toContain('Otra persona modificó')
  expect(toast.error).toHaveBeenCalledWith('Otra persona modificó la configuración.')
  expect((wrapper.findAll('input[type="checkbox"]')[1]!.element as HTMLInputElement).checked).toBe(true)
})

it('cambia PIN y bloquea acceso del camión sin enviar patente ni código ERP', async () => {
  vi.spyOn(adminApi, 'vehicles').mockResolvedValue([{ id: 3, codigo_erp: '101', nombre: 'Camión 101', patente: 'AB123CD', activo: true, es_externo: false, wep_login_activo: true, pin_configured: true, last_imported_at: null }])
  const save = vi.spyOn(adminApi, 'saveVehicle').mockResolvedValue(undefined)
  wrapper = mount(AdminVehicles); await flushPromises()
  await wrapper.find('input[type="checkbox"]').setValue(false)
  await wrapper.find('input[type="password"]').setValue('986432')
  await wrapper.find('form').trigger('submit'); await flushPromises()
  expect(save).toHaveBeenCalledWith(3, false, '986432')
  expect((wrapper.find('input[type="password"]').element as HTMLInputElement).value).toBe('')
  expect(toast.success).toHaveBeenCalledWith('Acceso de Camión 101 actualizado', expect.any(Object))
  expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
})

it('la API envía la sesión TIC al guardar configuración y no expone el token de chofer', async () => {
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:9999/api/wep')
  sessionStorage.setItem('wep_admin_session', 'admin-token')
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, ...fixture() })))
  vi.stubGlobal('fetch', fetcher)
  await adminApi.saveSettings(fixture().config, 1, 'exclusive-meta-token')
  const [url, options] = fetcher.mock.calls[0]!
  expect(url).toBe('http://localhost:9999/api/wep/control/settings')
  expect(options.method).toBe('PUT')
  expect(new Headers(options.headers).get('Authorization')).toBe('Bearer admin-token')
  expect(JSON.parse(options.body)).toEqual({ config: fixture().config, revision: 1, token: 'exclusive-meta-token' })
  expect(options.credentials).toBe('omit')
})

it('guarda la redirección de prueba y muestra su alcance sin reemplazar teléfonos del ERP', async () => {
  vi.spyOn(adminApi, 'settings').mockResolvedValue(fixture())
  const save = vi.spyOn(adminApi, 'saveSettings').mockImplementation(async config => ({ ...fixture(), revision: 2, config: { ...config, meta: { ...config.meta, testRouting: { enabled: true, phone: '5493455551234' } } } }))
  wrapper = mount(AdminSettings); await flushPromises()
  const section = wrapper.find('fieldset[aria-label="Teléfono de prueba"]')
  await section.find('input[type="checkbox"]').setValue(true)
  await section.find('input[type="tel"]').setValue('+5493455551234')
  await wrapper.find('form').trigger('submit'); await flushPromises()
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ meta: expect.objectContaining({ testRouting: { enabled: true, phone: '+5493455551234' } }) }), 1, undefined)
  expect(wrapper.text()).toContain('Teléfono de prueba activo: +5493455551234')
  expect(section.text()).toContain('Los teléfonos originales del ERP se conservan')
  expect(section.text()).toContain('Conserva las validaciones, los estados de las entregas y la deduplicación')
  expect(wrapper.text()).not.toContain('Aviso por cliente')
  expect(wrapper.text()).not.toContain('Prueba de entrega programada')
})
