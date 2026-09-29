<script setup lang="ts">
import { computed } from 'vue'
import { Check, Circle } from '@lucide/vue'
import type { PublicTrackingStatus } from '@/types/publicTracking'
import { getPublicProgressStep, PUBLIC_PROGRESS_STEPS } from '@/utils/publicTrackingPresentation'

const props = defineProps<{ status: PublicTrackingStatus }>()

const currentStep = computed(() => getPublicProgressStep(props.status))

function stepState(index: number): 'completo' | 'actual' | 'pendiente' {
  if (currentStep.value === null) return 'pendiente'
  if (props.status === 'ENTREGADA' || index < currentStep.value) return 'completo'
  return index === currentStep.value ? 'actual' : 'pendiente'
}
</script>

<template>
  <section v-if="currentStep !== null" class="rounded-3xl border bg-white p-5 shadow-sm sm:p-6" aria-label="Progreso de la entrega">
    <h2 class="text-sm font-bold uppercase tracking-wider text-muted-foreground">Progreso</h2>
    <ol class="mt-5 space-y-4">
      <li v-for="(step, index) in PUBLIC_PROGRESS_STEPS" :key="step" class="relative flex items-start gap-3">
        <span v-if="index < PUBLIC_PROGRESS_STEPS.length - 1"
          class="absolute -bottom-4 left-[17px] top-9 w-0.5"
          :class="stepState(index + 1) === 'pendiente' ? 'bg-border' : 'bg-primary'"
          aria-hidden="true" />
        <span class="flex size-9 shrink-0 items-center justify-center rounded-full border-2"
          :class="stepState(index) === 'pendiente' ? 'border-border text-muted-foreground' : 'border-primary text-primary'"
          aria-hidden="true">
          <Check v-if="stepState(index) === 'completo'" :size="19" stroke-width="3" />
          <Circle v-else :size="11" :fill="stepState(index) === 'actual' ? 'currentColor' : 'none'" />
        </span>
        <span class="flex min-h-9 min-w-0 flex-1 items-center font-semibold" :class="stepState(index) === 'pendiente' ? 'text-muted-foreground' : 'text-foreground'">{{ step }}</span>
        <span class="flex min-h-9 items-center text-xs text-muted-foreground">{{ stepState(index) }}</span>
      </li>
    </ol>
  </section>
</template>
