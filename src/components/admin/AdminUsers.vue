<script setup lang="ts">
import { toast } from 'vue-sonner'
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { adminApi, adminUser, adminLogout } from '@/api/admin.api'
import type { AdminUser } from '@/types/admin'
const router = useRouter()
const users = ref<AdminUser[]>([]), error = ref(''), loading = ref(false), saving = ref(false)
const editing = ref<number | null>(null), editor = ref(false)
const username = ref(''), displayName = ref(''), role = ref('CONSULTA'), active = ref(true), password = ref('')
async function load() {
  loading.value = true; error.value = ''
  try { users.value = await adminApi.users() }
  catch (e) { error.value = e instanceof Error ? e.message : 'No pudimos consultar usuarios.' }
  finally { loading.value = false }
}
function edit(user?: AdminUser) {
  editing.value = user?.id ?? null; username.value = user?.username ?? ''; displayName.value = user?.displayName ?? ''
  role.value = user?.role ?? 'CONSULTA'; active.value = user?.active ?? true; password.value = ''; editor.value = true; error.value = ''
}
async function save() {
  if (saving.value) return
  saving.value = true; error.value = ''
  try {
    await adminApi.saveUser({ username: username.value, displayName: displayName.value, role: role.value,
      active: active.value, ...(password.value ? { password: password.value } : {}) }, editing.value ?? undefined)
    password.value = ''; editor.value = false
    toast.success('Usuario guardado', { description: 'Los cambios de acceso se aplican de inmediato.' })
    if (editing.value === adminUser.value?.id) { adminLogout(); await router.replace('/administracion/login'); return }
    await load()
  } catch (e) { error.value = e instanceof Error ? e.message : 'No pudimos guardar el usuario.'; toast.error(error.value) }
  finally { saving.value = false; password.value = '' }
}
onMounted(load)
</script>
<template>
  <section class="rounded-2xl border bg-card p-5 sm:p-7" aria-labelledby="users-title">
    <div class="flex flex-wrap items-center justify-between gap-3"><div><h2 id="users-title" class="text-xl font-bold">Usuarios y acceso</h2><p class="mt-1 text-sm text-muted-foreground">Cuentas propias de WEP. Solo TIC puede administrarlas.</p></div><Button @click="edit()" :disabled="saving">Crear usuario</Button></div>
    <p v-if="error" role="alert" class="mt-5 rounded-lg status-danger p-3 text-sm text-destructive">{{ error }}</p>
    <form v-if="editor" class="mt-6 grid gap-4 rounded-xl border bg-background p-5 sm:grid-cols-2" @submit.prevent="save">
      <h3 class="font-semibold sm:col-span-2">{{ editing ? 'Editar usuario' : 'Nuevo usuario' }}</h3>
      <label class="text-sm font-medium">Usuario<input v-model="username" required minlength="3" maxlength="64" pattern="[a-zA-Z0-9._-]{3,64}" autocomplete="off" :disabled="!!editing || saving" class="mt-1 block w-full rounded-lg border bg-card p-3"></label>
      <label class="text-sm font-medium">Nombre visible<input v-model="displayName" required maxlength="120" :disabled="saving" class="mt-1 block w-full rounded-lg border bg-card p-3"></label>
      <label class="text-sm font-medium">Rol<select v-model="role" :disabled="saving" class="mt-1 block w-full rounded-lg border bg-card p-3"><option value="CONSULTA">Consulta · solo lectura</option><option value="TIC">TIC · diagnóstico y usuarios</option></select></label>
      <label class="text-sm font-medium">{{ editing ? 'Nueva contraseña (opcional)' : 'Contraseña' }}<input v-model="password" type="password" autocomplete="new-password" :required="!editing" minlength="12" maxlength="72" :disabled="saving" class="mt-1 block w-full rounded-lg border bg-card p-3"><span class="mt-1 block text-xs text-muted-foreground">Mínimo 12 caracteres; hasta 72 bytes. {{ editing ? 'Vacío conserva la actual.' : '' }}</span></label>
      <label v-if="editing" class="flex items-center gap-2 text-sm"><input v-model="active" type="checkbox" :disabled="saving">Usuario activo</label>
      <p class="text-xs text-muted-foreground sm:col-span-2">Consulta permite revisar la operación. TIC agrega diagnóstico y administración de usuarios. Ningún rol de este tablero envía avisos ni modifica entregas.</p>
      <div class="flex gap-2 sm:col-span-2"><Button type="submit" :disabled="saving">{{ saving ? 'Guardando…' : 'Guardar usuario' }}</Button><Button type="button" variant="outline" :disabled="saving" @click="editor = false; password = ''">Cancelar</Button></div>
    </form>
    <p v-if="loading" role="status" class="mt-6 text-sm text-muted-foreground">Consultando usuarios…</p>
    <div v-else class="mt-6 overflow-x-auto"><table class="w-full text-left text-sm"><caption class="sr-only">Usuarios habilitados y deshabilitados de WEP</caption><thead class="border-b text-muted-foreground"><tr><th class="p-3">Persona / usuario</th><th class="p-3">Rol</th><th class="p-3">Acceso</th><th class="p-3"><span class="sr-only">Acciones</span></th></tr></thead><tbody><tr v-for="user in users" :key="user.id" class="border-b last:border-0"><td class="p-3"><p class="font-semibold">{{ user.displayName }}</p><p class="text-xs text-muted-foreground">{{ user.username }}</p></td><td class="p-3">{{ user.role === 'TIC' ? 'TIC' : 'Consulta' }}</td><td class="p-3">{{ user.active ? 'Activo' : 'Desactivado' }}</td><td class="p-3 text-right"><Button variant="outline" :disabled="saving" :aria-label="`Editar usuario ${user.username}`" @click="edit(user)">Editar</Button></td></tr></tbody></table></div>
  </section>
</template>
