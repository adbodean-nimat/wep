<script setup lang="ts">
import { computed } from 'vue'
import { CalendarDays, Clock3, MapPin } from '@lucide/vue'
import type { PublicTracking } from '@/types/publicTracking'
import { formatPublicLocality } from '@/utils/publicTrackingFormatters'

const props = defineProps<Pick<PublicTracking, 'fechaEntrega' | 'horario' | 'destino'>>()
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
