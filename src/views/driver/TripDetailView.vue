<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount, onMounted } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute } from 'vue-router'
import { ArrowLeft, CheckCircle, Flag, Play, RefreshCw, Save, Truck } from '@lucide/vue'
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
import { useWepAuth } from '@/composables/useWepAuth'
import type { NoDeliveryPayload, NoDeliveryReason, Trip, WepStop } from '@/types/wep'
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
// Información devuelta por POST; sólo vive en esta pantalla, nunca en almacenamiento persistente.
const reasons = ref<Record<number, NoDeliveryReason>>({})
type Confirmation = { title: string; description: string; label: string; run: () => Promise<unknown>; success: string }
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
    trip.value = found
    // El backend ya ordena paradas y órdenes internas por secuencia, incluidos los null.
    stops.value = [...found.paradas]
  } catch (e) {
    if (!signal.aborted) { trip.value = null; stops.value = []; error.value = errorMessage(e) }
  } finally { if (!signal.aborted) loading.value = false }
}
async function perform(run: () => Promise<unknown>, success: string) {
  if (busy.value || loading.value || !trip.value) return
  busy.value = true
  try {
    await run()
    toast.success(success)
  } catch (e) { toast.error(errorMessage(e), { duration: 6500 }) }
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
  confirmation.value = kind === 'start'
    ? { title: '¿Iniciar esta vuelta?', description: `Vuelta ${trip.value!.numeroVuelta}. Se pondrán las órdenes en reparto y ya no podrás cambiar el orden de las paradas.`, label: 'Iniciar vuelta', run: () => wepApi.start(id), success: 'Vuelta iniciada' }
    : { title: '¿Finalizar esta vuelta?', description: `${stopSummary.value.entregadas} entregadas · ${stopSummary.value.noEntregadas} no entregadas · ${stopSummary.value.canceladas} canceladas${stopSummary.value.parciales ? ` · ${stopSummary.value.parciales} cerradas parcialmente` : ''}.`, label: 'Finalizar vuelta', run: () => wepApi.finish(id), success: 'Vuelta finalizada' }
}
function confirmStop(stop: WepStop, kind: 'notice' | 'deliver') {
  const tripId = trip.value?.id
  if (!tripId || busy.value || trip.value?.estado !== 'EN_REPARTO') return
  const description = [stop.cliente.nombre, stop.domicilio].filter(Boolean).join('\n')
  confirmation.value = kind === 'notice'
    ? { title: '¿Avisar al cliente que estamos yendo?', description: `${description}\nSe enviará un único aviso para toda la parada.`, label: 'Avisar', run: () => wepApi.stopNotice(tripId, stop.grupoId), success: 'Cliente avisado correctamente' }
    : { title: '¿Confirmar la parada completa?', description: `${description}\nSe marcarán como entregadas ${stop.cantidadOrdenes} órdenes.`, label: 'Confirmar entrega', run: () => wepApi.stopDeliver(tripId, stop.grupoId), success: 'Parada entregada correctamente' }
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
function beforeUnload(event: BeforeUnloadEvent) {
  if (busy.value || dirty.value) { event.preventDefault(); event.returnValue = '' }
}
onBeforeRouteLeave(canLeave)
onBeforeRouteUpdate(canLeave)
watch(() => route.fullPath, () => { confirmation.value = null; noDelivery.value = null; reasons.value = {}; void load() }, { immediate: true })
onMounted(() => window.addEventListener('beforeunload', beforeUnload))
onBeforeUnmount(() => { controller?.abort(); window.removeEventListener('beforeunload', beforeUnload) })
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
      <template v-if="trip.estado === 'PROGRAMADO'"><p class="mt-5 text-sm leading-6 text-muted-foreground">Revisá el orden de las paradas antes de salir.</p><Button class="mt-3 w-full" :disabled="busy || dirty || !stops.length" @click="confirmTrip('start')"><Play aria-hidden="true" /> Iniciar vuelta</Button><p v-if="dirty" class="mt-2 text-sm text-amber-900">Guardá o descartá el orden antes de iniciar.</p></template>
      <p v-else-if="trip.estado === 'EN_REPARTO'" class="mt-5 flex items-center gap-2 rounded-xl bg-blue-50 p-4 font-semibold text-blue-800"><Truck :size="20" aria-hidden="true" /> Vuelta en curso</p>
      <div v-else-if="trip.estado === 'FINALIZADO'" class="mt-5 rounded-xl bg-secondary p-4"><p class="flex items-center gap-2 font-semibold text-primary"><CheckCircle :size="20" aria-hidden="true" /> Vuelta finalizada</p><p class="mt-2 text-sm">{{ stopSummary.entregadas }} entregadas · {{ stopSummary.noEntregadas }} no entregadas<span v-if="stopSummary.canceladas"> · {{ stopSummary.canceladas }} canceladas</span><span v-if="stopSummary.parciales"> · {{ stopSummary.parciales }} cerradas parcialmente</span></p></div>
    </section>
    <div v-if="dirty" class="sticky top-2 z-10 mb-5 rounded-2xl border border-primary/30 bg-white p-3 shadow-lg" role="status"><p class="mb-2 text-sm font-semibold">Orden de paradas modificado</p><div class="flex gap-2"><Button class="flex-1" :disabled="busy" @click="saveOrder"><Save aria-hidden="true" /> Guardar orden</Button><Button variant="outline" :disabled="busy" @click="stops = [...trip.paradas]">Descartar</Button></div></div>
    <h2 class="mb-3 text-sm font-semibold">{{ stops.length }} {{ stops.length === 1 ? 'parada' : 'paradas' }} <span class="text-muted-foreground">· {{ orders }} {{ orders === 1 ? 'orden' : 'órdenes' }}<template v-if="trip.estado === 'EN_REPARTO'"> · {{ pending }} pendientes</template></span></h2>
    <EmptyState v-if="!stops.length" title="No hay paradas programadas" description="Actualizá cuando se asignen las paradas." />
    <div class="space-y-4"><StopCard v-for="(stop, index) in stops" :key="stop.grupoId" :stop="stop" :sequence="index + 1" :first="index === 0" :last="index === stops.length - 1" :reorder="trip.estado === 'PROGRAMADO'" :in-progress="trip.estado === 'EN_REPARTO'" :disabled="busy" :reasons="reasons" @move="move(index, $event)" @notice="confirmStop(stop, 'notice')" @deliver="confirmStop(stop, 'deliver')" @no-delivery="noDelivery = stop" /></div>
    <section v-if="trip.estado === 'EN_REPARTO'" class="mt-7 rounded-2xl border bg-white p-5"><p v-if="pending" class="mb-3 text-sm text-muted-foreground">Quedan {{ pending }} paradas pendientes</p><p v-else-if="stops.length" class="mb-3 text-sm text-primary">Todas las paradas están cerradas.</p><Button class="w-full" :disabled="busy || pending > 0 || !stops.length" @click="confirmTrip('finish')"><Flag aria-hidden="true" /> Finalizar vuelta</Button></section>
  </template>
  <ConfirmDialog :open="!!confirmation" :title="confirmation?.title || ''" :description="confirmation?.description || ''" :confirm-label="confirmation?.label || ''" :busy="busy" @update:open="!$event && (confirmation = null)" @confirm="confirmSelected" />
  <NoDeliveryDialog :open="!!noDelivery" :client="noDelivery?.cliente.nombre || 'Parada'" :busy="busy" @update:open="!$event && (noDelivery = null)" @submit="submitNoDelivery" />
  <QrFloatingActionButton @click="qrOpen = true" />
  <QrScannerDialog v-model:open="qrOpen" @notice-success="qrNoticeSuccess" />
</template>
