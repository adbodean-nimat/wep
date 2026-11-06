<script setup lang="ts">
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { adminApi } from '@/api/admin.api'
import type { WepSettings, WepSettingsData, WepIntegration, AdminVehicle, IntegrationTestResult } from '@/types/admin'
const props = defineProps<{ config: WepSettings['integrations']; status: WepSettingsData['integrationStatus']; unsaved: boolean }>()
const providers: { key: WepIntegration; name: string; help: string }[] = [
  { key: 'gestya', name: 'GESTYA · GPS', help: 'Consulta la posición de los camiones. Pausarlo afecta el seguimiento y el cálculo de llegada; las entregas pueden registrarse sin posición GPS.' },
  { key: 'google', name: 'Google API · Geocodificación', help: 'Convierte direcciones en coordenadas. Pausarlo evita nuevas consultas a Google; las coordenadas ya disponibles pueden seguir utilizándose.' },
  { key: 'heigit', name: 'HeiGIT API · Rutas', help: 'Usa openrouteservice para calcular rutas y tiempos de llegada. Pausarlo impide nuevos cálculos de ruta y ETA.' },
]
const vehicles = ref<AdminVehicle[]>([]), loadingVehicles = ref(false), vehicleId = ref(''), address = ref('')
const originLat = ref<number | ''>(''), originLon = ref<number | ''>(''), destinationLat = ref<number | ''>(''), destinationLon = ref<number | ''>('')
const testing = ref<WepIntegration | null>(null), results = ref<Partial<Record<WepIntegration, IntegrationTestResult>>>({}), errors = ref<Partial<Record<WepIntegration, string>>>({})
async function loadVehicles() {
  loadingVehicles.value = true
  try { vehicles.value = await adminApi.vehicles(); errors.value.gestya = '' }
  catch (e) { errors.value.gestya = e instanceof Error ? e.message : 'No pudimos consultar los camiones.'; toast.error(errors.value.gestya) }
  finally { loadingVehicles.value = false }
}
async function test(provider: WepIntegration) {
  if (testing.value || props.unsaved) return
  testing.value = provider; errors.value[provider] = ''; delete results.value[provider]
  const input = provider === 'gestya' ? { vehicleId: Number(vehicleId.value) } : provider === 'google' ? { address: address.value }
    : { origin: { lat: originLat.value, lon: originLon.value }, destination: { lat: destinationLat.value, lon: destinationLon.value } }
  try { results.value[provider] = await adminApi.testIntegration(provider, input); toast.success('Prueba completada correctamente') }
  catch (e) { errors.value[provider] = e instanceof Error ? e.message : 'No pudimos completar la prueba.'; toast.error(errors.value[provider]) }
  finally { testing.value = null }
}
function time(value: string) { return new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) }
</script>
<template>
  <section class="rounded-xl border bg-card p-5 sm:p-6">
    <h2 class="text-lg font-semibold">GPS, direcciones y rutas</h2>
    <p class="mt-2 text-sm text-muted-foreground">Credenciales y direcciones de los servicios se mantienen en el servidor. Los controles se guardan con el botón Guardar configuración y quedan en el historial.</p>
    <p class="mt-2 text-xs text-muted-foreground">Las pruebas consultan al proveedor y pueden consumir cuota. Usan la configuración guardada y no modifican entregas ni envían WhatsApp.</p>
    <p v-if="unsaved" class="mt-3 text-sm text-amber-700 dark:text-amber-300">Guardá los cambios antes de realizar una prueba.</p>
    <div class="mt-5 space-y-5">
      <article v-for="provider in providers" :key="provider.key" class="rounded-xl border p-4" :aria-label="provider.name">
        <div class="flex flex-wrap items-center justify-between gap-2"><h3 class="font-semibold">{{ provider.name }}</h3><span class="rounded-full bg-muted px-3 py-1 text-xs">{{ status?.[provider.key]?.configured ? 'Configuración presente · sin verificar' : 'Configuración pendiente en servidor' }}</span></div>
        <p class="mt-2 text-xs leading-relaxed text-muted-foreground">{{ provider.help }}</p>
        <div class="mt-4 grid items-center gap-4 sm:grid-cols-2"><label class="flex items-center gap-2 text-sm"><input v-model="config[provider.key].enabled" type="checkbox">Consultas habilitadas</label><label class="text-xs font-semibold">Tiempo máximo de espera (ms)<input v-model.number="config[provider.key].timeoutMs" type="number" required min="1000" max="60000" step="1" class="integration-input"></label></div>
        <fieldset class="mt-5 space-y-3" :disabled="unsaved || testing !== null || !config[provider.key].enabled || !status?.[provider.key]?.configured">
          <legend class="text-sm font-semibold">Prueba manual</legend>
          <div v-if="provider.key === 'gestya'" class="flex flex-wrap items-end gap-3"><label class="min-w-40 flex-1 text-xs">Camión<select v-model="vehicleId" class="integration-input"><option value="">Seleccionar camión</option><option v-for="v in vehicles" :key="v.id" :value="String(v.id)">{{ v.nombre }} · {{ v.patente }}</option></select></label><Button type="button" variant="outline" :disabled="loadingVehicles" @click="loadVehicles">{{ loadingVehicles ? 'Cargando…' : 'Cargar camiones' }}</Button></div>
          <label v-if="provider.key === 'google'" class="block text-xs">Dirección de prueba<input v-model="address" maxlength="300" placeholder="Calle, número, localidad y provincia" class="integration-input"></label>
          <div v-if="provider.key === 'heigit'" class="grid gap-3 sm:grid-cols-2"><label class="text-xs">Latitud de origen<input v-model.number="originLat" type="number" min="-90" max="90" step="any" class="integration-input"></label><label class="text-xs">Longitud de origen<input v-model.number="originLon" type="number" min="-180" max="180" step="any" class="integration-input"></label><label class="text-xs">Latitud de destino<input v-model.number="destinationLat" type="number" min="-90" max="90" step="any" class="integration-input"></label><label class="text-xs">Longitud de destino<input v-model.number="destinationLon" type="number" min="-180" max="180" step="any" class="integration-input"></label></div>
          <Button type="button" variant="outline" :disabled="(provider.key === 'gestya' && !vehicleId) || (provider.key === 'google' && !address.trim()) || (provider.key === 'heigit' && [originLat, originLon, destinationLat, destinationLon].some(v => v === ''))" @click="test(provider.key)">{{ testing === provider.key ? 'Consultando…' : `Probar ${provider.key === 'google' ? 'Google' : provider.key === 'heigit' ? 'HeiGIT' : 'GESTYA'}` }}</Button>
        </fieldset>
        <p v-if="errors[provider.key]" role="alert" class="mt-3 text-sm text-destructive">{{ errors[provider.key] }}</p>
        <div v-if="results[provider.key]" role="status" class="mt-4 rounded-lg border status-success p-3 text-sm"><p class="font-semibold">Prueba correcta · {{ time(results[provider.key]!.checkedAt) }}</p><p v-if="provider.key === 'heigit'" class="mt-1">Tiempo: {{ results[provider.key]!.result.durationMinutes?.toFixed(1) }} min · Distancia: {{ ((results[provider.key]!.result.distanceMeters || 0) / 1000).toFixed(2) }} km</p><p v-else class="mt-1">Coordenadas: {{ results[provider.key]!.result.latitude }}, {{ results[provider.key]!.result.longitude }}</p><p v-if="provider.key === 'gestya'" class="mt-1">Fecha informada por GPS: {{ results[provider.key]!.result.positionDate || 'Sin fecha' }}</p><p v-if="provider.key === 'google'" class="mt-1">{{ results[provider.key]!.result.approximateArea ? 'Resultado por zona aproximada' : 'Dirección resuelta' }}</p><p class="mt-1 text-xs">Resultado de esta prueba; no representa monitoreo continuo.</p></div>
      </article>
    </div>
  </section>
</template>
<style scoped>
.integration-input { display: block; width: 100%; margin-top: .5rem; padding: .65rem .75rem; border: 1px solid var(--border); border-radius: .5rem; background: var(--background); color: var(--foreground); font-size: .875rem; font-weight: 400; }
</style>
