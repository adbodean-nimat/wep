<script setup lang="ts">
import { Clock, MapPin, Package } from '@lucide/vue'
import type { Delivery, NoDeliveryReason } from '@/types/wep'
import { timeWindow, formatNumber } from '@/utils/formatters'
import { reasonLabels } from '@/utils/deliveries'
import DeliveryActions from './DeliveryActions.vue'
import DeliveryStatusBadge from './DeliveryStatusBadge.vue'
import ReorderControls from './ReorderControls.vue'
defineProps<{ delivery: Delivery; sequence: number; reorder: boolean; first: boolean; last: boolean; inProgress: boolean; disabled: boolean; reason?: NoDeliveryReason }>()
defineEmits<{ move: [offset: -1 | 1]; notice: []; deliver: []; noDelivery: []; info: [] }>()
</script>
<template>
  <article class="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
    <div class="flex items-start gap-3"><span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-lg font-bold text-primary" :aria-label="`Parada ${sequence}`">{{ sequence }}</span><div class="min-w-0 flex-1"><h3 class="break-words text-lg font-bold leading-6">{{ delivery.cliente.nombre || 'Cliente sin nombre' }}</h3><div class="mt-2"><DeliveryStatusBadge :status="delivery.estado.codigo" /></div></div></div>
    <div class="mt-5 space-y-3 text-sm">
      <div v-if="delivery.entrega.domicilio || delivery.entrega.localidad" class="flex items-start gap-2"><MapPin :size="18" class="shrink-0 text-muted-foreground" aria-hidden="true" /><div class="min-w-0"><p class="break-words font-medium">{{ delivery.entrega.domicilio }}</p><p class="text-muted-foreground">{{ delivery.entrega.localidad }}</p></div></div>
      <p v-if="timeWindow(delivery.entrega.horaDesde, delivery.entrega.horaHasta)" class="flex items-center gap-2"><Clock :size="18" aria-hidden="true" class="text-muted-foreground" />{{ timeWindow(delivery.entrega.horaDesde, delivery.entrega.horaHasta) }}</p>
      <p v-if="delivery.logistica.bultosCalculados !== null" class="flex items-center gap-2"><Package :size="18" aria-hidden="true" class="text-muted-foreground" />{{ formatNumber(delivery.logistica.bultosCalculados) }} bultos</p>
      <p v-if="reason && delivery.estado.codigo === 'NO_ENTREGADA'" class="rounded-lg bg-red-50 p-3 text-red-800">{{ reasonLabels[reason] }}</p>
    </div>
    <DeliveryActions :status="delivery.estado.codigo" :in-progress="inProgress" :disabled="disabled || !delivery.id" @notice="$emit('notice')" @deliver="$emit('deliver')" @no-delivery="$emit('noDelivery')" @info="$emit('info')" />
    <ReorderControls v-if="reorder" :first="first" :last="last" :disabled="disabled" :client="delivery.cliente.nombre || `entrega ${sequence}`" @move="$emit('move', $event)" />
  </article>
</template>
