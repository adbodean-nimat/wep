<script setup lang="ts">
import { computed } from 'vue'
import { LayoutDashboard, Activity, Users, LogOut, ShieldCheck, Truck, Settings } from '@lucide/vue'
import { adminUser, adminLogout } from '@/api/admin.api'
import { useRouter } from 'vue-router'

export type AdminSection = 'operation' | 'technical' | 'users' | 'settings' | 'vehicles'
const props = defineProps<{ active: AdminSection; collapsed?: boolean }>()
const emit = defineEmits<{ select: [section: AdminSection] }>()
const router = useRouter()
const items = computed(() => [
  { id: 'operation' as const, label: 'Resumen operativo', icon: LayoutDashboard },
  ...(adminUser.value?.role === 'TIC' ? [
    { id: 'technical' as const, label: 'Diagnóstico TIC', icon: Activity },
    { id: 'users' as const, label: 'Usuarios y acceso', icon: Users },
    { id: 'vehicles' as const, label: 'Camiones y accesos', icon: Truck },
    { id: 'settings' as const, label: 'Configuración', icon: Settings },
  ] : []),
])
const initials = computed(() => (adminUser.value?.displayName || 'WEP').split(' ').slice(0, 2).map(part => part[0]).join('').toUpperCase())
function logout() { adminLogout(); void router.replace('/administracion/login') }
</script>

<template>
  <div class="admin-sidebar flex h-full flex-col gap-6 rounded-xl bg-sidebar p-3 text-sidebar-foreground">
    <RouterLink to="/administracion" class="flex min-h-14 items-center gap-3 rounded-lg" :class="props.collapsed ? 'px-0' : 'px-2'" aria-label="WEP · Centro de control">
      <span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-nimat-600 text-white"><Truck class="size-5" aria-hidden="true" /></span>
      <div v-if="!props.collapsed"><p class="text-2xl font-extrabold leading-none tracking-tight">WEP<span class="text-nimat-300">.</span></p><p class="mt-1 text-[11px] text-sidebar-muted">Centro de control</p></div>
    </RouterLink>
    <nav aria-label="Secciones del tablero" class="space-y-1">
      <p v-if="!props.collapsed" class="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-muted">Administración</p>
      <button v-for="item in items" :key="item.id" type="button" :title="item.label" :aria-label="item.label" :aria-current="active === item.id ? 'page' : undefined" class="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition-colors" :class="active === item.id ? 'bg-sidebar-accent text-sidebar-foreground' : 'text-sidebar-muted hover:bg-white/10 hover:text-sidebar-foreground'" @click="emit('select', item.id)">
        <component :is="item.icon" class="size-[18px] shrink-0" aria-hidden="true" /><span v-if="!props.collapsed">{{ item.label }}</span>
      </button>
    </nav>
    <div v-if="!props.collapsed" class="mt-auto rounded-xl border border-sidebar-border bg-white/5 p-4">
      <ShieldCheck class="mb-3 size-5 text-nimat-300" aria-hidden="true" /><p class="text-xs font-semibold">Información para decidir</p><p class="mt-2 text-xs leading-relaxed text-sidebar-muted">Consultá entregas, viajes y avisos desde un solo lugar.</p>
      <span class="mt-4 inline-flex items-center gap-2 text-[11px] text-sidebar-muted"><span class="size-1.5 rounded-full bg-nimat-300" />{{ adminUser?.role === 'TIC' ? 'Configuración y accesos para TIC' : 'Operación de solo lectura' }}</span>
    </div>
    <div class="flex items-center gap-2 border-t border-sidebar-border pt-4" :class="{ 'mt-auto': props.collapsed }">
      <span v-if="!props.collapsed" class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-xs font-semibold">{{ initials }}</span>
      <div v-if="!props.collapsed" class="min-w-0 flex-1"><p class="truncate text-xs font-semibold">{{ adminUser?.displayName }}</p><p class="mt-1 text-[11px] text-sidebar-muted">{{ adminUser?.role === 'TIC' ? 'Administrador TIC' : 'Consulta' }}</p></div>
      <button type="button" aria-label="Cerrar sesión administrativa" title="Cerrar sesión" class="flex size-10 shrink-0 items-center justify-center rounded-lg text-sidebar-muted hover:bg-white/10" @click="logout"><LogOut class="size-4" aria-hidden="true" /></button>
    </div>
    <footer class="flex justify-center border-t border-sidebar-border pt-4" aria-label="NIMAT · Materiales para la construcción">
      <span v-if="props.collapsed" class="relative size-9 overflow-hidden"><img :src="'/nimat-logo-blanco.svg'" alt="NIMAT" class="absolute top-0 left-0 h-[51px] w-[149px] max-w-none" width="351" height="120"></span>
      <img v-else :src="'/nimat-logo-blanco.svg'" alt="NIMAT · Materiales para la construcción" class="h-auto w-32" width="351" height="120">
    </footer>
  </div>
</template>
