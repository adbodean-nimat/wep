<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError } from '@/api/http'
import { lookupPublicTracking } from '@/api/trackingLookup.api'
import { Button } from '@/components/ui/button'

const router = useRouter()
const pedido = ref('')
const telefonoUltimos4 = ref('')
const pedidoError = ref('')
const telefonoError = ref('')
const loading = ref(false)
const errorStatus = ref<number | null>(null)
let controller: AbortController | undefined

async function submit() {
  if (loading.value) return
  pedidoError.value = /^\d{1,20}$/.test(pedido.value.trim()) ? '' : 'Ingresá un número de pedido válido.'
  telefonoError.value = /^\d{4}$/.test(telefonoUltimos4.value) ? '' : 'Ingresá los últimos 4 dígitos del teléfono.'
  errorStatus.value = null
  if (pedidoError.value || telefonoError.value) return
  loading.value = true
  const requestController = new AbortController()
  controller = requestController
  try {
    const publicId = await lookupPublicTracking(pedido.value.trim(), telefonoUltimos4.value, requestController.signal)
    if (requestController.signal.aborted) return
    pedido.value = ''
    telefonoUltimos4.value = ''
    await router.push(`/s/${publicId}`)
  } catch (error) {
    if (requestController.signal.aborted) return
    errorStatus.value = error instanceof ApiError ? error.status : 0
  } finally {
    loading.value = false
  }
}

onBeforeUnmount(() => {
  controller?.abort()
  pedido.value = ''
  telefonoUltimos4.value = ''
})
</script>

<template>
  <section class="rounded-2xl border bg-white p-5 shadow-sm sm:p-7" aria-labelledby="lookup-title">
    <h1 id="lookup-title" class="text-2xl font-bold tracking-tight">Seguimiento de entrega</h1>
    <p class="mt-3 text-sm leading-relaxed text-muted-foreground">Ingresá tu número de pedido y los últimos 4 dígitos del teléfono registrado.</p>

    <form class="mt-7 space-y-5" autocomplete="off" novalidate :aria-busy="loading" @submit.prevent="submit">
      <div>
        <label for="pedido" class="block text-sm font-semibold">Número de pedido</label>
        <input id="pedido" v-model="pedido" name="pedido" type="text" inputmode="numeric" autocomplete="off" maxlength="20" placeholder="Ej. 883524"
          class="mt-2 min-h-12 w-full rounded-lg border bg-background px-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
          :disabled="loading" :aria-invalid="!!pedidoError" :aria-describedby="pedidoError ? 'pedido-error' : undefined" />
        <p v-if="pedidoError" id="pedido-error" class="mt-2 text-sm text-destructive">{{ pedidoError }}</p>
      </div>
      <div>
        <label for="telefono" class="block text-sm font-semibold">Últimos 4 dígitos del teléfono</label>
        <input id="telefono" v-model="telefonoUltimos4" name="telefonoUltimos4" type="text" inputmode="numeric" autocomplete="off" maxlength="4" placeholder="Ej. 3569"
          class="mt-2 min-h-12 w-full rounded-lg border bg-background px-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
          :disabled="loading" :aria-invalid="!!telefonoError" :aria-describedby="telefonoError ? 'telefono-help telefono-error' : 'telefono-help'" />
        <p id="telefono-help" class="mt-2 text-xs text-muted-foreground">Usá el teléfono registrado en tu pedido.</p>
        <p v-if="telefonoError" id="telefono-error" class="mt-2 text-sm text-destructive">{{ telefonoError }}</p>
      </div>
      <div v-if="errorStatus !== null" class="rounded-lg bg-muted p-4 text-sm" role="alert">
        <p v-if="errorStatus === 400">Revisá el número de pedido y los últimos 4 dígitos del teléfono e intentá nuevamente.</p>
        <template v-else-if="errorStatus === 404">
          <p>No encontramos una entrega con los datos ingresados.</p>
          <p class="mt-2 text-muted-foreground">Revisá el número de pedido y los últimos 4 dígitos del teléfono.</p>
        </template>
        <p v-else-if="errorStatus === 429">Realizaste varios intentos. Esperá unos minutos antes de volver a intentar.</p>
        <p v-else>No pudimos consultar tu entrega en este momento.</p>
      </div>
      <Button type="submit" class="min-h-12 w-full" :disabled="loading" :aria-busy="loading">
        {{ loading ? 'Buscando entrega...' : errorStatus !== null && errorStatus !== 404 && errorStatus !== 429 ? 'Reintentar' : 'Ver seguimiento' }}
      </Button>
      <p class="text-xs leading-relaxed text-muted-foreground">Si tu entrega todavía no está disponible, comunicate con NIMAT para consultar su estado.</p>
    </form>
  </section>
</template>
