<script setup lang="ts">
import { computed } from 'vue'
import { CheckCircle, Navigation, XCircle } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import type { WepStop } from '@/types/wep'

const props = defineProps<{ stop: WepStop; inProgress: boolean; disabled: boolean }>()
defineEmits<{ notice: []; deliver: []; noDelivery: [] }>()
const operational = computed(() => props.inProgress && ['EN_REPARTO', 'CLIENTE_AVISADO'].includes(props.stop.estado.codigo))
</script>

<template>
  <div v-if="operational" class="mt-4 space-y-2 border-t pt-4">
    <Button v-if="stop.estado.codigo === 'EN_REPARTO'" variant="secondary" class="w-full" :disabled="disabled" @click="$emit('notice')"><Navigation aria-hidden="true" /> Avisar cliente</Button>
    <p v-else class="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-50 text-sm font-semibold text-blue-800"><CheckCircle :size="18" aria-hidden="true" /> Cliente avisado ✓</p>
    <div class="grid grid-cols-2 gap-2"><Button :disabled="disabled" @click="$emit('deliver')"><CheckCircle aria-hidden="true" /> Entregado</Button><Button variant="outline" class="text-destructive" :disabled="disabled" @click="$emit('noDelivery')"><XCircle aria-hidden="true" /> No entregado</Button></div>
  </div>
</template>
