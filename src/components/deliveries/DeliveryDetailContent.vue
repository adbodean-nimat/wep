<script setup lang="ts">
import { computed } from 'vue'
import { MapPin, Phone, User } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import type { DeliveryDetail, DocumentReference } from '@/types/wep'
import { formatNumber, mapAddress, timeWindow } from '@/utils/formatters'
import DeliveryStatusBadge from './DeliveryStatusBadge.vue'
const props = defineProps<{ delivery: DeliveryDetail }>()
const document = (value: DocumentReference) => [value.division, value.tipo, value.numero].filter(v => v !== null && v !== '').join(' · ')
const rows = computed(() => [
  ['Código cliente', props.delivery.cliente.codigo], ['Orden de preparación', document(props.delivery.ordenPreparacion)],
  ['Nota de pedido', document(props.delivery.notaPedido)], ['Domicilio', props.delivery.entrega.domicilio],
  ['Localidad', props.delivery.entrega.localidad], ['Zona', [props.delivery.entrega.zonaCodigo, props.delivery.entrega.zonaNombre].filter(Boolean).join(' · ')],
  ['Horario', timeWindow(props.delivery.entrega.horaDesde, props.delivery.entrega.horaHasta)],
  ['Teléfono', props.delivery.contacto.telefono], ['Teléfono alternativo', props.delivery.contacto.telefonoAlternativo],
  ['Email', props.delivery.contacto.email], ['Peso', props.delivery.logistica.pesoCalculado === null ? null : formatNumber(props.delivery.logistica.pesoCalculado)],
  ['Volumen', props.delivery.logistica.volumenCalculado === null ? null : formatNumber(props.delivery.logistica.volumenCalculado)],
  ['Bultos', props.delivery.logistica.bultosCalculados === null ? null : formatNumber(props.delivery.logistica.bultosCalculados)],
  ['Observación entrega', props.delivery.observacionEntrega], ['Observaciones', props.delivery.observaciones],
].filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== ''))
const phones = computed(() => [props.delivery.contacto.telefono, props.delivery.contacto.telefonoAlternativo].filter((p): p is string => !!p && /\d/.test(p)))
const address = computed(() => mapAddress(props.delivery.entrega.domicilio, props.delivery.entrega.localidad))
</script>
<template>
  <div class="space-y-5">
    <div><User class="mb-3 text-primary" aria-hidden="true" /><h2 class="break-words text-xl font-bold">{{ delivery.cliente.nombre || 'Cliente sin nombre' }}</h2><div class="mt-2"><DeliveryStatusBadge :status="delivery.estado.codigo" /></div></div>
    <div v-if="phones.length || address" class="flex flex-col gap-2"><Button v-for="(phone, index) in phones" :key="index" as-child variant="outline"><a :href="`tel:${phone.replace(/[^+\d]/g, '')}`"><Phone aria-hidden="true" />{{ index === 0 ? 'Llamar' : 'Llamar al alternativo' }}</a></Button><Button v-if="address" as-child variant="secondary"><a :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`" target="_blank" rel="noopener noreferrer"><MapPin aria-hidden="true" /> Abrir mapa</a></Button></div>
    <dl class="divide-y"><div v-for="[label, value] in rows" :key="label!" class="py-3"><dt class="text-xs font-semibold text-muted-foreground">{{ label }}</dt><dd class="mt-1 whitespace-pre-wrap break-words text-sm">{{ value }}</dd></div></dl>
  </div>
</template>
