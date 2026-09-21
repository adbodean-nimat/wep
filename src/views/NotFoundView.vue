<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'
import { Button } from '@/components/ui/button'
</script>
<template>
  <h1 class="text-2xl font-bold">No encontramos esta página</h1>
  <Button as-child class="mt-6 w-full"><RouterLink to="/chofer/viajes"><ArrowLeft aria-hidden="true" /> Volver a mis viajes</RouterLink></Button>
</template>
