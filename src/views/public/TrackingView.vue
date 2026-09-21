<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { LoaderCircle, RefreshCw, Truck } from '@lucide/vue'
import { useRoute } from 'vue-router'
import { ApiError } from '@/api/http'
import { getPublicTracking } from '@/api/publicTracking.api'
import { Button } from '@/components/ui/button'
import TrackingErrorState from '@/components/public/TrackingErrorState.vue'
import TrackingMap from '@/components/public/TrackingMap.vue'
import TrackingProgress from '@/components/public/TrackingProgress.vue'
import TrackingSchedule from '@/components/public/TrackingSchedule.vue'
import TrackingStatusCard from '@/components/public/TrackingStatusCard.vue'
import type { PublicTracking } from '@/types/publicTracking'
import { formatPublicTime } from '@/utils/publicTrackingFormatters'

const route = useRoute()
const tracking = ref<PublicTracking | null>(null)
const loading = ref(true)
const errorStatus = ref<number | null>(null)
let controller: AbortController | undefined
let pollingTimer: ReturnType<typeof setInterval> | undefined

const ACTIVE_TRACKING_STATUSES = new Set(['EN_REPARTO', 'CLIENTE_AVISADO'])

const publicId = computed(() => typeof route.params.publicId === 'string' ? route.params.publicId : '')
const lastUpdate = computed(() => formatPublicTime(tracking.value?.ultimaActualizacion))

function stopPolling() {
  if (pollingTimer === undefined) return
  clearInterval(pollingTimer)
  pollingTimer = undefined
}

function syncPolling() {
  stopPolling()
  if (!tracking.value || !ACTIVE_TRACKING_STATUSES.has(tracking.value.estado.codigo)) return
  pollingTimer = setInterval(() => loadTracking(true), 30_000)
}

async function loadTracking(silent = false) {
  controller?.abort()
  const requestController = new AbortController()
  controller = requestController
  if (!silent) {
    loading.value = true
    errorStatus.value = null
  }
  try {
    tracking.value = await getPublicTracking(publicId.value, requestController.signal)
    errorStatus.value = null
    syncPolling()
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    if (!silent) {
      tracking.value = null
      errorStatus.value = error instanceof ApiError ? error.status : 0
      stopPolling()
    }
  } finally {
    if (!requestController.signal.aborted) loading.value = false
  }
}

onMounted(loadTracking)
onBeforeUnmount(() => {
  stopPolling()
  controller?.abort()
})
</script>

<template>
  <div v-if="loading" class="flex min-h-[55dvh] flex-col items-center justify-center text-center" aria-live="polite">
    <LoaderCircle class="size-8 animate-spin text-primary" aria-hidden="true" />
    <p class="mt-4 font-medium text-muted-foreground">Consultando estado de tu entrega...</p>
  </div>

  <TrackingErrorState v-else-if="errorStatus !== null" :not-found="errorStatus === 404" @retry="loadTracking" />

  <div v-else-if="tracking" class="space-y-4">
    <TrackingStatusCard :status="tracking.estado.codigo" />
    <div v-if="tracking.viaje.enCurso" class="flex items-center justify-center gap-2 rounded-full bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary">
      <Truck :size="18" aria-hidden="true" /> Vehículo en reparto
    </div>
    <TrackingMap
      v-if="ACTIVE_TRACKING_STATUSES.has(tracking.estado.codigo) && tracking.vehiculo.posicionDisponible"
      :latitud="tracking.vehiculo.latitud"
      :longitud="tracking.vehiculo.longitud"
      :fecha-posicion="tracking.vehiculo.fechaPosicion"
    />
    <p
      v-else-if="ACTIVE_TRACKING_STATUSES.has(tracking.estado.codigo)"
      class="rounded-xl bg-muted/60 px-4 py-3 text-center text-sm text-muted-foreground"
      role="status"
    >
      Ubicación del vehículo temporalmente no disponible.
    </p>
    <TrackingProgress :status="tracking.estado.codigo" />
    <TrackingSchedule :fecha-entrega="tracking.fechaEntrega" :horario="tracking.horario" :destino="tracking.destino" />
    <div class="flex items-center justify-between gap-4 px-1 pt-2">
      <p v-if="lastUpdate" class="text-xs text-muted-foreground">Última actualización: {{ lastUpdate }}</p>
      <span v-else />
      <Button size="sm" variant="ghost" :disabled="loading" @click="loadTracking()"><RefreshCw aria-hidden="true" /> Actualizar</Button>
    </div>
  </div>
</template>
