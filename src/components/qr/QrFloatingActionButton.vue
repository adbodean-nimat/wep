<script setup lang="ts">
import { QrCode } from '@lucide/vue'
import { Button } from '@/components/ui/button'

defineEmits<{ click: [] }>()
</script>

<template>
  <Button
    type="button"
    size="icon"
    class="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 size-16 rounded-full shadow-xl transition-transform active:scale-95"
    aria-label="Escanear QR"
    title="Escanear QR"
    @click="$emit('click')"
  >
    <QrCode class="size-7" aria-hidden="true" />
  </Button>
</template>
