<script setup lang="ts">
import { computed, type Component } from 'vue'
import { CalendarClock, CircleAlert, CircleCheck, CircleX, Navigation, PackageCheck, Truck } from '@lucide/vue'
import type { PublicTrackingStatus } from '@/types/publicTracking'
import { getPublicEtaLabel, getPublicStatusDescription, getPublicStatusTitle, getPublicTrackingState, type PublicTrackingState } from '@/utils/publicTrackingPresentation'

const props = defineProps<{ status: PublicTrackingStatus; etaMinutos?: number }>()

interface StatusAppearance {
  icon: Component
  tone: string
}

const appearances: Record<PublicTrackingState, StatusAppearance> = {
  PROGRAMADA: { icon: CalendarClock, tone: 'bg-emerald-50 text-primary' },
  EN_CAMINO: { icon: Truck, tone: 'bg-blue-50 text-blue-700' },
  PROXIMA: { icon: Navigation, tone: 'bg-blue-50 text-blue-700' },
  ENTREGADA: { icon: CircleCheck, tone: 'bg-emerald-50 text-emerald-700' },
  NO_ENTREGADA: { icon: CircleAlert, tone: 'bg-red-50 text-red-700' },
  CANCELADA: { icon: CircleX, tone: 'bg-slate-100 text-slate-700' },
  PARCIAL: { icon: PackageCheck, tone: 'bg-amber-50 text-amber-800' },
}

const appearance = computed(() => appearances[getPublicTrackingState(props.status)])
const title = computed(() => getPublicStatusTitle(props.status))
const description = computed(() => getPublicStatusDescription(props.status))
const etaLabel = computed(() => getPublicEtaLabel(props.status, props.etaMinutos))
</script>

<template>
  <section class="rounded-3xl border bg-white p-6 shadow-sm" aria-live="polite">
    <div class="flex size-14 items-center justify-center rounded-2xl" :class="appearance.tone">
      <component :is="appearance.icon" :size="30" stroke-width="2" aria-hidden="true" />
    </div>
    <h1 class="mt-5 text-2xl font-bold leading-tight text-foreground">{{ title }}</h1>
    <p class="mt-2 text-base leading-relaxed text-muted-foreground">{{ description }}</p>
    <p v-if="etaLabel" class="mt-5 rounded-2xl bg-blue-50 px-4 py-3 text-lg font-bold leading-snug text-blue-800">{{ etaLabel }}</p>
  </section>
</template>
