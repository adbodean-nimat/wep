<script setup lang="ts">
import { CircleHelp, RefreshCw } from '@lucide/vue'
import { Button } from '@/components/ui/button'

defineProps<{ notFound?: boolean }>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <section class="rounded-3xl border bg-white px-6 py-10 text-center shadow-sm" role="alert">
    <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><CircleHelp :size="30" aria-hidden="true" /></div>
    <h1 class="mt-5 text-2xl font-bold">{{ notFound ? 'Seguimiento no disponible' : 'No pudimos consultar el estado de la entrega' }}</h1>
    <p class="mx-auto mt-2 max-w-sm leading-relaxed text-muted-foreground">
      {{ notFound ? 'Este enlace puede haber vencido o ya no estar disponible.' : 'Revisá tu conexión e intentá nuevamente.' }}
    </p>
    <Button v-if="!notFound" class="mt-6" variant="outline" @click="$emit('retry')"><RefreshCw aria-hidden="true" /> Reintentar</Button>
  </section>
</template>
