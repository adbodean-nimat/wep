// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({
  restore: vi.fn().mockRejectedValue(new Error('No restaurar sesión en rutas públicas')),
  isAuthenticated: { value: false }, isRestoring: { value: true }, expireSession: vi.fn(),
}))
vi.mock('../src/composables/useWepAuth', () => ({ useWepAuth: () => auth }))

it('la ruta real /s es pública y conserva /s/:publicId sin restaurar sesión', async () => {
  const { default: router } = await import('../src/router')
  await router.push('/s')
  expect(router.currentRoute.value.name).toBe('public-tracking-lookup')
  expect(router.currentRoute.value.meta.public).toBe(true)
  expect(router.resolve('/s/abcdefghijklmnopqrstuvwx12345678').name).toBe('public-tracking')
  expect(auth.restore).not.toHaveBeenCalled()
})
