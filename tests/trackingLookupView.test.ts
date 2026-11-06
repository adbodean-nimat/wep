// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { ApiError } from '../src/api/http'
import TrackingLookupView from '../src/views/public/TrackingLookupView.vue'

const { lookup, push } = vi.hoisted(() => ({ lookup: vi.fn(), push: vi.fn() }))
vi.mock('@/api/trackingLookup.api', () => ({ lookupPublicTracking: lookup }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

let wrapper: VueWrapper
beforeEach(() => {
  vi.clearAllMocks()
  wrapper = mount(TrackingLookupView)
})
afterEach(() => wrapper.unmount())

async function fill(pedido = '883524', phone = '3569') {
  await wrapper.get('#pedido').setValue(pedido)
  await wrapper.get('#telefono').setValue(phone)
}

it.each([
  ['', ''], ['ABC', '3569'], ['1'.repeat(21), '3569'], ['883524', '123'],
  ['883524', '12345'], ['883524', '12ab'], ['883524', ' 123'],
])('valida campos antes de consultar (%s, %s)', async (pedido, phone) => {
  await fill(pedido, phone)
  await wrapper.get('form').trigger('submit')
  expect(wrapper.find('[aria-invalid="true"]').exists()).toBe(true)
  expect(lookup).not.toHaveBeenCalled()
  expect(push).not.toHaveBeenCalled()
})

it('bloquea doble envío, anuncia carga y navega sin incluir los datos ingresados', async () => {
  const publicId = 'abcdefghijklmnopqrstuvwx12345678'
  let finish!: (value: string) => void
  lookup.mockReturnValueOnce(new Promise<string>(resolve => { finish = resolve }))
  await fill(' 0000883524 ', '0069')
  await wrapper.get('form').trigger('submit')
  expect(wrapper.get('button').attributes('disabled')).toBeDefined()
  expect(wrapper.get('form').attributes('aria-busy')).toBe('true')
  expect(wrapper.text()).toContain('Buscando entrega...')
  await wrapper.get('form').trigger('submit')
  expect(lookup).toHaveBeenCalledTimes(1)
  expect(lookup).toHaveBeenCalledWith('0000883524', '0069', expect.any(AbortSignal))
  finish(publicId)
  await flushPromises()
  expect(push).toHaveBeenCalledExactlyOnceWith(`/s/${publicId}`)
  expect((wrapper.get('#pedido').element as HTMLInputElement).value).toBe('')
  expect((wrapper.get('#telefono').element as HTMLInputElement).value).toBe('')
})

it.each([
  [400, 'Revisá el número de pedido'],
  [404, 'No encontramos una entrega con los datos ingresados.'],
  [429, 'Realizaste varios intentos.'],
  [500, 'No pudimos consultar tu entrega en este momento.'],
  [0, 'No pudimos consultar tu entrega en este momento.'],
])('presenta un error %s seguro y permite reintentar manualmente', async (status, message) => {
  lookup.mockRejectedValueOnce(new ApiError('Contenido privado del servidor', status))
  await fill()
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain(message)
  expect(wrapper.text()).not.toContain('Contenido privado')
  expect(wrapper.get('button').attributes('disabled')).toBeUndefined()
  expect(push).not.toHaveBeenCalled()
  expect(lookup).toHaveBeenCalledTimes(1)
  lookup.mockResolvedValueOnce('abcdefghijklmnopqrstuvwx12345678')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(push).toHaveBeenCalledTimes(1)
  expect(wrapper.find('[role="alert"]').exists()).toBe(false)
})

it('cancela al salir y no navega si llega una respuesta tardía', async () => {
  let finish!: (value: string) => void
  lookup.mockReturnValueOnce(new Promise<string>(resolve => { finish = resolve }))
  await fill()
  await wrapper.get('form').trigger('submit')
  const signal = lookup.mock.calls[0]![2] as AbortSignal
  wrapper.unmount()
  expect(signal.aborted).toBe(true)
  finish('abcdefghijklmnopqrstuvwx12345678')
  await flushPromises()
  expect(push).not.toHaveBeenCalled()
})
