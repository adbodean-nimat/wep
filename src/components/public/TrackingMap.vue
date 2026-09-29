<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ArrowLeft, Maximize2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { formatPublicTime } from '@/utils/publicTrackingFormatters'

const props = defineProps<{
  latitud: number
  longitud: number
  fechaPosicion: string | null
}>()

const mapElement = ref<HTMLElement | null>(null)
const sectionElement = ref<HTMLElement | null>(null)
const isExpanded = ref(false)
let map: L.Map | undefined
let marker: L.Marker | undefined
let mapResizeObserver: ResizeObserver | undefined
let previousBodyOverflow = ''

const vehicleIcon = L.divIcon({
  className: 'vehicle-marker',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
})

async function refreshMapSize() {
  await nextTick()
  requestAnimationFrame(() => {
    map?.invalidateSize({ pan: false, animate: false })
    if (map && marker) map.setView(marker.getLatLng(), map.getZoom(), { animate: false })
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
  mapResizeObserver = new ResizeObserver(() => {
    map?.invalidateSize({ pan: false, animate: false })
  })
  mapResizeObserver.observe(mapElement.value)
})

watch(
  () => [props.latitud, props.longitud] as const,
  ([latitud, longitud]) => {
    if (!map || !marker) return
    const previous = marker.getLatLng()
    const next = L.latLng(latitud, longitud)
    marker.setLatLng(next)
    if (previous.distanceTo(next) >= 25) map.panTo(next)
  },
)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  if (isExpanded.value) document.body.style.overflow = previousBodyOverflow
  mapResizeObserver?.disconnect()
  map?.remove()
  marker = undefined
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
    <header class="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 class="text-sm font-semibold">Ubicación del vehículo</h2>
        <p class="mt-1 text-xs text-muted-foreground" role="status">{{ positionLabel }}</p>
      </div>
      <Button v-if="isExpanded" size="sm" variant="outline" @click="collapseMap">
        <ArrowLeft aria-hidden="true" /> Volver
      </Button>
      <Button v-else size="sm" variant="outline" @click="expandMap">
        <Maximize2 aria-hidden="true" /> Ver mapa completo
      </Button>
    </header>
    <div class="overflow-hidden rounded-xl" :class="isExpanded ? 'min-h-0 flex-1' : 'h-[250px] sm:h-[280px]'">
      <div ref="mapElement" class="h-full w-full" />
    </div>
  </section>
</template>

<style scoped>
:deep(.vehicle-marker) {
  background: transparent;
  border: 0;
  border-radius: 50%;
}

:deep(.vehicle-marker::before) {
  background: var(--primary);
  border-radius: 50%;
  box-shadow: 0 2px 7px rgb(0 0 0 / 20%);
  content: '';
  height: 18px;
  left: 50%;
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 18px;
}

:deep(.vehicle-marker::after) {
  animation: vehicle-border-pulse 1.8s ease-in-out infinite;
  border: 2px solid rgb(20 92 67 / 50%);
  border-radius: 50%;
  box-sizing: border-box;
  content: '';
  inset: 0;
  pointer-events: none;
  position: absolute;
}

@keyframes vehicle-border-pulse {
  0%, 100% { border-width: 2px; opacity: 0.45; }
  50% { border-width: 4px; opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  :deep(.vehicle-marker::after) {
    animation: none;
    opacity: 1;
  }
}
</style>
