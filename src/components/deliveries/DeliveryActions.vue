<script setup lang="ts">
import { computed } from 'vue'
import { CheckCircle, Info, Navigation, XCircle } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import type { DeliveryStatus } from '@/types/wep'
const props = withDefaults(defineProps<{ status: DeliveryStatus | null; inProgress: boolean; disabled: boolean; showInfo?: boolean }>(), { showInfo: true })
defineEmits<{ notice: []; deliver: []; noDelivery: []; info: [] }>()
const operational = computed(() => props.inProgress && ['EN_REPARTO', 'CLIENTE_AVISADO'].includes(props.status || ''))
</script>
<template>
  <div class="mt-4 space-y-2">
    <template v-if="operational">
      <Button v-if="status === 'EN_REPARTO'" variant="secondary" class="w-full" :disabled="disabled" @click="$emit('notice')"><Navigation aria-hidden="true" /> Avisar cliente</Button>
      <p v-else class="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-50 text-sm font-semibold text-blue-800"><CheckCircle :size="18" aria-hidden="true" /> Cliente avisado ✓</p>
      <div class="grid grid-cols-2 gap-2"><Button :disabled="disabled" @click="$emit('deliver')"><CheckCircle aria-hidden="true" /> Entregado</Button><Button variant="outline" class="text-destructive" :disabled="disabled" @click="$emit('noDelivery')"><XCircle aria-hidden="true" /> No entregado</Button></div>
    </template>
    <Button v-if="showInfo" variant="ghost" class="w-full" :disabled="disabled" @click="$emit('info')"><Info aria-hidden="true" /> Ver info</Button>
  </div>
</template>
