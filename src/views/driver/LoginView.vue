<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Eye, EyeOff, LoaderCircle, LockKeyhole, LogIn, RefreshCw, Truck } from '@lucide/vue'
import { ApiError } from '@/api/http'
import { authApi } from '@/api/auth.api'
import { useWepAuth } from '@/composables/useWepAuth'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { WepVehicle } from '@/types/auth'

const router = useRouter()
const auth = useWepAuth()
const vehicles = ref<WepVehicle[]>([])
const selectedVehicleId = ref<string>()
const pin = ref('')
const showPin = ref(false)
const loadingVehicles = ref(true)
const vehiclesError = ref(false)
const submitting = ref(false)
const loginError = ref('')
let controller: AbortController | undefined

const canSubmit = computed(() => !!selectedVehicleId.value && !!pin.value && !submitting.value)

async function loadVehicles() {
  controller?.abort()
  controller = new AbortController()
  loadingVehicles.value = true
  vehiclesError.value = false
  try {
    vehicles.value = (await authApi.vehicles(controller.signal)).vehiculos
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'AbortError')) vehiclesError.value = true
  } finally {
    if (!controller.signal.aborted) loadingVehicles.value = false
  }
}

function updatePin(event: Event) {
  const input = event.target as HTMLInputElement
  const numeric = input.value.replace(/\D/g, '')
  pin.value = numeric
  input.value = numeric
}

function loginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Camión o PIN incorrecto'
    if (error.status === 429) return 'Demasiados intentos. Esperá unos minutos e intentá nuevamente.'
  }
  return 'No pudimos iniciar sesión. Intentá nuevamente.'
}

async function submit() {
  if (!canSubmit.value || submitting.value) return
  const vehiculoId = Number(selectedVehicleId.value)
  if (!Number.isSafeInteger(vehiculoId) || vehiculoId <= 0) return
  submitting.value = true
  loginError.value = ''
  auth.clearSessionMessage()
  try {
    await auth.login(vehiculoId, pin.value)
    pin.value = ''
    await router.replace('/chofer/viajes')
  } catch (error) {
    pin.value = ''
    loginError.value = loginErrorMessage(error)
  } finally {
    submitting.value = false
  }
}

onMounted(loadVehicles)
onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <div class="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center py-4">
    <section class="w-full rounded-2xl border bg-white p-6 shadow-sm" aria-labelledby="login-title">
      <div class="text-center">
        <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Truck :size="30" aria-hidden="true" /></div>
        <h1 id="login-title" class="mt-3 text-3xl font-extrabold tracking-tight">WEP<span class="text-primary">.</span></h1>
        <p class="text-sm font-medium text-muted-foreground">Entregas Programadas</p>
        <p class="mt-6 font-semibold">Seleccioná tu camión para continuar</p>
      </div>

      <p v-if="auth.sessionMessage.value" class="mt-5 rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-900" role="alert">{{ auth.sessionMessage.value }}</p>

      <form class="mt-6 space-y-5" @submit.prevent="submit">
        <div>
          <label class="mb-2 block text-sm font-semibold" for="vehicle-select">Camión</label>
          <div v-if="loadingVehicles" class="flex min-h-12 items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground" aria-live="polite"><LoaderCircle class="size-4 animate-spin" aria-hidden="true" /> Cargando camiones...</div>
          <div v-else-if="vehiclesError" class="rounded-xl border border-destructive/30 bg-red-50 p-4" role="alert">
            <p class="text-sm font-medium text-destructive">No pudimos cargar los camiones</p>
            <Button class="mt-3 w-full" type="button" variant="outline" @click="loadVehicles"><RefreshCw aria-hidden="true" /> Reintentar</Button>
          </div>
          <Select v-else v-model="selectedVehicleId" :disabled="submitting">
            <SelectTrigger id="vehicle-select"><SelectValue placeholder="Seleccionar camión" /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="item in vehicles" :key="item.id" :value="String(item.id)">{{ item.patente }} - {{ item.nombre }}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div v-if="selectedVehicleId">
          <label class="mb-2 flex items-center gap-2 text-sm font-semibold" for="pin"><LockKeyhole class="size-4" aria-hidden="true" /> PIN</label>
          <div class="relative">
            <input
              id="pin"
              :type="showPin ? 'text' : 'password'"
              inputmode="numeric"
              autocomplete="current-password"
              placeholder="••••••"
              :value="pin"
              :disabled="submitting"
              class="min-h-12 w-full rounded-md border border-input bg-white px-3 py-2 pr-12 text-base tracking-widest outline-none focus:ring-3 focus:ring-ring/30 disabled:opacity-50"
              @input="updatePin"
            >
            <button type="button" class="absolute right-1 top-1 flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted" :aria-label="showPin ? 'Ocultar PIN' : 'Mostrar PIN'" :disabled="submitting" @click="showPin = !showPin">
              <EyeOff v-if="showPin" aria-hidden="true" /><Eye v-else aria-hidden="true" />
            </button>
          </div>
        </div>

        <p v-if="loginError" class="rounded-xl bg-red-50 p-3 text-sm font-medium text-destructive" role="alert">{{ loginError }}</p>
        <Button class="w-full" size="lg" type="submit" :disabled="!canSubmit">
          <LoaderCircle v-if="submitting" class="animate-spin" aria-hidden="true" /><LogIn v-else aria-hidden="true" />
          {{ submitting ? 'Validando...' : 'Ingresar' }}
        </Button>
      </form>
    </section>
  </div>
</template>
