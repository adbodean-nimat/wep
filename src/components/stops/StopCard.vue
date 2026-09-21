<script setup lang="ts">
import { Clock, FileText, MapPin, Package } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import DeliveryStatusBadge from '@/components/deliveries/DeliveryStatusBadge.vue'
import ReorderControls from '@/components/deliveries/ReorderControls.vue'
import StopActions from './StopActions.vue'
import StopInfoDialog from './StopInfoDialog.vue'
import type { NoDeliveryReason, WepStop, WepStopDelivery } from '@/types/wep'
import { formatNumber, timeWindow } from '@/utils/formatters'
import { reasonLabels } from '@/utils/deliveries'

defineProps<{
  stop: WepStop
  sequence: number
  reorder: boolean
  first: boolean
  last: boolean
  inProgress: boolean
  disabled: boolean
  reasons: Record<number, NoDeliveryReason>
}>()
defineEmits<{
  move: [offset: -1 | 1]
  notice: []
  deliver: []
  noDelivery: []
}>()

function documentNumber(value: WepStopDelivery['ordenPreparacion']): string {
  return [value.division, value.tipo, value.numero].filter(part => part !== null && part !== '').join(' · ')
}
</script>

<template>
  <article class="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
    <div class="flex items-start gap-3">
      <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-lg font-bold text-primary" :aria-label="`Parada ${stop.ordenSecuencia ?? sequence}`">{{ stop.ordenSecuencia ?? sequence }}</span>
      <div class="min-w-0 flex-1"><h3 class="break-words text-lg font-bold leading-6">{{ stop.cliente.nombre || 'Cliente sin nombre' }}</h3><div class="mt-2"><DeliveryStatusBadge :status="stop.estado.codigo" /></div></div>
    </div>
    <div class="mt-5 space-y-3 text-sm">
      <div v-if="stop.domicilio || stop.localidad" class="flex items-start gap-2"><MapPin :size="18" class="shrink-0 text-muted-foreground" aria-hidden="true" /><div class="min-w-0"><p v-if="stop.domicilio" class="break-words font-medium">{{ stop.domicilio }}</p><p v-if="stop.localidad" class="text-muted-foreground">{{ stop.localidad }}</p></div></div>
      <p class="flex items-center gap-2"><Package :size="18" aria-hidden="true" class="text-muted-foreground" />{{ formatNumber(stop.totales.bultos) }} bultos</p>
      <p class="flex items-center gap-2"><FileText :size="18" aria-hidden="true" class="text-muted-foreground" />{{ stop.cantidadOrdenes }} {{ stop.cantidadOrdenes === 1 ? 'orden' : 'órdenes' }}</p>
      <p v-if="timeWindow(stop.horaDesde, stop.horaHasta)" class="flex items-center gap-2"><Clock :size="18" aria-hidden="true" class="text-muted-foreground" />{{ timeWindow(stop.horaDesde, stop.horaHasta) }}</p>
    </div>

    <StopActions :stop="stop" :in-progress="inProgress" :disabled="disabled" @notice="$emit('notice')" @deliver="$emit('deliver')" @no-delivery="$emit('noDelivery')" />
    <div class="mt-4 grid grid-cols-2 gap-2">
      <Dialog>
        <Button as-child variant="secondary" class="w-full"><DialogTrigger><FileText aria-hidden="true" /> Ver órdenes</DialogTrigger></Button>
        <DialogContent class="top-auto bottom-0 max-h-[92dvh] w-full max-w-xl translate-y-0 overflow-y-auto rounded-b-none rounded-t-3xl pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <DialogHeader><DialogTitle>Órdenes de la parada</DialogTitle><DialogDescription>{{ stop.cliente.nombre }}<span v-if="stop.domicilio"> · {{ stop.domicilio }}</span></DialogDescription></DialogHeader>
          <div class="divide-y">
            <section v-for="(delivery, index) in stop.entregas" :key="delivery.id ?? index" class="py-5 first:pt-1">
              <div class="flex items-start justify-between gap-3"><div><p class="font-bold">Orden {{ documentNumber(delivery.ordenPreparacion) || 'sin número' }}</p><p v-if="documentNumber(delivery.notaPedido)" class="mt-1 text-sm text-muted-foreground">Nota de pedido {{ documentNumber(delivery.notaPedido) }}</p></div><DeliveryStatusBadge :status="delivery.estado.codigo" /></div>
              <dl class="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div v-if="delivery.bultos !== null"><dt class="text-xs text-muted-foreground">Bultos</dt><dd class="font-medium">{{ formatNumber(delivery.bultos) }}</dd></div>
                <div v-if="delivery.peso !== null"><dt class="text-xs text-muted-foreground">Peso</dt><dd class="font-medium">{{ formatNumber(delivery.peso) }}</dd></div>
                <div v-if="delivery.volumen !== null"><dt class="text-xs text-muted-foreground">Volumen</dt><dd class="font-medium">{{ formatNumber(delivery.volumen) }}</dd></div>
              </dl>
              <p v-if="delivery.id && reasons[delivery.id] && delivery.estado.codigo === 'NO_ENTREGADA'" class="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{{ reasonLabels[reasons[delivery.id]!] }}</p>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      <StopInfoDialog :stop="stop" />
    </div>
    <ReorderControls v-if="reorder" :first="first" :last="last" :disabled="disabled" :client="stop.cliente.nombre || `parada ${sequence}`" @move="$emit('move', $event)" />
  </article>
</template>
