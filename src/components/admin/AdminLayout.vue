<script setup lang="ts">
import { computed, ref } from 'vue'
import { PanelLeft } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import AdminSidebarContent, { type AdminSection } from './AdminSidebarContent.vue'
import AppearanceSelect from './AppearanceSelect.vue'

const props = defineProps<{ active: AdminSection }>()
const emit = defineEmits<{ select: [section: AdminSection] }>()
const collapsed = ref(false), mobileOpen = ref(false)
const title = computed(() => ({ operation: 'Resumen operativo', technical: 'Diagnóstico TIC', users: 'Usuarios y acceso', settings: 'Configuración', vehicles: 'Camiones y accesos' })[props.active])
function select(section: AdminSection) { emit('select', section); mobileOpen.value = false }
</script>

<template>
  <div class="admin-workspace min-h-dvh bg-background text-foreground md:flex md:p-2" :class="collapsed ? 'md:gap-2' : 'md:gap-3'">
    <aside class="sticky top-2 hidden h-[calc(100dvh-1rem)] shrink-0 md:block" :class="collapsed ? 'w-[68px]' : 'w-60'" aria-label="Navegación administrativa">
      <AdminSidebarContent :active="active" :collapsed="collapsed" @select="select" />
    </aside>
    <Dialog v-model:open="mobileOpen">
      <DialogContent class="top-0 bottom-0 left-0 h-dvh w-[290px] max-w-[90vw] translate-x-0 translate-y-0 gap-0 rounded-none border-sidebar-border bg-sidebar p-0 text-sidebar-foreground sm:max-w-[290px] [&_[data-slot=dialog-close]]:text-sidebar-foreground">
        <DialogTitle class="sr-only">Administración WEP</DialogTitle><DialogDescription class="sr-only">Navegación y cuenta administrativa.</DialogDescription>
        <AdminSidebarContent :active="active" @select="select" />
      </DialogContent>
    </Dialog>
    <div class="min-w-0 flex-1 overflow-hidden bg-card md:rounded-xl md:border md:shadow-xs">
      <header class="flex min-h-16 flex-wrap items-center gap-2 border-b px-4 py-2 lg:gap-3 lg:px-7">
        <Button variant="ghost" size="icon" class="md:hidden" aria-label="Abrir navegación" :aria-expanded="mobileOpen" @click="mobileOpen = true"><PanelLeft aria-hidden="true" /></Button>
        <Button variant="ghost" size="icon" class="hidden md:inline-flex" :aria-label="collapsed ? 'Expandir lateral' : 'Contraer lateral'" :aria-expanded="!collapsed" @click="collapsed = !collapsed"><PanelLeft aria-hidden="true" /></Button>
        <span class="mr-1 hidden h-5 border-l sm:block" /><span class="hidden text-sm text-muted-foreground lg:inline">Administración</span><span class="hidden text-muted-foreground lg:inline">/</span><span class="text-xs font-medium sm:text-sm">{{ title }}</span>
        <div class="ml-auto flex items-center gap-3"><span class="hidden text-[10px] font-semibold uppercase tracking-wider text-muted-foreground xl:inline">WEP · Gestión</span><AppearanceSelect /></div>
      </header>
      <div class="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-7"><slot /></div>
    </div>
  </div>
</template>
