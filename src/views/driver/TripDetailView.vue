<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount, onMounted } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute } from 'vue-router'
import { ArrowLeft, CheckCircle, Flag, Play, RefreshCw, Save, Truck, TriangleAlert } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import ConfirmDialog from '@/components/app/ConfirmDialog.vue'
import LoadingState from '@/components/app/LoadingState.vue'
import ErrorState from '@/components/app/ErrorState.vue'
import EmptyState from '@/components/app/EmptyState.vue'
import StopCard from '@/components/stops/StopCard.vue'
import DeliveryStatusBadge from '@/components/deliveries/DeliveryStatusBadge.vue'
import NoDeliveryDialog from '@/components/deliveries/NoDeliveryDialog.vue'
import QrFloatingActionButton from '@/components/qr/QrFloatingActionButton.vue'
import QrScannerDialog from '@/components/qr/QrScannerDialog.vue'
import { wepApi } from '@/api/wep.api'
import { ApiError } from '@/api/http'
import { useWepAuth } from '@/composables/useWepAuth'
import type { NoDeliveryPayload, NoDeliveryReason, StopNoticeResponse, Trip, WepStop } from '@/types/wep'
import { dateFromLocal, displayDate, errorMessage, localDate, validLocalDate } from '@/utils/formatters'
import { flattenStopDeliveries, moveStop, pendingStopCount, totalOrderCount } from '@/utils/stops'

const route = useRoute()
const auth = useWepAuth()
const date = computed(() => validLocalDate(route.query.fecha) ? route.query.fecha : localDate())
const trip = ref<Trip | null>(null)
const stops = ref<WepStop[]>([])
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const noDelivery = ref<WepStop | null>(null)
const qrOpen = ref(false)
const checkingUpdates = ref(false)
const newOrders = ref(0)
const needsReview = ref(false)
// Información devuelta por POST; sólo vive en esta pantalla, nunca en almacenamiento persistente.
const reasons = ref<Record<number, NoDeliveryReason>>({})
type Confirmation = { title: string; description: string; label: string; busyLabel?: string; run: () => Promise<unknown>; success: string | ((result: unknown) => string) }
const confirmation = ref<Confirmation | null>(null)
const dirty = computed(() => stops.value.some((stop, index) => stop.grupoId !== trip.value?.paradas[index]?.grupoId))
const pending = computed(() => pendingStopCount(stops.value))
const orders = computed(() => totalOrderCount(stops.value))
const stopSummary = computed(() => ({
  entregadas: stops.value.filter(stop => stop.estado.codigo === 'ENTREGADA').length,
  noEntregadas: stops.value.filter(stop => stop.estado.codigo === 'NO_ENTREGADA').length,
  canceladas: stops.value.filter(stop => stop.estado.codigo === 'CANCELADA').length,
  parciales: stops.value.filter(stop => stop.estado.codigo === 'CERRADA_PARCIAL').length,
}))
let controller: AbortController | undefined
let updateTimer: ReturnType<typeof setInterval> | undefined

function deliveryIds(value: Trip): number[] {
  return flattenStopDeliveries(value.paradas).map(delivery => delivery.id).filter((id): id is number => id !== null)
}

function applyTrip(latest: Trip) {
  const previous = trip.value
  if (previous?.id === latest.id && previous.estado === 'PROGRAMADO' && latest.estado === 'PROGRAMADO') {
    const oldIds = new Set(deliveryIds(previous))
    const latestIds = deliveryIds(latest)
    const added = latestIds.filter(id => !oldIds.has(id)).length
    if (added || latestIds.length !== oldIds.size) {
      newOrders.value = added
      needsReview.value = true
      confirmation.value = null
      toast.info(added ? `Hay ${added} ${added === 1 ? 'orden nueva' : 'órdenes nuevas'} en esta vuelta.` : 'Cambiaron las órdenes de esta vuelta.', { duration: 8000 })
    }
  }
  if (latest.estado !== 'PROGRAMADO') { newOrders.value = 0; needsReview.value = false; confirmation.value = null }
  trip.value = latest
  stops.value = [...latest.paradas]
}

async function checkForUpdates(): Promise<boolean> {
  const current = trip.value
  if (!current?.id || current.estado !== 'PROGRAMADO' || busy.value || loading.value || checkingUpdates.value || dirty.value) return false
  checkingUpdates.value = true
  const id = current.id
  const selectedDate = date.value
  try {
    const latest = (await wepApi.trips(selectedDate)).viajes.find(item => item.id === id)
    if (route.params.id !== String(id) || date.value !== selectedDate) return false
    if (!latest) throw new Error('La vuelta ya no está disponible. Actualizá la pantalla.')
    const changed = latest.estado !== current.estado || deliveryIds(latest).join(',') !== deliveryIds(current).join(',')
    if (changed) applyTrip(latest)
    return changed
  } finally { checkingUpdates.value = false }
}

async function prepareStart() {
  if (busy.value || checkingUpdates.value || dirty.value || needsReview.value || trip.value?.estado !== 'PROGRAMADO') return
  try {
    if (await checkForUpdates()) return
    confirmTrip('start')
  } catch (e) { toast.error(errorMessage(e), { duration: 6500 }) }
}

async function startWithFreshOrders(id: number, expectedIds: number[]) {
  const latest = (await wepApi.trips(date.value)).viajes.find(item => item.id === id)
  if (!latest || latest.estado !== 'PROGRAMADO') throw new Error('La vuelta cambió. Actualizá antes de iniciarla.')
  const latestIds = deliveryIds(latest)
  if (latestIds.length !== expectedIds.length || latestIds.some((item, index) => item !== expectedIds[index])) {
    applyTrip(latest)
    throw new Error('Cambiaron las órdenes. Revisá la vuelta antes de iniciarla.')
  }
  return wepApi.start(id)
}

async function load() {
  controller?.abort()
  controller = new AbortController()
  const signal = controller.signal
  loading.value = true
  error.value = ''
  try {
    const id = Number(route.params.id)
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error('El identificador de vuelta no es válido.')
    const response = await wepApi.trips(date.value, signal)
    if (signal.aborted) return
    const found = response.viajes.find(t => t.id === id)
    if (!found) throw new Error('No encontramos esta vuelta para la fecha seleccionada. Volvé a los viajes del día.')
    // El backend ya ordena paradas y órdenes internas por secuencia, incluidos los null.
    applyTrip(found)
  } catch (e) {
    if (!signal.aborted) { trip.value = null; stops.value = []; error.value = errorMessage(e) }
  } finally { if (!signal.aborted) loading.value = false }
}
async function perform(run: () => Promise<unknown>, success: string | ((result: unknown) => string)) {
  if (busy.value || loading.value || !trip.value) return
  busy.value = true
  try {
    const result = await run()
    toast.success(typeof success === 'function' ? success(result) : success)
  } catch (e) {
    toast.error(e instanceof ApiError && e.code === 'ETA_NO_DISPONIBLE'
      ? 'No pudimos calcular el tiempo estimado. Intentá nuevamente.'
      : errorMessage(e), { duration: 6500 })
  }
  finally {
    confirmation.value = null
    noDelivery.value = null
    // También refrescar tras 409 o timeout: la operación puede haberse aplicado en servidor.
    if (auth.isAuthenticated.value) await load()
    busy.value = false
  }
}
function confirmTrip(kind: 'start' | 'finish') {
  const id = trip.value?.id
  if (!id || busy.value || dirty.value) return
  const expectedIds = deliveryIds(trip.value!)
  confirmation.value = kind === 'start'
    ? { title: '¿Iniciar esta vuelta?', description: `Vuelta ${trip.value!.numeroVuelta}. Se pondrán las órdenes en reparto y ya no podrás cambiar el orden de las paradas.`, label: 'Iniciar vuelta', run: () => startWithFreshOrders(id, expectedIds), success: 'Vuelta iniciada' }
    : { title: '¿Finalizar esta vuelta?', description: `${stopSummary.value.entregadas} entregadas · ${stopSummary.value.noEntregadas} no entregadas · ${stopSummary.value.canceladas} canceladas${stopSummary.value.parciales ? ` · ${stopSummary.value.parciales} cerradas parcialmente` : ''}.`, label: 'Finalizar vuelta', run: () => wepApi.finish(id), success: 'Vuelta finalizada' }
}
function confirmStop(stop: WepStop, kind: 'notice' | 'deliver') {
  const tripId = trip.value?.id
  if (!tripId || busy.value || trip.value?.estado !== 'EN_REPARTO') return
  const description = [stop.cliente.nombre, stop.domicilio].filter(Boolean).join('\n')
  confirmation.value = kind === 'notice'
    ? { title: '¿Avisar al cliente que estamos yendo?', description: `${description}\nSe enviará un único aviso para toda la parada.`, label: 'Avisar', busyLabel: 'Calculando llegada…', run: () => wepApi.stopNotice(tripId, stop.grupoId), success: result => noticeSuccess(result as StopNoticeResponse) }
    : { title: '¿Confirmar la parada completa?', description: `${description}\nSe marcarán como entregadas ${stop.cantidadOrdenes} órdenes.`, label: 'Confirmar entrega', run: () => wepApi.stopDeliver(tripId, stop.grupoId), success: 'Parada entregada correctamente' }
}
function noticeSuccess(result: StopNoticeResponse): string {
  if (result.notificacion.resultado === 'YA_NOTIFICADA') {
    return 'Esta parada ya tenía un aviso enviado. No se envió un nuevo WhatsApp.'
  }
  const eta = result.notificacion.etaMinutos
  return typeof eta === 'number'
    ? result.notificacion.precisionDestino === 'ZONA_APROXIMADA'
      ? `Cliente avisado. Llegada aproximada a la zona: ${eta} min.`
      : `Cliente avisado. Llegada estimada: ${eta} min.`
    : 'Cliente avisado correctamente'
}
function confirmSelected() {
  if (confirmation.value) void perform(confirmation.value.run, confirmation.value.success)
}
async function submitNoDelivery(payload: NoDeliveryPayload) {
  const stop = noDelivery.value
  const tripId = trip.value?.id
  if (!stop || !tripId) return
  await perform(async () => {
    const result = await wepApi.stopNoDelivery(tripId, stop.grupoId, payload)
    for (const delivery of result.parada.entregas) reasons.value[delivery.id] = payload.motivo
  }, 'Parada marcada como no entregada')
}
function move(index: number, offset: -1 | 1) {
  if (trip.value?.estado !== 'PROGRAMADO' || busy.value || loading.value) return
  stops.value = moveStop(stops.value, index, offset)
}
async function saveOrder() {
  const id = trip.value?.id
  if (!id || !dirty.value || trip.value?.estado !== 'PROGRAMADO') return
  const ids = flattenStopDeliveries(stops.value).map(delivery => delivery.id)
  await perform(async () => {
    // El endpoint actual no valida el estado del viaje: verificarlo antes de enviar.
    const latest = (await wepApi.trips(date.value)).viajes.find(t => t.id === id)
    if (latest?.estado !== 'PROGRAMADO') throw new Error('La vuelta ya no está programada. No se guardó el orden.')
    const latestDeliveries = flattenStopDeliveries(latest.paradas)
    if (latestDeliveries.length !== ids.length || latestDeliveries.some(delivery => !ids.includes(delivery.id))) throw new Error('Las órdenes cambiaron. Revisá el nuevo listado antes de reordenar.')
    const order = ids.map((deliveryId, index) => {
      if (deliveryId === null) throw new Error('Una entrega no tiene identificador válido.')
      return { id: deliveryId, orden: index + 1 }
    })
    return wepApi.order(id, order)
  }, 'Orden actualizado')
}
function canLeave() {
  if (!auth.isAuthenticated.value) return true
  if (busy.value) { toast.info('Esperá a que termine la operación.'); return false }
  return !dirty.value || window.confirm('Hay un orden sin guardar. ¿Descartar los cambios?')
}
function qrNoticeSuccess() {
  if (auth.isAuthenticated.value) void load()
}
function refresh() { if (!busy.value && canLeave()) void load() }
function checkOnFocus() { if (document.visibilityState === 'visible') void checkForUpdates().catch(() => {}) }
function beforeUnload(event: BeforeUnloadEvent) {
  if (busy.value || dirty.value) { event.preventDefault(); event.returnValue = '' }
}
onBeforeRouteLeave(canLeave)
onBeforeRouteUpdate(canLeave)
watch(() => route.fullPath, () => { confirmation.value = null; noDelivery.value = null; reasons.value = {}; newOrders.value = 0; needsReview.value = false; trip.value = null; void load() }, { immediate: true })
onMounted(() => {
  window.addEventListener('beforeunload', beforeUnload)
  window.addEventListener('focus', checkOnFocus)
  document.addEventListener('visibilitychange', checkOnFocus)
  updateTimer = setInterval(checkOnFocus, 60_000)
})
onBeforeUnmount(() => {
  controller?.abort()
  if (updateTimer) clearInterval(updateTimer)
  window.removeEventListener('beforeunload', beforeUnload)
  window.removeEventListener('focus', checkOnFocus)
  document.removeEventListener('visibilitychange', checkOnFocus)
})
</script>

<template>
  <div class="mb-5 flex items-center justify-between gap-2"><Button as-child variant="ghost"><RouterLink to="/chofer/viajes"><ArrowLeft aria-hidden="true" /> Mis vueltas</RouterLink></Button><Button variant="outline" :disabled="loading || busy" @click="refresh"><RefreshCw :class="{ 'animate-spin': loading }" aria-hidden="true" /> Actualizar</Button></div>
  <LoadingState v-if="loading" />
  <ErrorState v-else-if="error" title="No pudimos cargar la vuelta" :message="error" @retry="load" />
  <template v-else-if="trip">
    <section class="mb-6">
      <p class="mb-2 text-sm capitalize text-muted-foreground">{{ displayDate(dateFromLocal(date)) }}</p>
      <div class="flex flex-wrap items-center justify-between gap-3"><h1 class="text-3xl font-bold tracking-tight">Vuelta {{ trip.numeroVuelta }}</h1><DeliveryStatusBadge :status="trip.estado" /></div>
      <p class="mt-3 flex items-center gap-2 text-muted-foreground"><Truck :size="20" aria-hidden="true" /> Camión {{ trip.vehiculo.patente || trip.vehiculo.nombre }}</p>
      <template v-if="trip.estado === 'PROGRAMADO'"><p class="mt-5 text-sm leading-6 text-muted-foreground">Revisá el orden de las paradas antes de salir.</p><div v-if="needsReview" class="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950" role="alert"><p class="flex items-center gap-2 font-semibold"><TriangleAlert :size="20" aria-hidden="true" /> {{ newOrders ? `${newOrders} ${newOrders === 1 ? 'orden nueva' : 'órdenes nuevas'} en esta vuelta` : 'Se actualizaron las órdenes de esta vuelta' }}</p><p class="mt-2 text-sm">Revisá las paradas y las órdenes antes de salir.</p><Button class="mt-3" variant="outline" @click="needsReview = false">Ya revisé la vuelta</Button></div><Button class="mt-3 w-full" :disabled="busy || checkingUpdates || dirty || needsReview || !stops.length" @click="prepareStart"><RefreshCw v-if="checkingUpdates" class="animate-spin" aria-hidden="true" /><Play v-else aria-hidden="true" /> {{ checkingUpdates ? 'Comprobando órdenes…' : 'Iniciar vuelta' }}</Button><p v-if="dirty" class="mt-2 text-sm text-amber-900">Guardá o descartá el orden antes de iniciar.</p></template>
      <p v-else-if="trip.estado === 'EN_REPARTO'" class="mt-5 flex items-center gap-2 rounded-xl bg-blue-50 p-4 font-semibold text-blue-800"><Truck :size="20" aria-hidden="true" /> Vuelta en curso</p>
      <div v-else-if="trip.estado === 'FINALIZADO'" class="mt-5 rounded-xl bg-secondary p-4"><p class="flex items-center gap-2 font-semibold text-primary"><CheckCircle :size="20" aria-hidden="true" /> Vuelta finalizada</p><p class="mt-2 text-sm">{{ stopSummary.entregadas }} entregadas · {{ stopSummary.noEntregadas }} no entregadas<span v-if="stopSummary.canceladas"> · {{ stopSummary.canceladas }} canceladas</span><span v-if="stopSummary.parciales"> · {{ stopSummary.parciales }} cerradas parcialmente</span></p></div>
    </section>
    <div v-if="dirty" class="sticky top-2 z-10 mb-5 rounded-2xl border border-primary/30 bg-white p-3 shadow-lg" role="status"><p class="mb-2 text-sm font-semibold">Orden de paradas modificado</p><div class="flex gap-2"><Button class="flex-1" :disabled="busy" @click="saveOrder"><Save aria-hidden="true" /> Guardar orden</Button><Button variant="outline" :disabled="busy" @click="stops = [...trip.paradas]">Descartar</Button></div></div>
    <h2 class="mb-3 text-sm font-semibold">{{ stops.length }} {{ stops.length === 1 ? 'parada' : 'paradas' }} <span class="text-muted-foreground">· {{ orders }} {{ orders === 1 ? 'orden' : 'órdenes' }}<template v-if="trip.estado === 'EN_REPARTO'"> · {{ pending }} pendientes</template></span></h2>
    <EmptyState v-if="!stops.length" title="No hay paradas programadas" description="Actualizá cuando se asignen las paradas." />
    <div class="space-y-4"><StopCard v-for="(stop, index) in stops" :key="stop.grupoId" :stop="stop" :sequence="index + 1" :first="index === 0" :last="index === stops.length - 1" :reorder="trip.estado === 'PROGRAMADO'" :in-progress="trip.estado === 'EN_REPARTO'" :disabled="busy" :reasons="reasons" @move="move(index, $event)" @notice="confirmStop(stop, 'notice')" @deliver="confirmStop(stop, 'deliver')" @no-delivery="noDelivery = stop" /></div>
    <section v-if="trip.estado === 'EN_REPARTO'" class="mt-7 rounded-2xl border bg-white p-5"><p v-if="pending" class="mb-3 text-sm text-muted-foreground">Quedan {{ pending }} paradas pendientes</p><p v-else-if="stops.length" class="mb-3 text-sm text-primary">Todas las paradas están cerradas.</p><Button class="w-full" :disabled="busy || pending > 0 || !stops.length" @click="confirmTrip('finish')"><Flag aria-hidden="true" /> Finalizar vuelta</Button></section>
  </template>
  <ConfirmDialog :open="!!confirmation" :title="confirmation?.title || ''" :description="confirmation?.description || ''" :confirm-label="confirmation?.label || ''" :busy-label="confirmation?.busyLabel" :busy="busy" @update:open="!$event && (confirmation = null)" @confirm="confirmSelected" />
  <NoDeliveryDialog :open="!!noDelivery" :client="noDelivery?.cliente.nombre || 'Parada'" :busy="busy" @update:open="!$event && (noDelivery = null)" @submit="submitNoDelivery" />
  <QrFloatingActionButton @click="qrOpen = true" />
  <QrScannerDialog v-model:open="qrOpen" @notice-success="qrNoticeSuccess" />
</template>
