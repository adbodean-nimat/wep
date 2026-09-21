<script setup lang="ts">
import { ChevronUp, ChevronDown } from '@lucide/vue'
import { Button } from '@/components/ui/button'
defineProps<{ first: boolean; last: boolean; disabled: boolean; client: string }>()
defineEmits<{ move: [offset: -1 | 1] }>()
</script>
<template>
  <div class="mt-4 grid grid-cols-2 gap-2 border-t pt-4" :aria-label="`Orden de ${client}`">
    <Button variant="outline" :aria-label="`Subir ${client}`" :disabled="first || disabled" @click="$emit('move', -1)"><ChevronUp aria-hidden="true" /> Subir</Button>
    <Button variant="outline" :aria-label="`Bajar ${client}`" :disabled="last || disabled" @click="$emit('move', 1)"><ChevronDown aria-hidden="true" /> Bajar</Button>
  </div>
</template>
