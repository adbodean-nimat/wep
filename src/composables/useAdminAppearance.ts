import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue'

export type Appearance = 'light' | 'dark' | 'system'
const storageKey = 'wep_admin_appearance'
export const appearance = ref<Appearance>('system')
const systemDark = ref(false)
export const resolvedAppearance = computed(() => appearance.value === 'system' ? systemDark.value ? 'dark' : 'light' : appearance.value)
function isAppearance(value: unknown): value is Appearance { return value === 'light' || value === 'dark' || value === 'system' }

export function setAppearance(value: string) {
  if (!isAppearance(value)) return
  appearance.value = value
  try { localStorage.setItem(storageKey, value) } catch { /* La apariencia sigue funcionando sin almacenamiento. */ }
}

/** Instalar una vez en App: la preferencia se aplica a las rutas administrativas. */
export function useAdminAppearance(active: Readonly<Ref<boolean>>) {
  try {
    const saved = localStorage.getItem(storageKey)
    appearance.value = isAppearance(saved) ? saved : 'system'
  } catch { appearance.value = 'system' }
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  systemDark.value = media.matches
  function systemChanged(event: MediaQueryListEvent) { systemDark.value = event.matches }
  function storageChanged(event: StorageEvent) {
    if (event.key === storageKey || event.key === null) appearance.value = isAppearance(event.newValue) ? event.newValue : 'system'
  }
  media.addEventListener('change', systemChanged)
  window.addEventListener('storage', storageChanged)
  watch([active, resolvedAppearance], ([enabled, theme]) => {
    const dark = enabled && theme === 'dark'
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  }, { immediate: true, flush: 'sync' })
  onBeforeUnmount(() => {
    media.removeEventListener('change', systemChanged)
    window.removeEventListener('storage', storageChanged)
    document.documentElement.classList.remove('dark')
    document.documentElement.style.removeProperty('color-scheme')
  })
}
