<script setup lang="ts">
import { CircleAlert, RefreshCw } from '@lucide/vue'
import { Button } from '@/components/ui/button'
withDefaults(defineProps<{ title?: string; message: string; retry?: boolean }>(), {
  title: 'No pudimos cargar los viajes', retry: true,
})
defineEmits<{ retry: [] }>()
</script>

<template>
  <section role="alert" class="rounded-2xl border bg-white p-6">
    <CircleAlert aria-hidden="true" class="mb-4 size-8 text-destructive" />
    <h2 class="text-lg font-semibold">{{ title }}</h2>
    <p class="mt-2 text-sm leading-6 text-muted-foreground">{{ message }}</p>
    <Button v-if="retry" class="mt-5 w-full" variant="outline" @click="$emit('retry')">
      <RefreshCw aria-hidden="true" /> Reintentar
    </Button>
  </section>
</template>
