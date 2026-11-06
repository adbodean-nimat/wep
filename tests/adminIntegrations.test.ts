// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import AdminIntegrations from '../src/components/admin/AdminIntegrations.vue'
import { adminApi } from '../src/api/admin.api'
import { toast } from 'vue-sonner'
vi.mock('vue-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
let wrapper: VueWrapper | undefined
afterEach(() => { wrapper?.unmount(); wrapper = undefined; vi.restoreAllMocks(); vi.clearAllMocks() })
function props() { return { config: { gestya: { enabled: true, timeoutMs: 10000 }, google: { enabled: true, timeoutMs: 10000 }, heigit: { enabled: true, timeoutMs: 10000 } }, status: { gestya: { configured: true }, google: { configured: true }, heigit: { configured: true } }, unsaved: false } }

it('prueba Google con una dirección explícita y muestra solo el resultado acotado', async () => {
  const test = vi.spyOn(adminApi, 'testIntegration').mockResolvedValue({ provider: 'google', checkedAt: '2026-11-02T12:00:00Z', result: { latitude: -31.4, longitude: -58, approximateArea: false } })
  wrapper = mount(AdminIntegrations, { props: props() })
  const article = wrapper.find('article[aria-label="Google API · Geocodificación"]')
  await article.find('input[maxlength="300"]').setValue('Dirección de prueba, Concordia')
  await article.find('button').trigger('click'); await flushPromises()
  expect(test).toHaveBeenCalledWith('google', { address: 'Dirección de prueba, Concordia' })
  expect(article.text()).toContain('Prueba correcta')
  expect(article.text()).toContain('-31.4, -58')
  expect(toast.success).toHaveBeenCalledWith('Prueba completada correctamente')
})

it('impide pruebas con cambios pendientes o una integración pausada', async () => {
  const test = vi.spyOn(adminApi, 'testIntegration')
  wrapper = mount(AdminIntegrations, { props: { ...props(), unsaved: true } })
  expect(wrapper.text()).toContain('Guardá los cambios antes de realizar una prueba')
  expect(wrapper.findAll('fieldset').every(f => f.attributes('disabled') !== undefined)).toBe(true)
  expect(test).not.toHaveBeenCalled()
  const paused = props(); paused.config.heigit.enabled = false
  await wrapper.setProps({ ...paused })
  expect(wrapper.find('article[aria-label="HeiGIT API · Rutas"] fieldset').attributes('disabled')).toBeDefined()
})

it('envía coordenadas numéricas a HeiGIT y muestra errores con Sonner', async () => {
  const test = vi.spyOn(adminApi, 'testIntegration').mockRejectedValue(new Error('No se pudo completar la prueba de HeiGIT.'))
  wrapper = mount(AdminIntegrations, { props: props() })
  const article = wrapper.find('article[aria-label="HeiGIT API · Rutas"]')
  const inputs = article.findAll('fieldset input')
  for (const [i, value] of [-31.4, -58, -31.5, -58.1].entries()) await inputs[i]!.setValue(String(value))
  await article.find('button').trigger('click'); await flushPromises()
  expect(test).toHaveBeenCalledWith('heigit', { origin: { lat: -31.4, lon: -58 }, destination: { lat: -31.5, lon: -58.1 } })
  expect(article.find('[role="alert"]').text()).toContain('No se pudo completar')
  expect(toast.error).toHaveBeenCalledWith('No se pudo completar la prueba de HeiGIT.')
})

it('carga camiones y prueba GESTYA sin enviar patentes desde el navegador', async () => {
  vi.spyOn(adminApi, 'vehicles').mockResolvedValue([{ id: 3, codigo_erp: '101', nombre: 'Camión', patente: 'AB123CD', activo: true, es_externo: false, wep_login_activo: true, pin_configured: true, last_imported_at: null }])
  const test = vi.spyOn(adminApi, 'testIntegration').mockResolvedValue({ provider: 'gestya', checkedAt: '2026-11-02T12:00:00Z', result: { latitude: -31.4, longitude: -58, positionDate: '2026-11-02 08:55:00' } })
  wrapper = mount(AdminIntegrations, { props: props() })
  const article = wrapper.find('article[aria-label="GESTYA · GPS"]')
  await article.findAll('button')[0]!.trigger('click'); await flushPromises()
  await article.find('select').setValue('3')
  await article.findAll('button')[1]!.trigger('click'); await flushPromises()
  expect(test).toHaveBeenCalledWith('gestya', { vehicleId: 3 })
  expect(article.text()).toContain('2026-11-02 08:55:00')
})
