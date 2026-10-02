<script setup lang="ts">
import { computed } from 'vue'
import { CalendarDays, Clock3, MapPin, Package } from '@lucide/vue'
import type { PublicTracking } from '@/types/publicTracking'
import { formatOrderNumber, formatPublicLocality } from '@/utils/publicTrackingFormatters'

const props = defineProps<Pick<PublicTracking, 'fechaEntrega' | 'horario' | 'destino' | 'pedido'>>()
const formattedLocality = computed(() => formatPublicLocality(props.destino.localidad))

const formattedDate = computed(() => {
  if (!props.fechaEntrega || !/^\d{4}-\d{2}-\d{2}$/.test(props.fechaEntrega)) return null
  const [year, month, day] = props.fechaEntrega.split('-').map(Number)
  const date = new Date(year!, month! - 1, day!)
  if (Number.isNaN(date.getTime())) return null
  const text = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date)
  return text.charAt(0).toUpperCase() + text.slice(1)
})

const timeLabel = computed(() => {
  const { desde, hasta } = props.horario
  if (desde && hasta) return `${desde.slice(0, 5)} - ${hasta.slice(0, 5)} hs`
  if (desde) return `Desde las ${desde.slice(0, 5)} hs`
  if (hasta) return `Hasta las ${hasta.slice(0, 5)} hs`
  return 'Durante la jornada'
})
</script>

<template>
  <section class="rounded-3xl border bg-white p-6 shadow-sm" aria-labelledby="details-title">
    <h2 id="details-title" class="text-sm font-bold uppercase tracking-wider text-muted-foreground">Detalles de la entrega</h2>
    <dl class="mt-5 space-y-5">
      <template v-if="pedido.principal">
        <div class="flex gap-3">
          <Package class="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
          <div class="min-w-0">
            <dt class="text-sm text-muted-foreground">{{ pedido.otros.length ? 'Pedido principal' : 'Pedido' }}</dt>
            <dd class="mt-0.5 break-words font-semibold">{{ formatOrderNumber(pedido.principal) }}</dd>
          </div>
        </div>
        <div v-if="pedido.otros.length" class="pl-8">
          <dt class="text-sm text-muted-foreground">Otros pedidos asociados</dt>
          <dd class="mt-2 flex flex-wrap gap-2">
            <span v-for="otro in pedido.otros" :key="otro" class="max-w-full break-words rounded-md bg-slate-100 px-2 py-1 text-sm font-medium text-slate-800">{{ formatOrderNumber(otro) }}</span>
          </dd>
        </div>
      </template>
      <div v-if="formattedDate" class="flex gap-3">
        <CalendarDays class="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <div><dt class="text-sm text-muted-foreground">Fecha de entrega</dt><dd class="mt-0.5 font-semibold">{{ formattedDate }}</dd></div>
      </div>
      <div class="flex gap-3">
        <Clock3 class="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <div><dt class="text-sm text-muted-foreground">Horario estimado</dt><dd class="mt-0.5 font-semibold">{{ timeLabel }}</dd></div>
      </div>
      <div v-if="formattedLocality" class="flex gap-3">
        <MapPin class="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <div><dt class="text-sm text-muted-foreground">Destino</dt><dd class="mt-0.5 font-semibold">{{ formattedLocality }}</dd></div>
      </div>
    </dl>
  </section>
</template>
