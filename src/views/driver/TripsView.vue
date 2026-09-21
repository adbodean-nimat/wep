<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { CalendarDays, RefreshCw } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import TripCard from '@/components/trips/TripCard.vue'
import LoadingState from '@/components/app/LoadingState.vue'
import EmptyState from '@/components/app/EmptyState.vue'
import ErrorState from '@/components/app/ErrorState.vue'
import QrFloatingActionButton from '@/components/qr/QrFloatingActionButton.vue'
import QrScannerDialog from '@/components/qr/QrScannerDialog.vue'
import { wepApi } from '@/api/wep.api'
import type { Trip } from '@/types/wep'
import { dateFromLocal, displayDate, localDate, errorMessage } from '@/utils/formatters'
const date = ref(localDate())
const trips = ref<Trip[]>([])
const loading = ref(true)
const error = ref('')
const qrOpen = ref(false)
let controller: AbortController | undefined
async function load() {
  controller?.abort()
  controller = new AbortController()
  const signal = controller.signal
  loading.value = true
  error.value = ''
  date.value = localDate()
  try { trips.value = (await wepApi.trips(date.value, signal)).viajes }
  catch (e) { if (!signal.aborted) error.value = errorMessage(e) }
  finally { if (!signal.aborted) loading.value = false }
}
onMounted(load)
onBeforeUnmount(() => controller?.abort())
</script>
<template>
  <p class="mb-2 flex items-center gap-2 text-sm font-medium capitalize text-muted-foreground"><CalendarDays :size="16" aria-hidden="true" />{{ displayDate(dateFromLocal(date)) }}</p>
  <h1 class="text-3xl font-bold tracking-tight">Viajes de hoy</h1>
  <p class="mt-2 text-muted-foreground">Tus vueltas, en un solo lugar.</p>
  <div class="mb-4 mt-6 flex items-center justify-between"><span class="text-sm font-semibold">{{ !loading && !error ? `${trips.length} vueltas` : 'Mis vueltas' }}</span><Button variant="outline" :disabled="loading" @click="load"><RefreshCw :class="{ 'animate-spin': loading }" aria-hidden="true" /> Actualizar</Button></div>
  <LoadingState v-if="loading" />
  <ErrorState v-else-if="error" :message="error" @retry="load" />
  <EmptyState v-else-if="!trips.length" description="Actualizá la pantalla. Si esperabas viajes, puede estar pendiente la sincronización de WEP." />
  <div v-else class="space-y-4"><TripCard v-for="(trip, index) in trips" :key="trip.id ?? index" :trip="trip" :date="date" /></div>
  <QrFloatingActionButton @click="qrOpen = true" />
  <QrScannerDialog v-model:open="qrOpen" @notice-success="load" />
</template>
