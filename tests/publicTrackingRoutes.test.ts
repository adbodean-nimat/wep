import { expect, it, vi } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import TrackingLookupView from '../src/views/public/TrackingLookupView.vue'

const { restore } = vi.hoisted(() => ({ restore: vi.fn() }))
// Leaflet necesita DOM; esta prueba verifica el guard, no el mapa.
vi.mock('@/components/public/TrackingMap.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/composables/useWepAuth', () => ({ useWepAuth: () => ({
  restore, isAuthenticated: { value: false }, isRestoring: { value: false }, expireSession: vi.fn(),
}) }))
vi.mock('vue-router', async importOriginal => {
  const actual = await importOriginal<typeof import('vue-router')>()
  return { ...actual, createWebHistory: actual.createMemoryHistory }
})
import router from '../src/router'

it('permite ambas rutas públicas sin restaurar sesión ni redirigir al chofer', async () => {
  for (const path of ['/s', '/s/', '/seguimiento', '/s/abcdefghijklmnopqrstuvwx12345678']) {
    // Partir de otra ruta: Vue Router deduplica navegaciones entre aliases.
    await router.push('/s/zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz')
    await router.push(path)
    expect(router.currentRoute.value.path.replace(/\/$/, '')).toBe(path.replace(/\/$/, ''))
    expect(router.currentRoute.value.meta.public).toBe(true)
  }
  expect(restore).not.toHaveBeenCalled()
})

it('presenta el formulario público accesible sin datos de entrega', async () => {
  await router.push('/s')
  const app = createSSRApp(TrackingLookupView)
  app.use(router)
  const html = await renderToString(app)
  expect(html).toContain('Seguimiento de entrega')
  expect(html).toContain('Número de pedido')
  expect(html).toContain('Últimos 4 dígitos del teléfono')
  expect(html).toContain('Ver seguimiento')
  expect(html).toContain('inputmode="numeric"')
  expect(html).toContain('maxlength="4"')
  expect(html).not.toContain('Detalles de la entrega')
})
