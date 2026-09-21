<template>
  <div role="status" aria-live="polite" aria-label="Cargando entregas" class="space-y-4">
    <span class="sr-only">Cargando…</span>
    <div v-for="n in 3" :key="n" class="space-y-4 rounded-2xl border bg-white p-5 motion-safe:animate-pulse">
      <div class="h-5 w-1/3 rounded bg-muted" />
      <div class="h-4 w-2/3 rounded bg-muted" />
      <div class="h-12 rounded-xl bg-muted" />
    </div>
  </div>
</template>
