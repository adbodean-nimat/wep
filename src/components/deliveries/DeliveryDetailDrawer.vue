<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import LoadingState from '@/components/app/LoadingState.vue'
import ErrorState from '@/components/app/ErrorState.vue'
import DeliveryDetailContent from './DeliveryDetailContent.vue'
import { useDeliveryDetail } from '@/composables/useDeliveryDetail'
const props = defineProps<{ id: number | null }>()
defineEmits<{ close: [] }>()
const { delivery, loading, error, load } = useDeliveryDetail(computed(() => props.id))
</script>
<template>
  <Dialog :open="id !== null" @update:open="!$event && $emit('close')">
    <DialogContent :show-close-button="false" class="top-auto bottom-0 max-h-[92dvh] w-full max-w-xl translate-y-0 overflow-y-auto rounded-b-none rounded-t-3xl pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <DialogHeader><DialogTitle>Información de la entrega</DialogTitle><DialogDescription>Datos de entrega y contacto.</DialogDescription></DialogHeader>
      <LoadingState v-if="loading" /><ErrorState v-else-if="error" title="No pudimos cargar la entrega" :message="error" @retry="load" /><DeliveryDetailContent v-else-if="delivery" :delivery="delivery" />
      <Button variant="outline" class="w-full" @click="$emit('close')">Cerrar información</Button>
    </DialogContent>
  </Dialog>
</template>
