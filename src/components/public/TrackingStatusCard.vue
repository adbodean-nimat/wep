<script setup lang="ts">
import { computed, type Component } from 'vue'
import { CalendarClock, CircleCheck, CircleX, Navigation, PackageCheck, Truck } from '@lucide/vue'
import type { PublicTrackingStatus } from '@/types/publicTracking'

const props = defineProps<{ status: PublicTrackingStatus }>()

interface StatusPresentation {
  title: string
  description: string
  icon: Component
  tone: string
}

const presentations: Record<PublicTrackingStatus, StatusPresentation> = {
  PROGRAMADA: { title: 'Tu entrega está programada', description: 'Estamos preparando todo para la fecha acordada.', icon: CalendarClock, tone: 'bg-emerald-50 text-primary' },
  ASIGNADA: { title: 'Tu entrega está programada', description: 'Estamos preparando todo para la fecha acordada.', icon: CalendarClock, tone: 'bg-emerald-50 text-primary' },
  EN_REPARTO: { title: 'Tu entrega se encuentra en reparto', description: 'Tu pedido ya salió a reparto.', icon: Truck, tone: 'bg-blue-50 text-blue-700' },
  CLIENTE_AVISADO: { title: 'Tu entrega está en camino', description: 'El vehículo está realizando el recorrido de entrega.', icon: Navigation, tone: 'bg-blue-50 text-blue-700' },
  ENTREGADA: { title: 'Tu entrega fue realizada', description: 'Tu entrega fue realizada correctamente.', icon: CircleCheck, tone: 'bg-emerald-50 text-emerald-700' },
  NO_ENTREGADA: { title: 'No pudimos completar la entrega', description: 'La entrega no pudo realizarse en esta oportunidad.', icon: CircleX, tone: 'bg-red-50 text-red-700' },
  CANCELADA: { title: 'La entrega fue cancelada', description: 'Esta entrega ya no se encuentra programada.', icon: CircleX, tone: 'bg-slate-100 text-slate-700' },
  CERRADA_PARCIAL: { title: 'La entrega fue procesada parcialmente', description: 'Parte de la entrega pudo ser completada.', icon: PackageCheck, tone: 'bg-amber-50 text-amber-800' },
}

const presentation = computed(() => presentations[props.status])
</script>

<template>
  <section class="rounded-3xl border bg-white p-6 shadow-sm" aria-live="polite">
    <div class="flex size-14 items-center justify-center rounded-2xl" :class="presentation.tone">
      <component :is="presentation.icon" :size="30" stroke-width="2" aria-hidden="true" />
    </div>
    <h1 class="mt-5 text-2xl font-bold leading-tight text-foreground">{{ presentation.title }}</h1>
    <p class="mt-2 text-base leading-relaxed text-muted-foreground">{{ presentation.description }}</p>
  </section>
</template>
