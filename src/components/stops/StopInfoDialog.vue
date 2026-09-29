<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Info, MapPin, Phone } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import DeliveryStatusBadge from '@/components/deliveries/DeliveryStatusBadge.vue'
import ErrorState from '@/components/app/ErrorState.vue'
import LoadingState from '@/components/app/LoadingState.vue'
import { wepApi } from '@/api/wep.api'
import type { DeliveryDetail, WepStop } from '@/types/wep'
import { errorMessage, formatNumber, mapAddress, timeWindow } from '@/utils/formatters'

const props = defineProps<{ stop: WepStop }>()
const open = ref(false)
const details = ref<DeliveryDetail[]>([])
const loading = ref(false)
const error = ref('')
let controller: AbortController | undefined

function unique(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => !!value && value.trim() !== ''))]
}

const phones = computed(() => unique(details.value.flatMap(detail => [detail.contacto.telefono, detail.contacto.telefonoAlternativo])).filter(phone => /\d/.test(phone)))
const address = computed(() => mapAddress(props.stop.domicilio, props.stop.localidad))
const rows = computed(() => {
  const zones = unique(details.value.map(detail => [detail.entrega.zonaCodigo, detail.entrega.zonaNombre].filter(Boolean).join(' · ')))
  const emails = unique(details.value.map(detail => detail.contacto.email))
  const deliveryNotes = unique(details.value.map(detail => detail.observacionEntrega))
  const notes = unique(details.value.map(detail => detail.observaciones))
  return [
    ['Código cliente', props.stop.cliente.codigo],
    ['Domicilio', props.stop.domicilio],
    ['Localidad', props.stop.localidad],
    ['Zona', zones.join('\n')],
    ['Horario', timeWindow(props.stop.horaDesde, props.stop.horaHasta)],
    ['Teléfono', phones.value.join('\n')],
    ['Email', emails.join('\n')],
    ['Bultos totales', formatNumber(props.stop.totales.bultos)],
    ['Peso total', formatNumber(props.stop.totales.peso)],
    ['Volumen total', formatNumber(props.stop.totales.volumen)],
    ['Observación entrega', deliveryNotes.join('\n')],
    ['Observaciones', notes.join('\n')],
  ].filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
})

async function load() {
  controller?.abort()
  details.value = []
  error.value = ''
  const ids = props.stop.entregas.map(delivery => delivery.id).filter((id): id is number => id !== null)
  if (!ids.length) {
    error.value = 'Las órdenes de esta parada no tienen identificadores válidos.'
    return
  }
  controller = new AbortController()
  const signal = controller.signal
  loading.value = true
  try {
    details.value = await Promise.all(ids.map(async id => (await wepApi.delivery(id, signal)).entrega))
  } catch (reason) {
    if (!signal.aborted) error.value = errorMessage(reason)
  } finally {
    if (!signal.aborted) loading.value = false
  }
}

watch(open, value => {
  if (value) void load()
  else controller?.abort()
})
onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <Dialog v-model:open="open">
    <Button as-child variant="outline" class="w-full"><DialogTrigger><Info aria-hidden="true" /> Ver info</DialogTrigger></Button>
    <DialogContent class="top-auto bottom-0 max-h-[92dvh] w-full max-w-xl translate-y-0 overflow-y-auto rounded-b-none rounded-t-3xl pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <DialogHeader><DialogTitle>Información de la parada</DialogTitle><DialogDescription>Información completa de las entregas agrupadas.</DialogDescription></DialogHeader>
      <section class="rounded-xl bg-muted/40 p-4">
        <div class="flex flex-wrap items-start justify-between gap-3"><h3 class="break-words text-xl font-bold">{{ stop.cliente.nombre || 'Cliente sin nombre' }}</h3><DeliveryStatusBadge :status="stop.estado.codigo" /></div>
      </section>
      <LoadingState v-if="loading" />
      <ErrorState v-else-if="error" title="No pudimos cargar la información" :message="error" @retry="load" />
      <div v-else class="space-y-5">
        <div v-if="phones.length || address" class="flex flex-col gap-2"><Button v-for="(phone, index) in phones" :key="phone" as-child variant="outline"><a :href="`tel:${phone.replace(/[^+\d]/g, '')}`"><Phone aria-hidden="true" />{{ index === 0 ? 'Llamar' : 'Llamar al alternativo' }}</a></Button><Button v-if="address" as-child variant="secondary"><a :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`" target="_blank" rel="noopener noreferrer"><MapPin aria-hidden="true" /> Abrir mapa</a></Button></div>
        <dl class="divide-y"><div v-for="[label, value] in rows" :key="label!" class="py-3"><dt class="text-xs font-semibold text-muted-foreground">{{ label }}</dt><dd class="mt-1 whitespace-pre-wrap break-words text-sm">{{ value }}</dd></div></dl>
      </div>
    </DialogContent>
  </Dialog>
</template>
