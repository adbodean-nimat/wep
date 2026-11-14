<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ShieldCheck } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { adminApi } from '@/api/admin.api'
import AppearanceSelect from '@/components/admin/AppearanceSelect.vue'
const router = useRouter()
const username = ref(''), password = ref(''), error = ref(''), busy = ref(false)
async function login() {
  if (busy.value) return
  busy.value = true; error.value = ''
  try { await adminApi.login(username.value, password.value); await router.replace('/administracion') }
  catch (e) { error.value = e instanceof Error ? e.message : 'No pudimos iniciar sesión.' }
  finally { password.value = ''; busy.value = false }
}
</script>
<template>
  <div class="mx-auto flex min-h-[85dvh] max-w-md flex-col justify-center py-10">
    <div class="mb-9 flex items-center justify-between gap-4">
      <RouterLink to="/chofer/login" aria-label="NIMAT · WEP">
        <img :src="'/nimat-logo-verde.svg'" alt="NIMAT · Materiales para la construcción" width="351" height="120" class="h-auto w-40 dark:hidden">
        <img :src="'/nimat-logo-blanco.svg'" alt="NIMAT · Materiales para la construcción" width="351" height="120" class="hidden h-auto w-40 dark:block">
      </RouterLink>
      <AppearanceSelect />
    </div>
    <div class="mb-5 flex size-12 items-center justify-center rounded-2xl bg-secondary text-primary"><ShieldCheck aria-hidden="true" /></div>
    <p class="text-xs font-bold uppercase tracking-widest text-primary">Administración</p>
    <h1 class="mt-2 text-3xl font-bold tracking-tight">Toda la operación,<br>en un solo lugar.</h1>
    <p class="mt-3 text-muted-foreground">Consultá entregas, viajes y avisos con tu usuario WEP.</p>
    <form class="mt-8 space-y-5 rounded-2xl border bg-card p-6 shadow-sm" @submit.prevent="login">
      <div><label for="admin-username" class="text-sm font-semibold">Usuario WEP</label><input id="admin-username" v-model="username" autocomplete="username" autocapitalize="none" :spellcheck="false" maxlength="64" required class="mt-2 w-full rounded-lg border bg-background px-3 py-3" :disabled="busy"></div>
      <div><label for="admin-password" class="text-sm font-semibold">Contraseña</label><input id="admin-password" v-model="password" type="password" autocomplete="current-password" required class="mt-2 w-full rounded-lg border bg-background px-3 py-3" :disabled="busy"></div>
      <p v-if="error" role="alert" class="rounded-lg status-danger p-3 text-sm text-destructive">{{ error }}</p>
      <Button type="submit" class="w-full" :disabled="busy">{{ busy ? 'Ingresando…' : 'Ingresar al tablero' }}</Button>
    </form>
    <p class="mt-5 text-center text-xs text-muted-foreground">¿Necesitás acceso? Solicitá tu usuario al equipo de TIC.</p>
    <RouterLink to="/chofer/login" class="mt-6 block text-center text-sm text-muted-foreground underline underline-offset-4">Iniciar sesión como chofer</RouterLink>
  </div>
</template>
