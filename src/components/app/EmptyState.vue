<script setup lang="ts">
import { Package } from '@lucide/vue'
withDefaults(defineProps<{ title?: string; description?: string }>(), {
  title: 'No hay viajes programados para hoy',
  description: 'Cuando tengas una vuelta asignada, aparecerá acá.',
})
</script>

<template>
  <section role="status" class="rounded-2xl border bg-white px-6 py-12 text-center">
    <Package aria-hidden="true" class="mx-auto mb-5 size-10 text-primary" />
    <h2 class="text-lg font-semibold">{{ title }}</h2>
    <p class="mt-2 text-sm leading-6 text-muted-foreground">{{ description }}</p>
  </section>
</template>
