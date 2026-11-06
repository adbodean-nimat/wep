<script setup lang="ts">
import { useRouter } from 'vue-router'
import { LogOut } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { adminUser, adminLogout } from '@/api/admin.api'
const router = useRouter()
function logout() { adminLogout(); void router.replace('/administracion/login') }
</script>
<template>
  <header class="border-b bg-white"><div class="mx-auto flex max-w-7xl items-center gap-4 px-5 py-4">
    <RouterLink to="/administracion" class="text-2xl font-extrabold tracking-tight">WEP<span class="text-primary">.</span></RouterLink>
    <span class="border-l pl-4 text-sm text-muted-foreground">Centro de control</span>
    <div class="ml-auto text-right"><p class="text-sm font-semibold">{{ adminUser?.displayName }}</p><p class="text-xs text-muted-foreground">{{ adminUser?.role === 'TIC' ? 'TIC' : 'Consulta' }}</p></div>
    <Button variant="ghost" size="icon" aria-label="Cerrar sesión administrativa" @click="logout"><LogOut aria-hidden="true" /></Button>
  </div></header>
</template>
