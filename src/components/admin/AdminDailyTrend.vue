<script setup lang="ts">
import { computed, ref } from 'vue'
import { useElementSize } from '@vueuse/core'
import type { DailyDeliveryPoint } from '@/types/admin'

const props = defineProps<{ points?: DailyDeliveryPoint[]; days: number; loading: boolean }>()
const emit = defineEmits<{ period: [days: number] }>()
const unit = ref<'stops' | 'orders'>('stops')
const selected = ref<number | null>(null)
const container = ref<HTMLElement>()
const { width: measuredWidth } = useElementSize(container)
const width = computed(() => Math.max(200, measuredWidth.value || 280))
const points = computed(() => props.points ?? [])
const values = computed(() => points.value.map(point => ({ ...point, total: unit.value === 'stops' ? point.paradas : point.pedidos, completed: unit.value === 'stops' ? point.completadas : point.pedidos_entregados })))
const maximum = computed(() => Math.max(1, ...values.value.map(point => point.total)))
const ticks = computed(() => [...new Set([0, Math.ceil(maximum.value / 2), maximum.value])])
const x = (index: number) => 36 + index / Math.max(1, values.value.length - 1) * (width.value - 56)
const y = (value: number) => 180 - value / maximum.value * 140
function path(key: 'total' | 'completed') { return values.value.map((point, index) => `${index ? 'L' : 'M'}${x(index)},${y(point[key])}`).join(' ') }
function shortDate(date: string) { return `${date.slice(8, 10)}/${date.slice(5, 7)}` }
const labelIndices = computed(() => {
  const last = values.value.length - 1
  return last < 0 ? [] : [...new Set([0, Math.round(last / 2), last])]
})
const active = computed(() => values.value[Math.min(selected.value ?? values.value.length - 1, values.value.length - 1)])
const unitLabel = computed(() => unit.value === 'stops' ? 'paradas' : 'órdenes')
function totalLabel(value: number) { return unit.value === 'stops' ? value === 1 ? 'parada' : 'paradas' : value === 1 ? 'orden' : 'órdenes' }
function completedLabel(value: number) { return unit.value === 'stops' ? value === 1 ? 'completada' : 'completadas' : value === 1 ? 'entregada' : 'entregadas' }
const description = computed(() => values.value.map(point => `${shortDate(point.fecha)}: ${point.total} ${totalLabel(point.total)}, ${point.completed} ${completedLabel(point.completed)}`).join('; '))
</script>

<template>
  <section class="mt-6 min-w-0 rounded-xl border bg-card p-5 sm:p-6" aria-labelledby="daily-trend-title">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div><h2 id="daily-trend-title" class="font-semibold">Entregas por día</h2><p class="mt-1 text-xs text-muted-foreground">Últimos {{ points.length || days }} días hasta la fecha seleccionada · según fecha programada.</p></div>
      <div class="flex flex-wrap gap-3">
        <label class="text-xs text-muted-foreground">Contar<select v-model="unit" class="ml-2 rounded-md border bg-background px-2 py-2 text-foreground"><option value="stops">Paradas</option><option value="orders">Órdenes</option></select></label>
        <label class="text-xs text-muted-foreground">Período<select :value="days" :disabled="loading" class="ml-2 rounded-md border bg-background px-2 py-2 text-foreground" @change="emit('period', Number(($event.target as HTMLSelectElement).value))"><option :value="7">7 días</option><option :value="14">14 días</option><option :value="30">30 días</option></select></label>
      </div>
    </div>
    <template v-if="points.length">
      <div class="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground"><span class="inline-flex items-center gap-2"><span class="w-6 border-t-2 border-dashed border-[var(--chart-active)]" />{{ unit === 'stops' ? 'Paradas programadas' : 'Órdenes programadas' }}</span><span class="inline-flex items-center gap-2"><span class="w-6 border-t-2 border-[var(--chart-delivered)]" />{{ unit === 'stops' ? 'Paradas completadas' : 'Órdenes entregadas' }}</span></div>
      <div ref="container" class="mt-3 w-full">
        <svg :viewBox="`0 0 ${width} 215`" class="block w-full" role="img" aria-labelledby="daily-svg-title daily-svg-description">
          <title id="daily-svg-title">Evolución diaria de {{ unitLabel }}</title><desc id="daily-svg-description">{{ description }}</desc>
          <g v-for="tick in ticks" :key="tick"><line x1="36" :x2="width - 20" :y1="y(tick)" :y2="y(tick)" stroke="var(--border)" /><text x="27" :y="y(tick) + 4" text-anchor="end" fill="var(--muted-foreground)" font-size="11">{{ tick }}</text></g>
          <path :d="path('total')" fill="none" stroke="var(--chart-active)" stroke-width="2" stroke-dasharray="5 4" />
          <path :d="path('completed')" fill="none" stroke="var(--chart-delivered)" stroke-width="2.5" />
          <g v-for="(point, index) in values" :key="point.fecha">
            <circle :cx="x(index)" :cy="y(point.total)" r="3" fill="var(--card)" stroke="var(--chart-active)" stroke-width="2" />
            <circle :cx="x(index)" :cy="y(point.completed)" r="3" fill="var(--chart-delivered)" />
            <rect :x="x(index) - Math.max(6, (width - 56) / values.length / 2)" y="20" :width="Math.max(12, (width - 56) / values.length)" height="170" fill="transparent" tabindex="0" role="button" :aria-label="`${shortDate(point.fecha)}: ${point.total} ${totalLabel(point.total)}, ${point.completed} ${completedLabel(point.completed)}`" @pointerenter="selected = index" @focus="selected = index" @click="selected = index" @keydown.enter="selected = index" @keydown.space.prevent="selected = index" />
          </g>
          <g v-for="index in labelIndices" :key="index"><text :x="x(index)" y="207" :text-anchor="index === 0 ? 'start' : index === values.length - 1 ? 'end' : 'middle'" fill="var(--muted-foreground)" font-size="11">{{ shortDate(values[index]!.fecha) }}</text></g>
        </svg>
      </div>
      <p v-if="active" class="mt-2 min-h-5 text-xs text-muted-foreground" aria-live="polite">{{ shortDate(active.fecha) }} · <strong class="font-semibold text-foreground">{{ active.total }} {{ totalLabel(active.total) }}</strong> · {{ active.completed }} {{ completedLabel(active.completed) }}</p>
    </template>
    <p v-else class="py-10 text-center text-sm text-muted-foreground">La evolución diaria estará disponible al actualizar la API de WEP.</p>
    <p class="mt-4 border-t pt-3 text-[11px] text-muted-foreground">Aplica el filtro de vehículo. Estado y búsqueda se aplican a los indicadores y al detalle, no a esta evolución. Una parada está completada cuando todos sus pedidos están entregados; se muestra su estado actual según la fecha programada.</p>
  </section>
</template>
