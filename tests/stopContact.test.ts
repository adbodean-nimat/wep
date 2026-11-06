// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest'
import { flushPromises, mount, shallowMount } from '@vue/test-utils'
import StopActions from '../src/components/stops/StopActions.vue'
import StopCard from '../src/components/stops/StopCard.vue'
import { wepApi } from '../src/api/wep.api'
import type { DeliveryDetailResponse, WepStop } from '../src/types/wep'

const stop: WepStop = {
  grupoId: 'stop_test', ordenSecuencia: 1, cliente: { codigo: '1', nombre: 'Cliente' },
  domicilio: 'Calle 100', localidad: 'Concordia', estado: { codigo: 'EN_REPARTO', nombre: 'En reparto' },
  cantidadOrdenes: 2, totales: { bultos: 2, peso: 0, volumen: 0 }, horaDesde: null, horaHasta: null,
  entregas: [1, 2].map(id => ({ id, ordenSecuencia: id, estado: { codigo: 'EN_REPARTO', nombre: 'En reparto' },
    ordenPreparacion: { division: null, tipo: null, numero: id }, notaPedido: { division: null, tipo: null, numero: id },
    bultos: 1, peso: 0, volumen: 0 })),
}
const response = (telefono: string | null, telefonoAlternativo: string | null) => ({
  ok: true, entrega: { contacto: { telefono, telefonoAlternativo, email: null } },
} as DeliveryDetailResponse)
afterEach(() => vi.restoreAllMocks())

it('bloquea aviso y llamada sin teléfonos, pero permite registrar la entrega', async () => {
  const wrapper = mount(StopActions, { props: { stop, inProgress: true, disabled: false, phone: null } })
  const button = (label: string) => wrapper.findAll('button').find(button => button.text() === label)!
  expect(button('Avisar cliente').attributes('disabled')).toBeDefined()
  expect(button('Llamar').attributes('disabled')).toBeDefined()
  expect(wrapper.text()).toContain('Sin teléfono principal ni alternativo')
  await button('Entregado').trigger('click')
  expect(wrapper.emitted('deliver')).toHaveLength(1)
  expect(button('No entregado').attributes('disabled')).toBeUndefined()
  await wrapper.setProps({ phone: '3454331234' })
  await button('Avisar cliente').trigger('click')
  expect(wrapper.emitted('notice')).toHaveLength(1)
  wrapper.unmount()
})

it('espera los detalles y usa el alternativo de otra orden de la parada', async () => {
  let complete!: (value: DeliveryDetailResponse) => void
  vi.spyOn(wepApi, 'delivery').mockResolvedValueOnce(response(null, null))
    .mockImplementationOnce(() => new Promise(resolve => { complete = resolve }))
  const wrapper = shallowMount(StopCard, { props: { stop, sequence: 1, reorder: false, first: true, last: true, inProgress: true, disabled: false, reasons: {} } })
  expect(wrapper.getComponent(StopActions).props('contactLoading')).toBe(true)
  complete(response(null, '3454 33-1234'))
  await flushPromises()
  expect(wrapper.getComponent(StopActions).props()).toMatchObject({ phone: '3454331234', contactLoading: false, contactError: false })
  wrapper.unmount()
})

it('distingue un error de consulta de una parada sin teléfonos', async () => {
  vi.spyOn(wepApi, 'delivery').mockRejectedValue(new Error('Sin conexión'))
  const wrapper = shallowMount(StopCard, { props: { stop, sequence: 1, reorder: false, first: true, last: true, inProgress: true, disabled: false, reasons: {} } })
  await flushPromises()
  expect(wrapper.getComponent(StopActions).props()).toMatchObject({ phone: null, contactLoading: false, contactError: true })
  wrapper.unmount()
})
