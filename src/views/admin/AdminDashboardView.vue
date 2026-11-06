<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import { RefreshCw, Truck, PackageCheck, MessageCircle, AlertTriangle, Activity, Search } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import AdminUsers from '@/components/admin/AdminUsers.vue'
import AdminSettings from '@/components/admin/AdminSettings.vue'
import AdminVehicles from '@/components/admin/AdminVehicles.vue'
import type { AdminSection } from '@/components/admin/AdminSidebarContent.vue'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import AdminOperationChart from '@/components/admin/AdminOperationChart.vue'
import AdminDailyTrend from '@/components/admin/AdminDailyTrend.vue'
import AdminDeliveriesTable from '@/components/admin/AdminDeliveriesTable.vue'
import { deliveryStates as states, adminTime as time, adminTone as tone } from '@/utils/adminPresentation'
import { adminApi, adminUser } from '@/api/admin.api'
import type { DashboardData, TechnicalData } from '@/types/admin'

const router = useRouter()
function argentinaDate() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map(p => [p.type, p.value])); return `${values.year}-${values.month}-${values.day}`
}
const date = ref(argentinaDate()), vehicle = ref(''), state = ref(''), search = ref(''), page = ref(1)
const data = ref<DashboardData | null>(null), technical = ref<TechnicalData | null>(null)
const loading = ref(false), error = ref(''), technicalError = ref(''), tab = ref<AdminSection>('operation')
const autoRefresh = ref(true)
const trendDays = ref(14)
const isTic = computed(() => adminUser.value?.role === 'TIC')
let controller: AbortController | undefined
let timer: ReturnType<typeof setInterval> | undefined
const jobs: Record<string, string> = { SYNC: 'Sincronización ERP', PROGRAMADA: 'Avisos programados' }
const runStates: Record<string, string> = { OK: 'Completada', ERROR: 'Con errores', SIMULACION: 'Simulación', OMITIDA: 'Omitida', RUNNING: 'Iniciada, sin cierre registrado' }
const metrics = computed(() => {
  const s = data.value?.summary
  return s ? [
    { label: data.value?.totalGroups !== undefined ? 'Paradas' : 'Pedidos', value: data.value?.totalGroups ?? s.total, detail: `${s.total} órdenes · ${s.viajes} viajes`, icon: Truck },
    { label: 'Órdenes entregadas', value: s.entregadas, detail: 'Órdenes completadas', icon: PackageCheck },
    { label: 'Órdenes en reparto', value: s.en_reparto, detail: 'Incluye cliente avisado', icon: Activity },
    { label: 'Avisos aceptados', value: s.avisos_enviados, detail: 'Incluye entregados y leídos', icon: MessageCircle },
  ] : []
})
async function load() {
  if (!['operation', 'technical'].includes(tab.value)) return
  controller?.abort(); controller = new AbortController()
  const signal = controller.signal
  loading.value = true; error.value = ''; technicalError.value = ''
  try {
    data.value = await adminApi.dashboard(new URLSearchParams({ fecha: date.value, vehiculo: vehicle.value, estado: state.value, q: search.value, page: String(page.value), agrupar: 'parada', dias: String(trendDays.value) }), signal)
    if (tab.value === 'technical' && isTic.value) {
      try { technical.value = await adminApi.technical(date.value, signal) }
      catch (e) { if (!signal.aborted) { technical.value = null; technicalError.value = e instanceof Error ? e.message : 'No pudimos consultar el diagnóstico.' } }
    }
  } catch (e) { if (!signal.aborted) error.value = e instanceof Error ? e.message : 'No pudimos consultar WEP.' }
  finally { if (!signal.aborted) loading.value = false }
  if (!adminUser.value) await router.replace('/administracion/login')
}
function filter() { page.value = 1; void load() }
function changePeriod(days: number) { trendDays.value = days; void load() }
function turnPage(delta: number) { page.value += delta; void load() }
function selectTab(value: typeof tab.value) {
  if (value !== 'operation' && !isTic.value) return
  tab.value = value
  if (!['operation', 'technical'].includes(value)) { controller?.abort(); loading.value = false }
  else void load()
}
watch(date, () => { vehicle.value = ''; technical.value = null; filter() })
watch(adminUser, profile => { if (!profile) void router.replace('/administracion/login') })
onMounted(() => { void load(); timer = setInterval(() => { if (autoRefresh.value && !loading.value && document.visibilityState === 'visible') void load() }, 60_000) })
onBeforeUnmount(() => { controller?.abort(); if (timer) clearInterval(timer) })
</script>
<template>
  <AdminLayout :active="tab" @select="selectTab">
  <section class="mb-7 flex flex-wrap items-end justify-between gap-5">
    <div><p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Centro de control · WEP</p><h1 class="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{{ ({ operation: 'Resumen de la operación', technical: 'Diagnóstico técnico', users: 'Gestión de usuarios', settings: 'Configuración de WEP', vehicles: 'Camiones y accesos' })[tab] }}</h1><p class="mt-2 text-sm text-muted-foreground">{{ ({ operation: 'Una visión de tus entregas, viajes y comunicación con clientes.', technical: 'Estado de integraciones y automatizaciones de WEP.', users: 'Administrá las cuentas y los permisos de acceso.', settings: 'Controlá importaciones, avisos y la conexión con Meta.', vehicles: 'Gestioná el ingreso de los choferes y consultá la vinculación con el ERP.' })[tab] }}</p></div>
    <Button v-if="['operation', 'technical'].includes(tab)" variant="outline" :disabled="loading" @click="load"><RefreshCw :class="{ 'animate-spin': loading }" aria-hidden="true" />Actualizar</Button>
  </section>

  <AdminUsers v-if="tab === 'users' && isTic" />
  <AdminSettings v-else-if="tab === 'settings' && isTic" />
  <AdminVehicles v-else-if="tab === 'vehicles' && isTic" />
  <template v-else>
    <form class="mb-4 grid gap-4 rounded-xl border bg-muted/40 p-4 sm:grid-cols-2 xl:grid-cols-5" @submit.prevent="filter">
      <label class="text-xs font-semibold text-muted-foreground">Fecha de entrega<input v-model="date" type="date" required class="mt-2 block w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground"></label>
      <label class="text-xs font-semibold text-muted-foreground">Vehículo<select v-model="vehicle" class="mt-2 block w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground" @change="filter"><option value="">Todos los vehículos</option><option v-for="v in data?.vehicles" :key="v.id" :value="String(v.id)">{{ v.nombre }} · {{ v.patente }}</option></select></label>
      <label class="text-xs font-semibold text-muted-foreground">Estado<select v-model="state" class="mt-2 block w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground" @change="filter"><option value="">Todos los estados</option><option v-for="(label, code) in states" :key="code" :value="code">{{ label }}</option></select></label>
      <label class="text-xs font-semibold text-muted-foreground sm:col-span-2 xl:col-span-2">Cliente, pedido o localidad<div class="mt-2 flex gap-2"><input v-model="search" maxlength="100" placeholder="Buscar en las entregas…" class="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground"><Button variant="outline" type="submit" aria-label="Buscar entregas"><Search aria-hidden="true" /></Button></div></label>
    </form>
    <div class="mb-5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><p>{{ data ? `Consulta: ${time(data.fetchedAt)} · Hora Argentina` : 'Consultando datos de WEP' }}</p><label class="flex items-center gap-2"><input v-model="autoRefresh" type="checkbox">Actualizar cada minuto</label></div>
    <p v-if="error" role="alert" class="mb-5 rounded-xl border status-danger p-4 text-sm text-destructive">{{ error }} <span v-if="data">Los datos visibles corresponden a la última consulta correcta.</span></p>
    <p v-if="loading && !data" role="status" class="rounded-xl border bg-card p-8 text-center text-muted-foreground">Cargando información de WEP…</p>

    <template v-if="data && tab === 'operation'">
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" :class="{ 'opacity-60': loading || !!error }">
        <article v-for="metric in metrics" :key="metric.label" class="rounded-xl border bg-linear-to-b from-card to-secondary/40 p-5"><div class="flex items-center justify-between"><p class="text-xs font-medium text-muted-foreground">{{ metric.label }}</p><span class="rounded-md border bg-card p-1.5"><component :is="metric.icon" class="size-4 text-primary" aria-hidden="true" /></span></div><p class="mt-4 text-3xl font-semibold tracking-tight">{{ metric.value }}</p><p class="mt-3 text-xs text-muted-foreground">{{ metric.detail }}</p></article>
      </div>
      <AdminOperationChart :summary="data.summary" :class="{ 'opacity-60': loading || !!error }" />
      <AdminDailyTrend :points="data.trend" :days="trendDays" :loading="loading" :class="{ 'opacity-60': loading || !!error }" @period="changePeriod" />
      <div v-if="data.summary.errores_avisos || data.summary.sin_telefono || data.summary.no_entregadas" class="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border status-warning px-5 py-4 text-sm "><AlertTriangle class="size-5" aria-hidden="true" /><strong>Para revisar</strong><span>{{ data.summary.errores_avisos }} avisos con error</span><span>{{ data.summary.sin_telefono }} órdenes sin teléfono cargado</span><span>{{ data.summary.no_entregadas }} no entregadas</span></div>
      <AdminDeliveriesTable :data="data" :loading="loading" :stale="!!error" @page="turnPage" />
      <p class="mt-4 text-xs text-muted-foreground">Las paradas agrupan pedidos del mismo cliente, domicilio y viaje. Los estados y avisos se resumen por pedido; un aviso puede cubrir varios pedidos y estar registrado en otra orden de la parada. “Aceptado por WhatsApp” indica aceptación de Meta; la recepción y lectura requieren confirmación del proveedor. El indicador Paradas cuenta destinos por viaje; los demás cuentan órdenes o registros de aviso, no clientes únicos.</p>
    </template>

    <section v-if="tab === 'technical' && isTic" aria-labelledby="tech-title">
      <h2 id="tech-title" class="mb-4 text-xl font-bold">Diagnóstico técnico</h2>
      <p v-if="technicalError" role="alert" class="mb-5 rounded-xl status-danger p-4 text-destructive">{{ technicalError }}</p>
      <template v-if="technical">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article class="rounded-2xl border bg-card p-5"><h3 class="text-sm font-semibold">Base WEP</h3><p class="mt-4 text-lg font-bold text-primary">Disponible</p><p class="mt-2 text-xs text-muted-foreground">Último registro importado:<br>{{ time(technical.lastImportedRecordAt) }}</p></article>
          <article class="rounded-2xl border bg-card p-5"><h3 class="text-sm font-semibold">Avisos programados</h3><p class="mt-4 text-lg font-bold">{{ !technical.programmed ? 'Configuración inválida' : !technical.programmed.enabled ? 'Desactivados' : technical.programmed.dryRun ? 'Simulación' : 'Envío real configurado' }}</p><p v-if="technical.programmed" class="mt-2 text-xs text-muted-foreground">{{ technical.programmed.start }} a {{ technical.programmed.end }} · Cron {{ technical.programmed.cron }}</p></article>
          <article class="rounded-2xl border bg-card p-5"><h3 class="text-sm font-semibold">Sincronización general</h3><p class="mt-4 text-lg font-bold">{{ technical.sync?.enabled ? 'Habilitada' : 'Desactivada' }}</p><p class="mt-2 text-xs text-muted-foreground">Los avisos programados sincronizan el día antes de procesar, de forma independiente.</p></article>
          <article class="rounded-2xl border bg-card p-5"><h3 class="text-sm font-semibold">WhatsApp / Meta</h3><p class="mt-4 text-lg font-bold">{{ technical.whatsappConfigured ? 'Configuración presente' : 'Configuración incompleta' }}</p><p class="mt-2 text-xs text-muted-foreground">La presencia de credenciales no verifica su vigencia ni la conexión con Meta.</p></article>
        </div>
        <p v-if="!technical.configValid" role="alert" class="mt-4 rounded-xl status-danger p-4 text-sm text-destructive">Hay valores inválidos en la configuración de automatizaciones.</p>
        <p v-if="!technical.monitorEnabled || !technical.historyAvailable" class="mt-4 rounded-xl border status-warning p-4 text-sm ">El historial compartido no está habilitado o falta aplicar su migración. TIC debe configurar el monitor en el servidor.</p>
        <section class="mt-6 overflow-hidden rounded-2xl border bg-card"><div class="border-b p-5"><h3 class="text-lg font-bold">Historial compartido de automatizaciones</h3><p class="mt-1 text-xs text-muted-foreground">Últimas 30 ejecuciones iniciadas en la fecha elegida, desde todas las instancias. Los filtros de vehículo, estado y búsqueda no se aplican al historial.</p></div><div class="overflow-x-auto"><table class="w-full min-w-[650px] text-left text-sm"><thead class="border-b bg-muted/50 text-xs text-muted-foreground"><tr><th class="p-4">Tarea</th><th class="p-4">Instancia</th><th class="p-4">Inicio</th><th class="p-4">Fin</th><th class="p-4">Resultado</th></tr></thead><tbody><tr v-for="run in technical.runs" :key="run.id" class="border-b last:border-0"><td class="p-4">{{ jobs[run.job] || run.job }}</td><td class="p-4 font-mono">{{ run.instance }}</td><td class="p-4">{{ time(run.started_at) }}</td><td class="p-4">{{ run.finished_at ? time(run.finished_at) : 'Sin cierre registrado' }}</td><td class="p-4"><span class="rounded-full px-3 py-1 text-xs font-semibold" :class="tone(run.status)">{{ runStates[run.status] || run.status }}</span><p v-if="run.summary.errores" class="mt-2 text-xs text-destructive">{{ run.summary.errores }} errores de aviso</p></td></tr><tr v-if="!technical.runs.length"><td colspan="5" class="p-10 text-center text-muted-foreground">No hay ejecuciones registradas para esta fecha.</td></tr></tbody></table></div></section>
        <p class="mt-4 text-xs text-muted-foreground">Ejecutor configurado: {{ technical.executor }}. Un inicio sin cierre puede indicar una tarea en curso o un proceso interrumpido. La última importación corresponde a datos guardados; no garantiza una conexión actual con ERP.</p>
        <section class="mt-6 overflow-hidden rounded-2xl border bg-card"><div class="border-b p-5"><h3 class="text-lg font-bold">Avisos con error</h3><p class="mt-1 text-xs text-muted-foreground">Hasta 30 registros de entregas de la fecha elegida. Incluye pruebas técnicas; no muestra credenciales ni respuestas completas del proveedor.</p></div><div class="overflow-x-auto"><table class="w-full min-w-[550px] text-left text-sm"><thead class="border-b bg-muted/50 text-xs text-muted-foreground"><tr><th class="p-4">Pedido / cliente</th><th class="p-4">Tipo</th><th class="p-4">Código de error</th></tr></thead><tbody><tr v-for="notice in technical.notificationErrors" :key="notice.id" class="border-b last:border-0"><td class="p-4"><p class="font-semibold">{{ notice.pedido || 'Sin pedido' }}</p><p class="text-xs text-muted-foreground">{{ notice.cliente_nombre }}</p></td><td class="p-4">{{ notice.tipo }}</td><td class="p-4 font-mono text-xs text-destructive">{{ notice.error_codigo || 'Sin código' }}</td></tr><tr v-if="!technical.notificationErrors?.length"><td colspan="3" class="p-8 text-center text-muted-foreground">No hay errores de avisos registrados para esta fecha.</td></tr></tbody></table></div></section>
      </template>
    </section>
  </template>
  </AdminLayout>
</template>
