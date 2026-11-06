<script setup lang="ts">
import { toast } from 'vue-sonner'
import { computed, onMounted, onBeforeUnmount, ref, toRaw } from 'vue'
import { adminApi } from '@/api/admin.api'
import { Button } from '@/components/ui/button'
import AdminChangeHistory from './AdminChangeHistory.vue'
import AdminIntegrations from './AdminIntegrations.vue'
import type { WepSettings, WepSettingsData, WepTemplateType } from '@/types/admin'

const data = ref<WepSettingsData | null>(null), config = ref<WepSettings | null>(null)
const codes = ref(''), token = ref(''), busy = ref(false), error = ref(''), savedRevision = ref(0)
const baseline = ref(''), statusError = ref('')
const templates: { type: WepTemplateType; label: string; help: string }[] = [
  { type: 'programmed', label: 'Entrega programada', help: 'Pedido, franja horaria y botón de seguimiento.' },
  { type: 'enReparto', label: 'En reparto', help: 'Pedido y botón de seguimiento.' },
  { type: 'enCamino', label: 'En camino', help: 'Pedido, llegada estimada y botón de seguimiento.' },
  { type: 'enCaminoZona', label: 'En camino · ubicación aproximada', help: 'Variante cuando se usa una zona aproximada para calcular la llegada.' },
]
const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const dirty = computed(() => !!config.value && (JSON.stringify(config.value) + codes.value !== baseline.value || !!token.value))
const executor = computed(() => data.value?.applied.find(item => item.executor && item.revision === data.value?.revision && Date.now() - new Date(item.applied_at).getTime() < 60000))
const remoteChanged = computed(() => !!data.value && data.value.revision !== savedRevision.value)
let timer: ReturnType<typeof setInterval> | undefined
function time(value: string | null | undefined) { return value ? new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : 'Sin próxima ejecución' }
async function load() {
  busy.value = true; error.value = ''
  try { accept(await adminApi.settings()) }
  catch (e) { error.value = e instanceof Error ? e.message : 'No pudimos consultar la configuración.' }
  finally { busy.value = false }
}
function accept(result: WepSettingsData) {
  data.value = result; config.value = structuredClone(result.config); savedRevision.value = result.revision
  codes.value = result.config.sync.vehicleCodes.join(', '); token.value = ''; baseline.value = JSON.stringify(config.value) + codes.value
}
async function refreshStatus() {
  try { data.value = await adminApi.settings(); statusError.value = '' }
  catch { statusError.value = 'No pudimos verificar si la configuración ya fue aplicada.' }
}
async function save() {
  if (!config.value) return
  busy.value = true; error.value = ''
  try {
    const next = structuredClone(toRaw(config.value))
    next.sync.vehicleCodes = codes.value.split(',').map(v => v.trim()).filter(Boolean)
    accept(await adminApi.saveSettings(next, savedRevision.value, token.value || undefined))
    toast.success('Configuración guardada', { description: 'La aplicación de los horarios se verifica a continuación.' })
  } catch (e) { error.value = e instanceof Error ? e.message : 'No pudimos guardar la configuración.'; toast.error(error.value) }
  finally { busy.value = false }
}
onMounted(() => { void load(); timer = setInterval(() => { if (!busy.value && document.visibilityState === 'visible') void refreshStatus() }, 15000) })
onBeforeUnmount(() => { if (timer) clearInterval(timer); token.value = '' })
</script>

<template>
  <div class="space-y-5">
    <p v-if="error" role="alert" class="rounded-xl border status-danger p-4 text-sm text-destructive">{{ error }}</p>
    <div v-if="!config" class="rounded-xl border p-6 text-sm"><p>{{ busy ? 'Cargando configuración…' : 'No se pudo cargar la configuración de WEP.' }}</p><Button v-if="!busy" variant="outline" class="mt-4" @click="load">Reintentar</Button></div>
    <template v-if="config && data">
      <p v-if="data.config.meta.testRouting.enabled" role="status" class="rounded-xl border status-warning p-4 text-sm"><strong>Teléfono de prueba activo: +{{ data.config.meta.testRouting.phone }}.</strong> Los avisos de WEP se redirigen a ese número. Los estados y registros operativos continúan funcionando normalmente.</p>
      <section class="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-muted/30 p-5" aria-label="Estado de configuración">
        <div><p class="font-semibold">Versión guardada: {{ data.revision }} · {{ executor ? 'Aplicada en el ejecutor' : 'Pendiente de confirmar en el ejecutor' }}</p><p class="mt-1 text-xs text-muted-foreground">Los horarios se aplican en hasta 15 segundos. Hora de Argentina.</p><p v-if="executor" class="mt-2 text-xs">Próximo ciclo de sincronización: {{ time(executor.next_sync_at) }} · Próximo ciclo de avisos: {{ time(executor.next_programmed_at) }}</p><p class="mt-1 text-xs text-muted-foreground">Los avisos se procesan únicamente dentro de los días y horarios permitidos.</p><p v-if="statusError" role="alert" class="mt-2 text-sm text-destructive">{{ statusError }}</p></div>
        <Button type="button" variant="outline" :disabled="busy" @click="refreshStatus">Verificar aplicación</Button>
      </section>
      <div v-if="remoteChanged" role="alert" class="rounded-xl border status-warning p-4 text-sm">Hay una versión guardada por otra persona. Tus cambios siguen en pantalla. <Button type="button" variant="outline" :disabled="busy" class="ml-2" @click="load">Cargar versión guardada</Button></div>
      <form class="space-y-5" @submit.prevent="save">
        <fieldset :disabled="busy" class="space-y-5 disabled:opacity-60">
          <section class="rounded-xl border bg-card p-5 sm:p-6">
            <h2 class="text-lg font-semibold">Sincronización de entregas</h2>
            <label class="mt-5 flex items-start gap-3"><input v-model="config.sync.enabled" type="checkbox" class="mt-1"><span><strong class="text-sm">Sincronización automática activa</strong><span class="mt-1 block text-xs text-muted-foreground">Importa periódicamente. Al pausarla, siguen disponibles las importaciones manuales y las previas a los avisos.</span></span></label>
            <label class="mt-4 flex items-start gap-3 rounded-lg border border-destructive/30 p-4"><input v-model="config.sync.blocked" type="checkbox" class="mt-1"><span><strong class="text-sm">Bloquear todas las importaciones</strong><span class="mt-1 block text-xs text-muted-foreground">Tiene prioridad sobre los otros controles. Bloquea nuevas importaciones automáticas, manuales y previas a los avisos. Los avisos programados se omiten; una importación iniciada puede finalizar.</span></span></label>
            <div class="mt-5 grid gap-4 sm:grid-cols-3">
              <label class="field-label">Frecuencia (cron)<input v-model="config.sync.cron" required maxlength="100" class="field" aria-describedby="sync-cron-help"><span id="sync-cron-help" class="field-help">Ejemplo: */5 * * * * = cada 5 minutos.</span></label>
              <label class="field-label">Días anteriores<input v-model.number="config.sync.daysBack" type="number" required min="0" max="30" class="field"></label>
              <label class="field-label">Días futuros<input v-model.number="config.sync.daysAhead" type="number" required min="0" max="90" class="field"></label>
            </div>
            <label class="field-label mt-4 block">Códigos de vehículos del ERP<input v-model="codes" class="field" maxlength="8200" placeholder="101, 102, 103"><span class="field-help">Separados por comas. Vacío excluye todos. Quitar un código impide futuras importaciones de ese vehículo; sus entregas y accesos existentes se conservan.</span></label>
          </section>
          <section class="rounded-xl border bg-card p-5 sm:p-6">
            <h2 class="text-lg font-semibold">Avisos programados</h2>
            <div class="mt-5 flex flex-wrap gap-6 text-sm"><label class="flex items-center gap-2"><input v-model="config.programmed.enabled" type="checkbox">Automatización activa</label><label class="flex items-center gap-2"><input v-model="config.programmed.dryRun" type="checkbox">Modo simulación · sin enviar mensajes</label></div>
            <p v-if="!config.programmed.dryRun" class="mt-3 text-sm font-medium text-amber-700 dark:text-amber-300">{{ config.meta.testRouting.enabled ? 'Envío de prueba: los avisos se dirigirán al teléfono de prueba guardado.' : 'Modo real: se enviarán mensajes a clientes cuando la automatización y WhatsApp estén habilitados.' }}</p>
            <div class="mt-5 grid gap-4 sm:grid-cols-3"><label class="field-label">Frecuencia (cron)<input v-model="config.programmed.cron" required maxlength="100" class="field"><span class="field-help">Cinco campos; por ejemplo */5 * * * *.</span></label><label class="field-label">Desde<input v-model="config.programmed.start" required type="time" class="field"></label><label class="field-label">Hasta (excluido)<input v-model="config.programmed.end" required type="time" class="field"></label></div>
            <fieldset class="mt-4"><legend class="field-label">Días permitidos</legend><div class="mt-3 flex flex-wrap gap-4"><label v-for="(day, index) in days" :key="day" class="flex items-center gap-2 text-sm"><input v-model="config.programmed.weekdays" type="checkbox" :value="index">{{ day }}</label></div></fieldset>
            <p class="mt-4 text-xs text-muted-foreground">Antes de cada ciclo se sincronizan las entregas del día. Si la importación está bloqueada, falla o está ocupada, no se envían los avisos.</p>
          </section>
          <section class="rounded-xl border bg-card p-5 sm:p-6">
            <h2 class="text-lg font-semibold">Meta · WhatsApp exclusivo de WEP</h2><p class="mt-2 text-sm text-muted-foreground">Estos valores corresponden a WEP. Los avisos de deuda mantienen su configuración independiente.</p>
            <label class="mt-5 flex items-center gap-3 text-sm font-semibold"><input v-model="config.meta.paused" type="checkbox">Pausar todos los envíos de WhatsApp de WEP</label>
            <fieldset class="mt-5 space-y-3 rounded-xl border border-amber-500/40 p-4" aria-label="Teléfono de prueba">
              <legend class="px-1 text-sm font-semibold">Pruebas de WhatsApp</legend>
              <label class="flex items-center gap-2 text-sm font-semibold"><input v-model="config.meta.testRouting.enabled" type="checkbox">Redirigir todos los avisos a un teléfono de prueba</label>
              <label class="field-label block">Teléfono internacional de prueba<input v-model="config.meta.testRouting.phone" type="tel" autocomplete="off" :required="config.meta.testRouting.enabled" maxlength="40" placeholder="+549…" class="field"><span class="field-help">Incluí el código de país. Al habilitarlo, todos los tipos de aviso de WEP usarán este número, incluso para entregas sin teléfono. Los teléfonos originales del ERP se conservan.</span></label>
              <p class="text-xs leading-relaxed text-muted-foreground">Este modo envía mensajes reales al número indicado. Conserva las validaciones, los estados de las entregas y la deduplicación: no reenvía avisos ya enviados. Usalo con datos de prueba. La simulación sigue sin enviar mensajes; la pausa de WhatsApp tiene prioridad.</p>
              <p class="text-xs text-muted-foreground">Los cambios se aplican al guardar. Al deshabilitar este modo, los siguientes avisos volverán a los teléfonos de los clientes. Los avisos de deuda son independientes.</p>
            </fieldset>
            <div class="mt-5 grid gap-4 sm:grid-cols-2"><label class="field-label">Identificador del número emisor<input v-model="config.meta.phoneNumberId" inputmode="numeric" pattern="[0-9]*" maxlength="30" class="field"></label><label class="field-label">Versión de API<input v-model="config.meta.apiVersion" placeholder="vXX.X" maxlength="8" class="field"></label></div>
            <label class="field-label mt-4 block">Token de acceso · {{ data.tokenConfigured ? 'Configurado' : 'Pendiente' }}<input v-model="token" type="password" autocomplete="new-password" maxlength="4096" class="field" placeholder="Ingresar solo para establecer o reemplazar"><span class="field-help">Se guarda cifrado. Vacío conserva el token actual. La presencia de un token no confirma su vigencia en Meta.</span></label>
            <div class="mt-6 space-y-4"><article v-for="item in templates" :key="item.type" class="rounded-xl border p-4"><label class="flex items-center gap-2 text-sm font-semibold"><input v-model="config.meta.templates[item.type].enabled" type="checkbox">{{ item.label }}</label><p class="mt-1 text-xs text-muted-foreground">{{ item.help }}</p><div class="mt-3 grid gap-3 sm:grid-cols-2"><label class="field-label">Nombre de plantilla<input v-model="config.meta.templates[item.type].name" maxlength="100" pattern="[a-z0-9_]*" class="field"></label><label class="field-label">Idioma<input v-model="config.meta.templates[item.type].language" required maxlength="8" class="field" placeholder="es_AR"></label></div></article></div>
          </section>
          <AdminIntegrations :config="config.integrations" :status="data.integrationStatus" :unsaved="dirty" />
        </fieldset>
        <div class="sticky bottom-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-lg"><p class="text-sm text-muted-foreground">{{ dirty ? 'Hay cambios sin guardar.' : 'Sin cambios pendientes.' }} Todos los cambios quedan registrados.</p><Button type="submit" :disabled="busy || !dirty || remoteChanged">{{ busy ? 'Guardando…' : 'Guardar configuración' }}</Button></div>
      </form>
      <AdminChangeHistory :refresh-key="savedRevision" />
    </template>
  </div>
</template>

<style scoped>
.field-label { font-size: .8rem; font-weight: 600; }
.field { display: block; width: 100%; margin-top: .5rem; padding: .65rem .75rem; border: 1px solid var(--border); border-radius: .5rem; background: var(--background); color: var(--foreground); font-size: .875rem; font-weight: 400; }
.field-help { display: block; margin-top: .4rem; font-size: .75rem; font-weight: 400; color: var(--muted-foreground); line-height: 1.5; }
</style>
