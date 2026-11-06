// @vitest-environment happy-dom
import { expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AdminDeliveriesTable from '../src/components/admin/AdminDeliveriesTable.vue'
import AdminDailyTrend from '../src/components/admin/AdminDailyTrend.vue'
import type { AdminDelivery, DashboardData } from '../src/types/admin'
import { groupAdminOrders, orderNotice, orderStatus, orderWindow } from '../src/utils/adminOrders'

const order: AdminDelivery = { id: 1, pedido: '880001', cliente_codigo: 'C1', cliente_nombre: 'Cliente Uno', domicilio: 'Calle 100', localidad: 'Concordia', estado: 'ENTREGADA', vehiculo: 'Camión 101', patente: 'DEMO101', vuelta: 1, viaje_estado: 'EN_REPARTO', hora_desde: '10:00', hora_hasta: '14:00', aviso_estado: null, aviso_tipo: null, aviso_fecha: null }
const data: DashboardData = { fecha: '2026-10-29', fetchedAt: '2026-10-29T12:00:00Z', page: 1, pageSize: 50, grouping: 'parada', totalGroups: 1, groups: [{ id: 'stop_1', orders: [order, { ...order, id: 2, pedido: '880002', estado: 'EN_REPARTO', aviso_estado: 'ENVIADO' }] }], deliveries: [], vehicles: [], summary: { total: 120, entregadas: 1, no_entregadas: 0, en_reparto: 1, viajes: 1, sin_telefono: 0, errores_avisos: 0, avisos_enviados: 1 } }

it('muestra una fila de cliente y conserva los estados y avisos de sus pedidos al desplegar', async () => {
  const wrapper = mount(AdminDeliveriesTable, { props: { data, loading: false, stale: false } })
  expect(wrapper.findAll('tbody > tr')).toHaveLength(1)
  expect(wrapper.text()).toContain('Entrega parcial')
  const button = wrapper.get('button[aria-expanded]')
  await button.trigger('click')
  expect(button.attributes('aria-expanded')).toBe('true')
  expect(wrapper.text()).toContain('Pedido 880001')
  expect(wrapper.text()).toContain('Pedido 880002')
  expect(wrapper.text()).toContain('Sin aviso registrado')
  expect(wrapper.text()).toContain('Aceptado por WhatsApp')
  wrapper.unmount()
})

it('calcula las páginas por paradas, aunque haya más de 50 pedidos', () => {
  const wrapper = mount(AdminDeliveriesTable, { props: { data, loading: false, stale: false } })
  expect(wrapper.text()).toContain('Página 1 de 1')
  const next = wrapper.findAll('button').find(button => button.text() === 'Siguiente')!
  expect(next.attributes('disabled')).toBeDefined()
  wrapper.unmount()
})

it('muestra un único aviso, estado y horario por pedido y no muestra las preparaciones', async () => {
  const rows = [{ ...order, pedido: '889913', op_numero: '1001', estado: 'PROGRAMADA' }, { ...order, id: 2, pedido: '889913', op_numero: '1002', estado: 'PROGRAMADA', aviso_estado: 'ENVIADO' }]
  const wrapper = mount(AdminDeliveriesTable, { props: { data: { ...data, groups: [{ id: 'stop_1', orders: rows }] }, loading: false, stale: false } })
  expect(wrapper.text()).toContain('1 de 1 pedido con aviso')
  await wrapper.get('button[aria-expanded]').trigger('click')
  const detail = wrapper.findAll('table')[1]!
  expect(detail.findAll('tbody tr')).toHaveLength(1)
  expect(detail.text().match(/Pedido 889913/g)).toHaveLength(1)
  expect(detail.text().match(/10:00 – 14:00/g)).toHaveLength(1)
  expect(detail.text().match(/Programada/g)).toHaveLength(1)
  expect(detail.text().match(/Aceptado por WhatsApp/g)).toHaveLength(1)
  expect(detail.text()).not.toContain('Sin aviso')
  expect(wrapper.text()).not.toContain('preparación')
  expect(detail.findAll('button')).toHaveLength(0)
  wrapper.unmount()
})

it('consolida avisos por fecha, conserva incidencias y no inventa una franja común', () => {
  const delivered = { ...order, aviso_estado: 'LEIDO', aviso_fecha: '2026-10-29T10:00:00Z' }
  const retry = { ...order, id: 2, aviso_estado: 'ERROR', aviso_fecha: '2026-10-29T11:00:00Z' }
  expect(orderNotice([delivered, retry])?.aviso_estado).toBe('ERROR')
  expect(orderNotice([order, delivered])?.aviso_estado).toBe('LEIDO')
  expect(orderNotice([delivered, { ...retry, aviso_fecha: null }])?.aviso_estado).toBe('ERROR')
  expect(orderNotice([order, { ...order, id: 2 }])).toBeNull()
  expect(orderNotice([{ ...delivered, aviso_fecha: null }, { ...retry, aviso_fecha: null }])?.aviso_estado).toBe('ERROR')
  expect(orderStatus([order, { ...order, estado: 'EN_REPARTO' }])).toBe('PARCIAL')
  expect(orderStatus([{ ...order, estado: 'NO_ENTREGADA' }, order])).toBe('CON_INCIDENCIAS')
  expect(orderWindow([order, { ...order, hora_desde: '16:00', hora_hasta: '18:00' }])).toBe('Franja a confirmar')
})

it('no fusiona documentos de distinto tipo o división ni órdenes sin número de pedido', () => {
  const rows = [{ ...order, pedido_division: '1', pedido_tipo: 'NP' }, { ...order, id: 2, pedido_division: '2', pedido_tipo: 'NP' }, { ...order, id: 3, pedido_division: '1', pedido_tipo: 'OTRO' }, { ...order, id: 4, pedido: null }, { ...order, id: 5, pedido: null }]
  expect(groupAdminOrders(rows)).toHaveLength(5)
})

it('compara paradas o pedidos sin cambiar el período y permite consultar días sin actividad', async () => {
  const wrapper = mount(AdminDailyTrend, { props: { days: 7, loading: false, points: [
    { fecha: '2026-10-28', paradas: 0, completadas: 0, pedidos: 0, pedidos_entregados: 0 },
    { fecha: '2026-10-29', paradas: 2, completadas: 1, pedidos: 5, pedidos_entregados: 3 },
  ] } })
  expect(wrapper.get('[aria-live]').text()).toContain('2 paradas')
  await wrapper.findAll('select')[0]!.setValue('orders')
  expect(wrapper.get('[aria-live]').text()).toContain('5 órdenes')
  await wrapper.get('rect[role="button"]').trigger('focus')
  expect(wrapper.get('[aria-live]').text()).toContain('0 órdenes')
  expect(wrapper.get('svg').html()).not.toContain('NaN')
  await wrapper.findAll('select')[1]!.setValue('30')
  expect(wrapper.emitted('period')).toEqual([[30]])
  wrapper.unmount()
})
