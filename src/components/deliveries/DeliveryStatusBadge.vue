<script setup lang="ts">
import { computed } from 'vue'
import { CheckCircle, Clock, Navigation, XCircle } from '@lucide/vue'
const props = defineProps<{ status: string | null }>()
const label = computed(() => ({ PROGRAMADO: 'Programado', PROGRAMADA: 'Programada', ASIGNADA: 'Asignada', EN_REPARTO: 'En reparto', CLIENTE_AVISADO: 'Cliente avisado', ENTREGADA: 'Entregada', NO_ENTREGADA: 'No entregada', CANCELADA: 'Cancelada', CERRADA_PARCIAL: 'Cerrada parcialmente', FINALIZADO: 'Finalizado' })[props.status || ''] || props.status || 'Sin estado')
const closed = computed(() => ['ENTREGADA', 'CERRADA_PARCIAL', 'FINALIZADO'].includes(props.status || ''))
const negative = computed(() => ['NO_ENTREGADA', 'CANCELADA'].includes(props.status || ''))
const active = computed(() => ['EN_REPARTO', 'CLIENTE_AVISADO'].includes(props.status || ''))
</script>
<template>
  <span class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold" :class="negative ? 'bg-red-50 text-red-800' : closed ? 'bg-emerald-50 text-emerald-800' : active ? 'bg-blue-50 text-blue-800' : 'bg-amber-50 text-amber-900'">
    <component :is="closed ? CheckCircle : negative ? XCircle : active ? Navigation : Clock" :size="14" aria-hidden="true" />{{ label }}
  </span>
</template>
