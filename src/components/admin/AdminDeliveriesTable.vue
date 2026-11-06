<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronDown } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import type { AdminDeliveryGroup, DashboardData } from '@/types/admin'
import AdminOrderDetails from './AdminOrderDetails.vue'
import { groupAdminOrders, orderNotice, orderStatus } from '@/utils/adminOrders'
import { adminTone, orderStateLabels as deliveryStates } from '@/utils/adminPresentation'

const props = defineProps<{ data: DashboardData; loading: boolean; stale: boolean }>()
const emit = defineEmits<{ page: [delta: number] }>()
const expanded = ref(new Set<string>())
const groups = computed(() => props.data.groups ?? props.data.deliveries.map(order => ({ id: `order-${order.id}`, orders: [order] })))
function orderCount(group: AdminDeliveryGroup) { return groupAdminOrders(group.orders).length }
const pages = computed(() => Math.max(1, Math.ceil((props.data.totalGroups ?? props.data.summary.total) / (props.data.pageSize || 50))))
function toggle(id: string) { const next = new Set(expanded.value); if (next.has(id)) next.delete(id); else next.add(id); expanded.value = next }
function noticesCount(group: AdminDeliveryGroup) { return groupAdminOrders(group.orders).filter(order => orderNotice(order.preparations)).length }
watch(() => props.data.page, () => { expanded.value = new Set() })
</script>

<template>
  <section class="mt-6 overflow-hidden rounded-2xl border bg-card" aria-labelledby="deliveries-title">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b p-5">
      <div><h2 id="deliveries-title" class="text-lg font-bold">Detalle de entregas</h2><p class="mt-1 text-xs text-muted-foreground"><span v-if="data.totalGroups !== undefined">{{ data.totalGroups }} paradas según los filtros.</span> Desplegá una parada para ver sus pedidos.</p></div>
      <span v-if="loading" role="status" class="text-xs text-muted-foreground">Actualizando…</span>
    </div>
    <p v-if="data.grouping !== 'parada'" class="border-b bg-muted/40 px-5 py-3 text-xs text-muted-foreground">Vista por pedido. La agrupación completa por parada requiere actualizar el servidor WEP.</p>
    <div class="overflow-x-auto" :class="{ 'opacity-60': loading || stale }">
      <table class="w-full min-w-[800px] text-left text-sm">
        <caption class="sr-only">Entregas agrupadas por cliente, domicilio y viaje, con pedidos desplegables</caption>
        <thead class="border-b bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th class="px-5 py-3">Cliente / destino</th><th class="px-5 py-3">Pedidos</th><th class="px-5 py-3">Vehículo</th><th class="px-5 py-3">Estado</th><th class="px-5 py-3">Avisos</th></tr></thead>
        <tbody>
          <template v-for="group in groups" :key="group.id">
            <tr v-if="group.orders.length" class="border-b hover:bg-muted/40">
              <td class="px-5 py-4"><p class="font-semibold">{{ group.orders[0]!.cliente_nombre || group.orders[0]!.cliente_codigo }}</p><p class="mt-1 text-xs text-muted-foreground">{{ group.orders[0]!.domicilio || 'Sin domicilio registrado' }}</p><p class="mt-1 text-xs text-muted-foreground">{{ group.orders[0]!.localidad || 'Sin localidad' }} · {{ group.orders[0]!.cliente_codigo }}</p></td>
              <td class="px-5 py-4"><button type="button" class="inline-flex min-h-10 items-center gap-2 rounded-md px-2 text-primary hover:bg-accent" :aria-expanded="expanded.has(group.id)" :aria-controls="`admin-orders-${group.id}`" :aria-label="`Ver ${orderCount(group)} ${orderCount(group) === 1 ? 'pedido' : 'pedidos'} de ${group.orders[0]!.cliente_nombre || group.orders[0]!.cliente_codigo}`" @click="toggle(group.id)"><ChevronDown class="size-4 transition-transform" :class="{ 'rotate-180': expanded.has(group.id) }" aria-hidden="true" />{{ orderCount(group) }} {{ orderCount(group) === 1 ? 'pedido' : 'pedidos' }}</button></td>
              <td class="px-5 py-4"><p class="font-medium">{{ group.orders[0]!.vehiculo }}</p><p class="mt-1 text-xs text-muted-foreground">{{ group.orders[0]!.patente }} · Vuelta {{ group.orders[0]!.vuelta }}</p></td>
              <td class="px-5 py-4"><span class="whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold" :class="adminTone(orderStatus(group.orders))">{{ deliveryStates[orderStatus(group.orders)] || orderStatus(group.orders) }}</span></td>
              <td class="px-5 py-4 text-xs text-muted-foreground"><p>{{ noticesCount(group) }} de {{ orderCount(group) }} {{ orderCount(group) === 1 ? 'pedido' : 'pedidos' }} con aviso</p><p class="mt-1">Ver detalle al desplegar</p></td>
            </tr>
            <tr v-if="expanded.has(group.id)" :id="`admin-orders-${group.id}`" class="border-b bg-muted/20"><td colspan="5" class="px-5 py-4">
              <AdminOrderDetails :orders="group.orders" :client="group.orders[0]?.cliente_nombre || group.orders[0]?.cliente_codigo || 'Cliente'" />
            </td></tr>
          </template>
          <tr v-if="!groups.length"><td colspan="5" class="px-5 py-14 text-center text-muted-foreground">No hay entregas para estos filtros.</td></tr>
        </tbody>
      </table>
    </div>
    <div class="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4 text-sm"><span class="text-muted-foreground">Página {{ data.page }} de {{ pages }}<span v-if="data.grouping === 'parada'"> · hasta {{ data.pageSize }} paradas por página</span></span><div class="flex gap-2"><Button variant="outline" :disabled="loading || data.page <= 1" @click="emit('page', -1)">Anterior</Button><Button variant="outline" :disabled="loading || data.page >= pages" @click="emit('page', 1)">Siguiente</Button></div></div>
  </section>
</template>
