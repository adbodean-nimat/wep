<script setup lang="ts">
import { toast } from 'vue-sonner'
import { onMounted, ref } from 'vue'
import { adminApi } from '@/api/admin.api'
import { Button } from '@/components/ui/button'
import AdminChangeHistory from './AdminChangeHistory.vue'
import type { AdminVehicle } from '@/types/admin'
const vehicles = ref<AdminVehicle[]>([]), drafts = ref<Record<string, { loginEnabled: boolean; pin: string }>>({})
const loading = ref(false), busyId = ref<number | null>(null), error = ref(''), historyKey = ref(0)
function time(value: string | null) { return value ? new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : 'Sin importaciones registradas' }
async function load() {
  loading.value = true; error.value = ''
  try { vehicles.value = await adminApi.vehicles(); drafts.value = Object.fromEntries(vehicles.value.map(v => [v.id, { loginEnabled: v.wep_login_activo, pin: '' }])) }
  catch (e) { error.value = e instanceof Error ? e.message : 'No pudimos consultar los camiones.' }
  finally { loading.value = false }
}
async function save(v: AdminVehicle) {
  const draft = drafts.value[v.id]; if (!draft) return
  busyId.value = v.id; error.value = ''
  try {
    await adminApi.saveVehicle(v.id, draft.loginEnabled, draft.pin || undefined)
    v.wep_login_activo = draft.loginEnabled; v.pin_configured ||= !!draft.pin; draft.pin = ''; historyKey.value++
    toast.success(`Acceso de ${v.nombre} actualizado`, { description: 'Al bloquearlo o cambiar su PIN se cierran sus sesiones existentes.' })
  } catch (e) { draft.pin = ''; error.value = e instanceof Error ? e.message : 'No pudimos actualizar el camión.'; toast.error(error.value) }
  finally { busyId.value = null }
}
onMounted(load)
</script>
<template>
  <div class="space-y-5">
    <div class="rounded-xl border bg-muted/30 p-5"><p class="text-sm">El chofer accede con el camión y su PIN. El código ERP mantiene la vinculación de sus entregas; nombre y patente se actualizan desde el ERP.</p><p class="mt-2 text-xs text-muted-foreground">Bloquear el acceso a la PWA conserva la importación de entregas. Los códigos que se importan se administran en Configuración → Sincronización.</p></div>
    <p v-if="error" role="alert" class="rounded-xl border status-danger p-4 text-sm text-destructive">{{ error }}</p>
    <p v-if="loading" role="status" class="p-6 text-sm text-muted-foreground">Cargando camiones…</p>
    <Button v-if="!vehicles.length && !loading" variant="outline" @click="load">{{ error ? 'Reintentar' : 'Actualizar camiones' }}</Button>
    <p v-if="!vehicles.length && !loading && !error" class="text-sm text-muted-foreground">No hay camiones registrados.</p>
    <div class="grid gap-5 xl:grid-cols-2"><form v-for="v in vehicles" :key="v.id" class="rounded-xl border bg-card p-5" @submit.prevent="save(v)">
      <div class="flex flex-wrap items-center justify-between gap-2"><h2 class="font-semibold">{{ v.nombre }} · {{ v.patente }}</h2><span class="rounded-full bg-muted px-3 py-1 text-xs">{{ v.es_externo ? 'Externo' : v.activo ? 'Activo' : 'Inactivo' }}</span></div>
      <p class="mt-2 text-xs text-muted-foreground">Código ERP: {{ v.codigo_erp || 'Sin vinculación' }} · Última importación: {{ time(v.last_imported_at) }}</p>
      <fieldset v-if="drafts[v.id]" :disabled="busyId !== null" class="mt-5 space-y-4">
        <label class="flex items-center gap-2 text-sm font-medium"><input v-model="drafts[v.id]!.loginEnabled" type="checkbox">Acceso a la PWA habilitado</label>
        <label class="block text-xs font-semibold">Nuevo PIN · {{ v.pin_configured ? 'Ya tiene PIN' : 'Sin PIN configurado' }}<input v-model="drafts[v.id]!.pin" type="password" inputmode="numeric" pattern="[0-9]{4,8}" minlength="4" maxlength="8" autocomplete="new-password" placeholder="Vacío conserva el actual" class="mt-2 block w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground"><span class="mt-2 block font-normal text-muted-foreground">Entre 4 y 8 dígitos. El PIN anterior nunca se muestra.</span></label>
        <p v-if="!v.activo || v.es_externo" class="text-xs text-muted-foreground">Solo los camiones activos e internos pueden tener acceso habilitado.</p>
        <Button type="submit" :disabled="busyId !== null || (drafts[v.id]!.loginEnabled === v.wep_login_activo && !drafts[v.id]!.pin)">{{ busyId === v.id ? 'Guardando…' : 'Guardar acceso' }}</Button>
      </fieldset>
    </form></div>
    <AdminChangeHistory v-if="vehicles.length" :refresh-key="historyKey" />
  </div>
</template>
