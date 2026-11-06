<script setup lang="ts">
import { computed } from 'vue'
import { ArrowUpRight, PackageCheck } from '@lucide/vue'
import type { DashboardData } from '@/types/admin'

const props = defineProps<{ summary: DashboardData['summary'] }>()
const series = computed(() => [
  { label: 'Entregadas', value: props.summary.entregadas, color: 'var(--chart-delivered)' },
  { label: 'En reparto', value: props.summary.en_reparto, color: 'var(--chart-active)' },
  { label: 'No entregadas', value: props.summary.no_entregadas, color: 'var(--chart-warning)' },
  { label: 'Otros estados', value: Math.max(0, props.summary.total - props.summary.entregadas - props.summary.en_reparto - props.summary.no_entregadas), color: 'var(--chart-other)' },
])
const maximum = computed(() => Math.max(1, ...series.value.map(item => item.value)))
const rate = computed(() => props.summary.total ? Math.round(props.summary.entregadas / props.summary.total * 100) : 0)
const ticks = computed(() => [...new Set([0, Math.ceil(maximum.value / 2), maximum.value])])
const description = computed(() => series.value.map(item => `${item.label}: ${item.value}`).join('. '))
</script>

<template>
  <div class="mt-6 grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
    <section class="min-w-0 rounded-xl border bg-card" aria-labelledby="operation-chart-title">
      <div class="flex flex-wrap items-start justify-between gap-3 p-5 pb-0 sm:px-6"><div><h2 id="operation-chart-title" class="font-semibold">Distribución de pedidos</h2><p class="mt-1 text-xs text-muted-foreground">Órdenes según los filtros seleccionados.</p></div><span class="rounded-md border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">{{ summary.total }} órdenes</span></div>
      <dl class="space-y-4 p-5 sm:hidden">
        <div v-for="item in series" :key="item.label"><div class="mb-2 flex justify-between gap-3 text-xs"><dt class="text-muted-foreground">{{ item.label }}</dt><dd class="font-semibold">{{ item.value }}</dd></div><div class="h-3 rounded bg-muted" aria-hidden="true"><div class="h-full rounded" :style="{ width: `${item.value / maximum * 100}%`, backgroundColor: item.color }" /></div></div>
      </dl>
      <div class="hidden px-3 pt-3 sm:block sm:px-5">
        <svg viewBox="0 0 680 230" role="img" aria-labelledby="distribution-title distribution-description" class="block w-full">
          <title id="distribution-title">Pedidos por estado</title><desc id="distribution-description">{{ description }}</desc>
          <g v-for="tick in ticks" :key="tick"><line x1="45" x2="665" :y1="185 - tick / maximum * 140" :y2="185 - tick / maximum * 140" stroke="var(--border)" stroke-dasharray="3 4" /><text x="30" :y="189 - tick / maximum * 140" text-anchor="end" fill="var(--muted-foreground)" font-size="11">{{ tick }}</text></g>
          <g v-for="(item, index) in series" :key="item.label"><rect :x="78 + index * 155" :y="185 - item.value / maximum * 140" width="78" :height="item.value / maximum * 140" rx="5" :fill="item.color" /><text :x="117 + index * 155" :y="175 - item.value / maximum * 140" text-anchor="middle" fill="var(--foreground)" font-size="13" font-weight="600">{{ item.value }}</text><text :x="117 + index * 155" y="213" text-anchor="middle" fill="var(--muted-foreground)" font-size="11">{{ item.label }}</text></g>
        </svg>
      </div>
      <p class="border-t px-5 py-3 text-[11px] text-muted-foreground sm:px-6">En reparto incluye cliente avisado. Otros estados incluye programadas, asignadas y canceladas.</p>
    </section>
    <section class="flex flex-col rounded-xl border bg-linear-to-br from-secondary/40 to-card p-5 sm:p-6" aria-labelledby="completion-title">
      <div class="flex items-center justify-between"><h2 id="completion-title" class="text-sm font-semibold">Cumplimiento de pedidos</h2><PackageCheck class="size-5 text-primary" aria-hidden="true" /></div>
      <p class="mt-7 text-5xl font-semibold tracking-tight">{{ rate }}<span class="text-2xl text-muted-foreground">%</span></p>
      <p class="mt-2 text-xs text-muted-foreground">{{ summary.entregadas }} de {{ summary.total }} órdenes entregadas</p>
      <div role="progressbar" aria-label="Órdenes entregadas" :aria-valuenow="rate" :aria-valuemin="0" :aria-valuemax="100" class="my-5 h-2 overflow-hidden rounded-full bg-primary/10"><div class="h-full rounded-full bg-primary" :style="{ width: `${rate}%` }" /></div>
      <div class="mt-auto border-t pt-4"><p class="flex items-center gap-2 text-xs font-semibold"><ArrowUpRight class="size-4 text-primary" aria-hidden="true" />{{ summary.total ? 'Avance de la operación seleccionada' : 'Sin órdenes para estos filtros' }}</p><p class="mt-2 text-[11px] leading-relaxed text-muted-foreground">{{ summary.viajes }} viajes · {{ summary.no_entregadas }} órdenes no entregadas</p></div>
    </section>
  </div>
</template>
