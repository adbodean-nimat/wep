<script setup lang="ts">
import { computed } from 'vue'
import { Sun, Moon, Monitor } from '@lucide/vue'
import { appearance, setAppearance } from '@/composables/useAdminAppearance'
const icon = computed(() => ({ light: Sun, dark: Moon, system: Monitor })[appearance.value])
</script>
<template>
  <label class="inline-flex shrink-0 items-center gap-1.5 rounded-md border bg-card px-2.5 py-1.5 text-xs text-foreground">
    <component :is="icon" class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
    <span class="sr-only">Apariencia</span>
    <select :value="appearance" class="min-h-7 min-w-0 bg-transparent text-xs" @change="setAppearance(($event.target as HTMLSelectElement).value)">
      <option value="light">Claro</option><option value="dark">Oscuro</option><option value="system">Sistema</option>
    </select>
  </label>
</template>
