<script setup lang="ts">
import { computed } from 'vue'
import { CheckCircle, MapPin, Phone, XCircle } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import WhatsAppIcon from '@/components/ui/WhatsAppIcon.vue'
import type { WepStop } from '@/types/wep'
import { mapAddress } from '@/utils/formatters'

const props = defineProps<{ stop: WepStop; inProgress: boolean; disabled: boolean; phone: string | null }>()
defineEmits<{ notice: []; deliver: []; noDelivery: [] }>()
const operational = computed(() => props.inProgress && ['EN_REPARTO', 'CLIENTE_AVISADO'].includes(props.stop.estado.codigo))
const address = computed(() => mapAddress(props.stop.domicilio, props.stop.localidad))
</script>

<template>
  <div v-if="operational" class="mt-4 space-y-2 border-t pt-4">
    <div v-if="stop.estado.codigo === 'EN_REPARTO'" class="space-y-2">
      <Button variant="secondary" class="w-full" :disabled="disabled" @click="$emit('notice')"><WhatsAppIcon /> Avisar cliente</Button>
      <Button v-if="phone && !disabled" as-child variant="outline" class="w-full"><a :href="`tel:${phone}`"><Phone aria-hidden="true" /> Llamar</a></Button>
      <Button v-else variant="outline" class="w-full" disabled :title="phone ? undefined : 'No hay un teléfono disponible para esta parada'"><Phone aria-hidden="true" /> Llamar</Button>
    </div>
    <p v-else class="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-50 text-sm font-semibold text-blue-800"><CheckCircle :size="18" aria-hidden="true" /> Cliente avisado ✓</p>
    <Button v-if="address && !disabled" as-child variant="secondary" class="w-full"><a :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`" target="_blank" rel="noopener noreferrer"><MapPin aria-hidden="true" /> Abrir mapa</a></Button>
    <Button v-else variant="secondary" class="w-full" disabled :title="address ? undefined : 'No hay una dirección disponible para esta parada'"><MapPin aria-hidden="true" /> Abrir mapa</Button>
    <div class="grid grid-cols-2 gap-2"><Button :disabled="disabled" @click="$emit('deliver')"><CheckCircle aria-hidden="true" /> Entregado</Button><Button variant="outline" class="text-destructive" :disabled="disabled" @click="$emit('noDelivery')"><XCircle aria-hidden="true" /> No entregado</Button></div>
  </div>
</template>
