<script setup lang="ts">
import { computed } from 'vue'
import type { AdminDelivery } from '@/types/admin'
import { groupAdminOrders, orderNotice, orderStatus, orderWindow } from '@/utils/adminOrders'
import { adminTime, adminTone, orderStateLabels as deliveryStates, noticeStates } from '@/utils/adminPresentation'

const props = defineProps<{ orders: AdminDelivery[]; client: string }>()
const groups = computed(() => groupAdminOrders(props.orders).map(group => ({ ...group, status: orderStatus(group.preparations), window: orderWindow(group.preparations), notice: orderNotice(group.preparations) })))
</script>

<template>
  <table class="w-full text-left text-xs">
    <caption class="pb-3 text-left font-semibold">Pedidos de {{ client }}</caption>
    <thead class="border-b text-muted-foreground"><tr><th class="px-3 py-2">Pedido</th><th class="px-3 py-2">Franja horaria</th><th class="px-3 py-2">Estado</th><th class="px-3 py-2">Aviso del pedido</th></tr></thead>
    <tbody>
      <tr v-for="group in groups" :key="group.id" class="border-b last:border-0">
        <td class="px-3 py-4"><p class="font-semibold">{{ group.pedido ? `Pedido ${group.pedido}` : 'Sin pedido asociado' }}</p><p v-if="group.pedido && groups.filter(item => item.pedido === group.pedido).length > 1" class="mt-1 text-muted-foreground">{{ [group.division, group.tipo].filter(Boolean).join(' · ') }}</p></td>
        <td class="whitespace-nowrap px-3 py-4">{{ group.window }}</td>
        <td class="px-3 py-4"><span class="rounded-full px-2 py-1" :class="adminTone(group.status)">{{ deliveryStates[group.status] || group.status }}</span></td>
        <td class="px-3 py-4"><span class="rounded-full px-2 py-1" :class="adminTone(group.notice?.aviso_estado ?? null)">{{ group.notice ? noticeStates[group.notice.aviso_estado!] || group.notice.aviso_estado : 'Sin aviso registrado' }}</span><p v-if="group.notice?.aviso_fecha" class="mt-2 text-muted-foreground">{{ adminTime(group.notice.aviso_fecha) }}</p></td>
      </tr>
    </tbody>
  </table>
</template>
