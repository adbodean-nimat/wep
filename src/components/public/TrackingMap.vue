<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps<{
  latitud: number
  longitud: number
  fechaPosicion: string | null
}>()

const mapElement = ref<HTMLElement | null>(null)
let map: L.Map | undefined
let marker: L.Marker | undefined

const vehicleIcon = L.divIcon({
  className: 'vehicle-marker',
  html: `<span aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M14 9h4l4 4v4h-3"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/></svg></span>`,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
})

const positionLabel = computed(() => {
  if (!props.fechaPosicion) return 'Posición actualizada hace unos instantes'
  const date = new Date(props.fechaPosicion)
  if (!Number.isNaN(date.getTime())) {
    const elapsed = Date.now() - date.getTime()
    if (elapsed >= 0 && elapsed < 60_000) return 'Posición actualizada hace unos instantes'
    const time = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(date)
    return `Posición actualizada: ${time} hs`
  }
  const time = props.fechaPosicion.match(/(?:^|\s)(\d{1,2}):(\d{2})(?::\d{2})?(?:\s|$)/)
  return time
    ? `Posición actualizada: ${time[1]!.padStart(2, '0')}:${time[2]} hs`
    : 'Posición actualizada hace unos instantes'
})

onMounted(() => {
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
  map?.remove()
  marker = undefined
  map = undefined
})
</script>

<template>
  <section class="rounded-2xl border bg-white p-4 shadow-sm sm:p-5" aria-label="Ubicación actual del vehículo">
    <header class="mb-4">
      <h2 class="text-sm font-semibold">Ubicación del vehículo</h2>
      <p class="mt-1 text-xs text-muted-foreground" role="status">{{ positionLabel }}</p>
    </header>
    <div class="overflow-hidden rounded-xl">
      <div ref="mapElement" class="h-[250px] w-full sm:h-[280px]" />
    </div>
  </section>
</template>

<style scoped>
:deep(.vehicle-marker) {
  align-items: center;
  background: white;
  border: 3px solid var(--primary);
  border-radius: 9999px;
  box-shadow: 0 3px 12px rgb(0 0 0 / 25%);
  color: var(--primary);
  display: flex;
  justify-content: center;
}

:deep(.vehicle-marker span) {
  align-items: center;
  display: flex;
  height: 30px;
  justify-content: center;
  width: 30px;
}

:deep(.vehicle-marker svg) {
  height: 23px;
  width: 23px;
}
</style>
