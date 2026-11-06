<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { adminApi } from '@/api/admin.api'
import { Button } from '@/components/ui/button'
import type { SettingsAudit } from '@/types/admin'
const props = defineProps<{ refreshKey: number }>()
const rows = ref<SettingsAudit[]>([]), error = ref(''), loading = ref(false)
const labels: Record<string, string> = { sync: 'Sincronización', programmed: 'Avisos programados', meta: 'Meta WEP', enabled: 'Habilitado', blocked: 'Importaciones bloqueadas', cron: 'Frecuencia', daysBack: 'Días anteriores', daysAhead: 'Días futuros', vehicleCodes: 'Códigos ERP', dryRun: 'Simulación', start: 'Desde', end: 'Hasta', weekdays: 'Días de semana (0 = domingo)', paused: 'Envíos pausados', phoneNumberId: 'Número emisor', apiVersion: 'Versión de API', templates: 'Plantillas', enReparto: 'En reparto', enCamino: 'En camino', enCaminoZona: 'En camino por zona', legacy: 'Aviso por cliente', programmedTest: 'Prueba programada', name: 'Nombre', language: 'Idioma', loginEnabled: 'Acceso a la PWA', pinReplaced: 'PIN reemplazado', tokenReplaced: 'Token reemplazado' }
Object.assign(labels, { integrations: 'Integraciones', gestya: 'GESTYA', google: 'Google', heigit: 'HeiGIT', timeoutMs: 'Tiempo de espera (ms)', testRouting: 'Redirección de prueba', phone: 'Teléfono' })
function flatten(value: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).flatMap(([key, v]) => {
    const name = prefix ? `${prefix} · ${labels[key] || key}` : labels[key] || key
    return v && typeof v === 'object' && !Array.isArray(v) ? Object.entries(flatten(v as Record<string, unknown>, name)) : [[name, v]]
  }))
}
function changes(row: SettingsAudit) {
  const previous = flatten(row.previous), current = flatten(row.current)
  return [...new Set([...Object.keys(previous), ...Object.keys(current)])].filter(k => JSON.stringify(previous[k]) !== JSON.stringify(current[k])).map(key => ({ key, before: format(previous[key]), after: format(current[key]) }))
}
function format(value: unknown): string { return value === undefined || value === '' ? 'Sin valor' : typeof value === 'boolean' ? value ? 'Sí' : 'No' : Array.isArray(value) ? value.join(', ') || 'Ninguno' : String(value) }
function time(value: string) { return new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) }
async function load() { loading.value = true; error.value = ''; try { rows.value = await adminApi.settingsHistory() } catch (e) { error.value = e instanceof Error ? e.message : 'No pudimos consultar el historial.' } finally { loading.value = false } }
watch(() => props.refreshKey, load)
onMounted(load)
</script>
<template>
  <section class="overflow-hidden rounded-xl border bg-card"><div class="flex items-center justify-between gap-3 border-b p-5"><div><h2 class="font-semibold">Historial de cambios</h2><p class="mt-1 text-xs text-muted-foreground">Últimos 50 cambios de configuración y accesos · Hora Argentina.</p></div><Button type="button" variant="outline" :disabled="loading" @click="load">Actualizar historial</Button></div>
    <p v-if="error" role="alert" class="p-5 text-sm text-destructive">{{ error }}</p><p v-if="loading" role="status" class="p-5 text-sm text-muted-foreground">Consultando historial…</p>
    <details v-for="row in rows" :key="row.id" class="border-b p-5 last:border-0"><summary class="cursor-pointer text-sm"><strong>{{ row.actor_name }}</strong> · {{ row.action === 'VEHICLE_ACCESS' ? `Acceso del camión ${row.target}` : 'Configuración WEP' }} · {{ time(row.created_at) }}</summary><div class="mt-4 overflow-x-auto"><table class="w-full text-left text-xs"><caption class="sr-only">Valores anteriores y nuevos</caption><thead><tr class="border-b text-muted-foreground"><th class="p-2">Parámetro</th><th class="p-2">Anterior</th><th class="p-2">Nuevo</th></tr></thead><tbody><tr v-for="change in changes(row)" :key="change.key" class="border-b last:border-0"><td class="p-2">{{ change.key }}</td><td class="p-2 break-all">{{ change.before }}</td><td class="p-2 break-all">{{ change.after }}</td></tr></tbody></table></div></details>
    <p v-if="!loading && !error && !rows.length" class="p-6 text-sm text-muted-foreground">Todavía no hay cambios registrados.</p>
  </section>
</template>
