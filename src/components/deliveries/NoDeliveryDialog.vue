<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '@/components/ui/dialog'
import { reasonLabels } from '@/utils/deliveries'
import type { NoDeliveryPayload, NoDeliveryReason } from '@/types/wep'
const props = defineProps<{ open: boolean; busy: boolean; client: string }>()
defineEmits<{ 'update:open': [value: boolean]; submit: [payload: NoDeliveryPayload] }>()
const reason = ref<NoDeliveryReason | ''>('')
const observation = ref('')
const valid = computed(() => !!reason.value && (reason.value !== 'OTRO' || !!observation.value.trim()) && observation.value.length <= 500)
watch(() => props.open, open => { if (open) { reason.value = ''; observation.value = '' } })
</script>
<template>
  <Dialog :open="open" @update:open="!busy && $emit('update:open', $event)">
    <DialogContent class="max-h-[90dvh] overflow-y-auto" :show-close-button="false" @interact-outside="busy && $event.preventDefault()" @escape-key-down="busy && $event.preventDefault()">
      <DialogHeader><DialogTitle>Marcar como no entregada</DialogTitle><DialogDescription class="break-words">{{ client }}. Indicá por qué no se pudo realizar la entrega.</DialogDescription></DialogHeader>
      <form class="space-y-5" @submit.prevent="valid && reason && $emit('submit', { motivo: reason, observacion: observation.trim() })">
        <div><label for="reason" class="mb-2 block text-sm font-semibold">Motivo</label><select id="reason" v-model="reason" required :disabled="busy" class="min-h-12 w-full rounded-xl border bg-white px-3 text-base"><option disabled value="">Elegí un motivo</option><option v-for="(label, code) in reasonLabels" :key="code" :value="code">{{ label }}</option></select></div>
        <div><label for="observation" class="mb-2 block text-sm font-semibold">Observación {{ reason === 'OTRO' ? '(obligatoria)' : '(opcional)' }}</label><textarea id="observation" v-model="observation" :disabled="busy" :required="reason === 'OTRO'" maxlength="500" rows="3" class="w-full resize-y rounded-xl border bg-white p-3 text-base" aria-describedby="observation-help" /><p id="observation-help" class="mt-1 text-xs text-muted-foreground">{{ observation.length }}/500 caracteres</p></div>
        <div class="flex flex-col gap-2"><Button type="submit" variant="destructive" :disabled="busy || !valid">{{ busy ? 'Guardando…' : 'Confirmar no entrega' }}</Button><Button type="button" variant="outline" :disabled="busy" @click="$emit('update:open', false)">Cancelar</Button></div>
      </form>
    </DialogContent>
  </Dialog>
</template>
