<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { LogOut, Truck } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import ConfirmDialog from '@/components/app/ConfirmDialog.vue'
import { useWepAuth } from '@/composables/useWepAuth'

const router = useRouter()
const auth = useWepAuth()
const confirmingLogout = ref(false)

async function logout() {
  auth.logout()
  confirmingLogout.value = false
  await router.replace('/chofer/login')
}
</script>

<template>
  <header class="border-b border-border bg-white">
    <div class="mx-auto flex max-w-xl items-center gap-3 px-5 py-4">
      <RouterLink to="/chofer/viajes" class="flex min-h-12 flex-col justify-center rounded-md" aria-label="WEP · Ir a entregas">
        <span class="text-xl font-extrabold tracking-tight">WEP<span class="text-primary">.</span></span>
        <span class="text-xs font-medium text-muted-foreground">Entregas programadas</span>
      </RouterLink>
      <div v-if="auth.vehicle.value" class="ml-auto flex min-w-0 items-center gap-2 text-right">
        <Truck class="hidden size-5 shrink-0 text-primary sm:block" aria-hidden="true" />
        <div class="min-w-0 leading-tight">
          <p class="truncate text-sm font-semibold">{{ auth.vehicle.value.nombre }}</p>
          <p class="truncate text-xs text-muted-foreground">{{ auth.vehicle.value.patente }}</p>
        </div>
      </div>
      <Button size="icon" variant="ghost" aria-label="Cerrar sesión" title="Cerrar sesión" @click="confirmingLogout = true"><LogOut aria-hidden="true" /></Button>
    </div>
  </header>
  <ConfirmDialog
    :open="confirmingLogout"
    title="¿Cerrar sesión de este camión?"
    description="Para ingresar con otro camión primero tenés que cerrar esta sesión."
    confirm-label="Cerrar sesión"
    :busy="false"
    @update:open="confirmingLogout = $event"
    @confirm="logout"
  />
</template>
