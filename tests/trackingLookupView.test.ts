// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { ApiError } from '../src/api/http'
import TrackingLookupView from '../src/views/public/TrackingLookupView.vue'
import { lookupPublicTracking } from '../src/api/trackingLookup.api'

vi.mock('../src/api/trackingLookup.api', async importOriginal => ({
  ...await importOriginal<typeof import('../src/api/trackingLookup.api')>(),
  lookupPublicTracking: vi.fn(),
}))
const lookup = vi.mocked(lookupPublicTracking)
const publicId = 'abcdefghijklmnopqrstuvwx12345678'
let wrapper: VueWrapper | undefined
beforeEach(() => { lookup.mockReset() })
afterEach(() => { wrapper?.unmount(); wrapper = undefined })

async function page() {
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/s', name: 'public-tracking-lookup', component: TrackingLookupView, meta: { public: true } },
    { path: '/s/:publicId', name: 'public-tracking', component: { template: '<p>Seguimiento</p>' }, meta: { public: true } },
  ] })
  await router.push('/s')
  wrapper = mount(TrackingLookupView, { global: { plugins: [router] } })
  return { router, view: wrapper }
}
async function fill(view: VueWrapper) {
  await view.get('#pedido').setValue('883524')
  await view.get('#telefono').setValue('0056')
}

describe('formulario público', () => {
  it('valida sin consultar y marca campos accesibles', async () => {
    const { view } = await page()
    await view.get('form').trigger('submit')
    expect(lookup).not.toHaveBeenCalled()
    expect(view.get('#pedido').attributes('aria-invalid')).toBe('true')
    expect(view.get('#telefono').attributes('aria-invalid')).toBe('true')
    expect(view.findAll('[role="alert"]')).toHaveLength(2)
  })

  it('muestra carga, evita doble envío y redirige solo con publicId', async () => {
    let resolve!: (value: string) => void
    lookup.mockImplementation(() => new Promise(done => { resolve = done }))
    const { router, view } = await page()
    await fill(view)
    await view.get('form').trigger('submit')
    expect(view.text()).toContain('Buscando entrega...')
    expect(view.get('button').attributes('disabled')).toBeDefined()
    await view.get('form').trigger('submit')
    expect(lookup).toHaveBeenCalledTimes(1)
    expect(lookup).toHaveBeenCalledWith({ pedido: '883524', telefonoUltimos4: '0056' }, expect.any(AbortSignal))
    resolve(publicId)
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe(`/s/${publicId}`)
    expect(router.currentRoute.value.query).toEqual({})
    expect((view.get('#telefono').element as HTMLInputElement).value).toBe('')
  })

  it.each([
    [400, 'Revisá el número de pedido'], [404, 'No encontramos una entrega'],
    [429, 'Realizaste varios intentos'], [500, 'No pudimos consultar tu entrega'],
    [0, 'No pudimos consultar tu entrega'],
  ])('presenta HTTP %s y permite corregir y reintentar', async (status, message) => {
    lookup.mockRejectedValueOnce(new ApiError('No mostrar datos 0056', status as number)).mockResolvedValueOnce(publicId)
    const { router, view } = await page()
    await fill(view)
    await view.get('form').trigger('submit')
    await flushPromises()
    expect(view.get('[role="alert"]').text()).toContain(message)
    expect(view.text()).not.toContain('0056')
    expect(router.currentRoute.value.path).toBe('/s')
    expect(view.get('button').attributes('disabled')).toBeUndefined()
    await view.get('form').trigger('submit')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe(`/s/${publicId}`)
  })

  it('cancela la consulta al salir sin redirección tardía', async () => {
    let resolve!: (value: string) => void
    lookup.mockImplementation(() => new Promise(done => { resolve = done }))
    const { router, view } = await page()
    await fill(view)
    await view.get('form').trigger('submit')
    const signal = lookup.mock.calls[0]![1]!
    view.unmount()
    wrapper = undefined
    const pathAfterUnmount = router.currentRoute.value.path
    expect(signal.aborted).toBe(true)
    resolve(publicId)
    await flushPromises()
    expect(router.currentRoute.value.path).toBe(pathAfterUnmount)
  })
})
