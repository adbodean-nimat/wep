<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
defineProps<{ open: boolean; title: string; description: string; confirmLabel: string; busy: boolean; busyLabel?: string }>()
defineEmits<{ 'update:open': [value: boolean]; confirm: [] }>()
</script>
<template>
  <Dialog :open="open" @update:open="!busy && $emit('update:open', $event)">
    <DialogContent :show-close-button="false" @interact-outside="busy && $event.preventDefault()" @escape-key-down="busy && $event.preventDefault()">
      <DialogHeader><DialogTitle>{{ title }}</DialogTitle><DialogDescription class="whitespace-pre-line break-words">{{ description }}</DialogDescription></DialogHeader>
      <DialogFooter class="gap-2"><Button variant="outline" :disabled="busy" @click="$emit('update:open', false)">Cancelar</Button><Button :disabled="busy" @click="$emit('confirm')">{{ busy ? (busyLabel || 'Procesando…') : confirmLabel }}</Button></DialogFooter>
    </DialogContent>
  </Dialog>
</template>
