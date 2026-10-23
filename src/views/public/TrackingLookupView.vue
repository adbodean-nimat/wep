<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { LoaderCircle, Search } from '@lucide/vue'
import { lookupPublicTracking, trackingLookupError, validTrackingLookup } from '@/api/trackingLookup.api'
import { Button } from '@/components/ui/button'

const router = useRouter()
const pedido = ref('')
const telefonoUltimos4 = ref('')
const submitting = ref(false)
const errorMessage = ref('')
const submitted = ref(false)
const pedidoInvalid = computed(() => !/^\d{1,20}$/.test(pedido.value.trim()))
const phoneInvalid = computed(() => !/^\d{4}$/.test(telefonoUltimos4.value))
let controller: AbortController | undefined

async function submit() {
  if (submitting.value) return
  submitted.value = true
  errorMessage.value = ''
  const input = { pedido: pedido.value, telefonoUltimos4: telefonoUltimos4.value }
  if (!validTrackingLookup(input)) return
  submitting.value = true
  const current = new AbortController()
  controller = current
  try {
    const publicId = await lookupPublicTracking(input, current.signal)
    if (current.signal.aborted) return
    pedido.value = ''
    telefonoUltimos4.value = ''
    submitted.value = false
    await router.replace({ name: 'public-tracking', params: { publicId } })
  } catch (error) {
    if (!current.signal.aborted) errorMessage.value = trackingLookupError(error)
  } finally {
    if (!current.signal.aborted) submitting.value = false
  }
}

onBeforeUnmount(() => {
  controller?.abort()
  pedido.value = ''
  telefonoUltimos4.value = ''
})
</script>

<template>
  <section class="rounded-2xl border bg-white p-6 shadow-sm" aria-labelledby="lookup-title">
    <h1 id="lookup-title" class="text-2xl font-bold tracking-tight">Consultá tu entrega</h1>
    <p class="mt-2 text-sm text-muted-foreground">Ingresá el número de pedido y los últimos 4 dígitos del teléfono registrado para la entrega.</p>
    <form class="mt-6 space-y-5" novalidate autocomplete="off" :aria-busy="submitting" @submit.prevent="submit">
      <div>
        <label for="pedido" class="text-sm font-semibold">Número de pedido</label>
        <input id="pedido" v-model="pedido" type="text" inputmode="numeric" pattern="[0-9]{1,20}" maxlength="20" required
          :disabled="submitting" :aria-invalid="submitted && pedidoInvalid" aria-describedby="pedido-help pedido-error"
          class="mt-2 h-12 w-full rounded-xl border bg-background px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60" />
        <p id="pedido-help" class="mt-2 text-xs text-muted-foreground">Solo números, tal como figura en tu pedido.</p>
        <p v-if="submitted && pedidoInvalid" id="pedido-error" role="alert" class="mt-2 text-sm text-destructive">Ingresá un pedido de 1 a 20 dígitos.</p>
      </div>
      <div>
        <label for="telefono" class="text-sm font-semibold">Últimos 4 dígitos del teléfono</label>
        <input id="telefono" v-model="telefonoUltimos4" type="text" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required
          :disabled="submitting" :aria-invalid="submitted && phoneInvalid" aria-describedby="telefono-error"
          class="mt-2 h-12 w-full rounded-xl border bg-background px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60" />
        <p v-if="submitted && phoneInvalid" id="telefono-error" role="alert" class="mt-2 text-sm text-destructive">Ingresá exactamente 4 dígitos.</p>
      </div>
      <p v-if="errorMessage" role="alert" class="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{{ errorMessage }}</p>
      <Button type="submit" class="h-12 w-full" :disabled="submitting">
        <LoaderCircle v-if="submitting" class="animate-spin" aria-hidden="true" />
        <Search v-else aria-hidden="true" />
        <span aria-live="polite">{{ submitting ? 'Buscando entrega...' : 'Consultar entrega' }}</span>
      </Button>
    </form>
    <p class="mt-5 text-xs text-muted-foreground">El seguimiento estará disponible cuando NIMAT lo haya habilitado para tu entrega y mientras siga vigente.</p>
  </section>
</template>
