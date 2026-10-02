<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ArrowLeft, Maximize2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { formatPublicTime } from '@/utils/publicTrackingFormatters'
import type { PublicTracking } from '@/types/publicTracking'

const props = defineProps<{
  latitud: number
  longitud: number
  fechaPosicion: string | null
  ruta: PublicTracking['ruta']
}>()

const mapElement = ref<HTMLElement | null>(null)
const sectionElement = ref<HTMLElement | null>(null)
const isExpanded = ref(false)
let map: L.Map | undefined
let marker: L.Marker | undefined
let destinationMarker: L.Marker | undefined
let routeLayer: L.Polyline | undefined
let mapResizeObserver: ResizeObserver | undefined
let previousBodyOverflow = ''

const vehicleIcon = L.divIcon({
  className: 'vehicle-marker',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})
const destinationIcon = L.divIcon({
  className: 'destination-marker',
  html: '<span aria-hidden="true">📍</span>',
  iconSize: [30, 36],
  iconAnchor: [15, 33],
})

function syncRoute() {
  if (!map || routeLayer) return
  const destination = props.ruta.destino
  if (destination && !destinationMarker) {
    destinationMarker = L.marker([destination.latitud, destination.longitud], {
      icon: destinationIcon, keyboard: false,
    }).addTo(map)
  }
  const coordinates = props.ruta.disponible ? props.ruta.geometry?.coordinates : undefined
  if (!coordinates) return
  routeLayer = L.polyline(coordinates.map(([longitude, latitude]) => [latitude, longitude]), {
    color: '#176d51', weight: 5, opacity: 0.85,
  }).addTo(map)
  const bounds = routeLayer.getBounds()
  if (marker) bounds.extend(marker.getLatLng())
  if (destinationMarker) bounds.extend(destinationMarker.getLatLng())
  map.fitBounds(bounds, { padding: [28, 28], maxZoom: 15, animate: false })
}

async function refreshMapSize() {
  await nextTick()
  requestAnimationFrame(() => {
    map?.invalidateSize({ pan: false, animate: false })
  })
}

async function expandMap() {
  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  isExpanded.value = true
  await refreshMapSize()
  sectionElement.value?.querySelector('button')?.focus()
}

async function collapseMap() {
  isExpanded.value = false
  document.body.style.overflow = previousBodyOverflow
  await refreshMapSize()
  sectionElement.value?.querySelector('button')?.focus()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isExpanded.value) void collapseMap()
}

const positionLabel = computed(() => {
  if (!props.fechaPosicion) return 'Posición actualizada hace unos instantes'
  const date = new Date(props.fechaPosicion)
  if (!Number.isNaN(date.getTime())) {
    const elapsed = Date.now() - date.getTime()
    if (elapsed >= 0 && elapsed < 60_000) return 'Posición actualizada hace unos instantes'
    const time = formatPublicTime(date)
    return time ? `Posición actualizada: ${time}` : 'Posición actualizada hace unos instantes'
  }
  const time = props.fechaPosicion.match(/(?:^|\s)(\d{1,2}):(\d{2})(?::\d{2})?(?:\s|$)/)
  return time
    ? `Posición actualizada: ${time[1]!.padStart(2, '0')}:${time[2]} hs`
    : 'Posición actualizada hace unos instantes'
})

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  if (!mapElement.value) return
  const position = L.latLng(props.latitud, props.longitud)
  map = L.map(mapElement.value, {
    center: position,
    zoom: 14,
    zoomControl: false,
    attributionControl: true,
    scrollWheelZoom: false,
  })
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map)
  marker = L.marker(position, { icon: vehicleIcon, keyboard: false }).addTo(map)
  syncRoute()
  mapResizeObserver = new ResizeObserver(() => {
    map?.invalidateSize({ pan: false, animate: false })
  })
  mapResizeObserver.observe(mapElement.value)
})

watch(
  () => [props.latitud, props.longitud] as const,
  ([latitud, longitud]) => {
    if (!map || !marker) return
    const next = L.latLng(latitud, longitud)
    marker.setLatLng(next)
  },
)

watch(() => props.ruta, syncRoute)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  if (isExpanded.value) document.body.style.overflow = previousBodyOverflow
  mapResizeObserver?.disconnect()
  map?.remove()
  marker = undefined
  destinationMarker = undefined
  routeLayer = undefined
  map = undefined
})
</script>

<template>
  <section
    ref="sectionElement"
    class="border bg-white p-4 shadow-sm sm:p-5"
    :class="isExpanded ? 'fixed inset-0 z-[1000] flex flex-col' : 'rounded-2xl'"
    aria-label="Ubicación actual del vehículo"
  >
    <header class="mb-3 flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h2 class="text-base font-semibold leading-snug">{{ ruta.disponible ? 'Ruta estimada hacia tu entrega' : 'Ubicación del vehículo' }}</h2>
        <p class="mt-1 text-xs text-muted-foreground" role="status">{{ positionLabel }}</p>
      </div>
      <Button v-if="isExpanded" size="sm" variant="outline" class="shrink-0" @click="collapseMap">
        <ArrowLeft aria-hidden="true" /> Volver
      </Button>
    </header>
    <div class="overflow-hidden rounded-xl" :class="isExpanded ? 'min-h-0 flex-1' : 'h-[250px] sm:h-[280px]'">
      <div ref="mapElement" class="h-full w-full" />
    </div>
    <div class="mt-3 flex flex-col gap-3">
      <p v-if="ruta.disponible" class="text-xs leading-relaxed text-muted-foreground">
        El recorrido puede variar según las condiciones del tránsito y la operación.
      </p>
      <Button v-if="!isExpanded" size="sm" variant="outline" class="w-full sm:w-auto sm:self-end" @click="expandMap">
        <Maximize2 aria-hidden="true" /> Ver mapa completo
      </Button>
    </div>
  </section>
</template>

<style scoped>
:deep(.vehicle-marker) {
  background: var(--primary);
  border: 0;
  border-radius: 50%;
  box-shadow: 0 2px 7px rgb(0 0 0 / 20%);
}
:deep(.destination-marker) { background: transparent; border: 0; font-size: 27px; line-height: 36px; text-align: center; }
</style>
