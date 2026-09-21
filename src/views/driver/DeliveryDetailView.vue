<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft, RefreshCw } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import LoadingState from '@/components/app/LoadingState.vue'
import ErrorState from '@/components/app/ErrorState.vue'
import DeliveryDetailContent from '@/components/deliveries/DeliveryDetailContent.vue'
import { useDeliveryDetail } from '@/composables/useDeliveryDetail'
const route = useRoute()
const { delivery, loading, error, load } = useDeliveryDetail(computed(() => Number(route.params.id)))
const back = computed(() => delivery.value?.viaje.id ? { path: `/chofer/viajes/${delivery.value.viaje.id}`, query: { fecha: delivery.value.entrega.fecha || undefined } } : '/chofer/viajes')
</script>
<template>
  <div class="mb-5 flex items-center justify-between gap-2"><Button as-child variant="ghost"><RouterLink :to="back"><ArrowLeft aria-hidden="true" /> Volver</RouterLink></Button><Button variant="outline" :disabled="loading" @click="load"><RefreshCw aria-hidden="true" /> Actualizar</Button></div>
  <h1 class="mb-5 text-2xl font-bold">Detalle de entrega</h1>
  <LoadingState v-if="loading" /><ErrorState v-else-if="error" title="No pudimos cargar la entrega" :message="error" @retry="load" /><div v-else-if="delivery" class="rounded-2xl border bg-white p-5"><DeliveryDetailContent :delivery="delivery" /></div>
</template>
