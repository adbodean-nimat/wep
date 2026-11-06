// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { appearance, resolvedAppearance, setAppearance, useAdminAppearance } from '../src/composables/useAdminAppearance'

let wrapper: VueWrapper | undefined
let systemListener: ((event: MediaQueryListEvent) => void) | undefined
let media: MediaQueryList
const active = ref(true)
function start() {
  wrapper = mount(defineComponent({ setup() { useAdminAppearance(active); return () => null } }))
}
beforeEach(() => {
  localStorage.clear(); active.value = true; appearance.value = 'system'; systemListener = undefined
  media = { matches: false, addEventListener: vi.fn((_event, listener) => { systemListener = listener }), removeEventListener: vi.fn() } as unknown as MediaQueryList
  vi.spyOn(window, 'matchMedia').mockReturnValue(media)
})
afterEach(() => { wrapper?.unmount(); wrapper = undefined; vi.restoreAllMocks() })

it('restaura la preferencia oscura y persiste los cambios explícitos', () => {
  localStorage.setItem('wep_admin_appearance', 'dark'); start()
  expect(document.documentElement.classList.contains('dark')).toBe(true)
  setAppearance('light')
  expect(document.documentElement.classList.contains('dark')).toBe(false)
  expect(localStorage.getItem('wep_admin_appearance')).toBe('light')
})

it('Sistema sigue al equipo y los modos explícitos prevalecen', () => {
  start()
  systemListener?.({ matches: true } as MediaQueryListEvent)
  expect(resolvedAppearance.value).toBe('dark')
  expect(document.documentElement.classList.contains('dark')).toBe(true)
  setAppearance('light')
  systemListener?.({ matches: false } as MediaQueryListEvent)
  systemListener?.({ matches: true } as MediaQueryListEvent)
  expect(document.documentElement.classList.contains('dark')).toBe(false)
  setAppearance('system')
  expect(document.documentElement.classList.contains('dark')).toBe(true)
})

it('limita el modo oscuro a Administración sin perder la elección al salir', () => {
  start(); setAppearance('dark'); active.value = false
  expect(document.documentElement.classList.contains('dark')).toBe(false)
  expect(appearance.value).toBe('dark')
  active.value = true
  expect(document.documentElement.classList.contains('dark')).toBe(true)
})

it('usa Sistema ante una preferencia inválida y permite cambiar sin almacenamiento', () => {
  localStorage.setItem('wep_admin_appearance', 'invalid'); start()
  expect(appearance.value).toBe('system')
  vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Blocked') })
  expect(() => setAppearance('dark')).not.toThrow()
  expect(document.documentElement.classList.contains('dark')).toBe(true)
})

it('sincroniza preferencias entre pestañas y limpia la suscripción al salir', () => {
  start()
  window.dispatchEvent(new StorageEvent('storage', { key: 'wep_admin_appearance', newValue: 'dark' }))
  expect(document.documentElement.classList.contains('dark')).toBe(true)
  wrapper?.unmount(); wrapper = undefined
  expect(media.removeEventListener).toHaveBeenCalledWith('change', systemListener)
  expect(document.documentElement.classList.contains('dark')).toBe(false)
})
