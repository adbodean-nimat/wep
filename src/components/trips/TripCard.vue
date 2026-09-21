<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight, Package, Truck } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import DeliveryStatusBadge from '@/components/deliveries/DeliveryStatusBadge.vue'
import type { Trip } from '@/types/wep'
import { pendingStopCount, totalOrderCount } from '@/utils/stops'
const props = defineProps<{ trip: Trip; date: string }>()
const orders = computed(() => totalOrderCount(props.trip.paradas))
</script>
<template>
  <article class="overflow-hidden rounded-2xl border bg-white shadow-sm" :class="trip.estado === 'FINALIZADO' ? 'border-dashed bg-muted/30' : trip.estado === 'EN_REPARTO' ? 'border-primary/40' : ''">
    <div v-if="trip.estado === 'EN_REPARTO'" class="bg-primary px-5 py-2 text-xs font-semibold text-white">Tu vuelta está en curso</div>
    <div class="p-5">
      <div class="flex flex-wrap items-center justify-between gap-3"><h2 class="text-xl font-bold">Vuelta {{ trip.numeroVuelta }}</h2><DeliveryStatusBadge :status="trip.estado" /></div>
      <div class="mt-5 flex items-center gap-3"><Truck aria-hidden="true" class="text-muted-foreground" /><div><p class="font-semibold">{{ trip.vehiculo.nombre || 'Camión' }}</p><p v-if="trip.vehiculo.patente" class="text-sm text-muted-foreground">{{ trip.vehiculo.patente }}</p></div></div>
      <div class="my-5 border-t pt-4"><p class="flex items-center gap-2 font-semibold"><Package :size="18" aria-hidden="true" /> {{ trip.paradas.length }} {{ trip.paradas.length === 1 ? 'parada' : 'paradas' }}</p><p class="mt-2 text-sm text-muted-foreground">{{ orders }} {{ orders === 1 ? 'orden' : 'órdenes' }}<span v-if="trip.estado === 'EN_REPARTO'"> · {{ pendingStopCount(trip.paradas) }} pendientes</span></p></div>
      <Button v-if="trip.id" as-child class="w-full" :variant="trip.estado === 'FINALIZADO' ? 'outline' : 'default'"><RouterLink :to="{ path: `/chofer/viajes/${trip.id}`, query: { fecha: date } }">Ver paradas <ArrowRight aria-hidden="true" class="ml-auto" /></RouterLink></Button>
    </div>
  </article>
</template>
