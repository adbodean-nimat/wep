<script setup lang="ts">
import { computed } from 'vue'
import { Check, Circle } from '@lucide/vue'
import type { PublicTrackingStatus } from '@/types/publicTracking'

const props = defineProps<{ status: PublicTrackingStatus }>()

const special = computed(() => ['NO_ENTREGADA', 'CANCELADA', 'CERRADA_PARCIAL'].includes(props.status))
const currentStep = computed(() => {
  if (props.status === 'ENTREGADA') return 3
  if (props.status === 'EN_REPARTO' || props.status === 'CLIENTE_AVISADO') return 2
  return 1
})
const steps = ['Programada', 'En reparto', 'Entregada']
</script>

<template>
  <section v-if="!special" class="rounded-3xl border bg-white p-6 shadow-sm" aria-label="Progreso de la entrega">
    <h2 class="text-sm font-bold uppercase tracking-wider text-muted-foreground">Progreso</h2>
    <ol class="mt-5 grid grid-cols-3">
      <li v-for="(step, index) in steps" :key="step" class="relative flex flex-col items-center text-center">
        <span v-if="index > 0" class="absolute right-1/2 top-4 h-0.5 w-full" :class="index + 1 <= currentStep ? 'bg-primary' : 'bg-border'" aria-hidden="true" />
        <span class="relative z-10 flex size-8 items-center justify-center rounded-full border-2 bg-white" :class="index + 1 <= currentStep ? 'border-primary text-primary' : 'border-border text-muted-foreground'">
          <Check v-if="index + 1 < currentStep || currentStep === 3" :size="17" stroke-width="3" aria-hidden="true" />
          <Circle v-else :size="10" :fill="index + 1 === currentStep ? 'currentColor' : 'none'" aria-hidden="true" />
        </span>
        <span class="mt-2 text-xs font-semibold" :class="index + 1 <= currentStep ? 'text-foreground' : 'text-muted-foreground'">{{ step }}</span>
      </li>
    </ol>
  </section>
</template>
