<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { AlertCircle, CheckCircle, FileText, LoaderCircle, MapPin, Package, QrCode } from '@lucide/vue'
import { toast } from 'vue-sonner'
import type { Html5Qrcode as Html5QrcodeInstance } from 'html5-qrcode'
import { ApiError } from '@/api/http'
import { wepApi } from '@/api/wep.api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import DeliveryStatusBadge from '@/components/deliveries/DeliveryStatusBadge.vue'
import type { QrResolveResponse, QrSuggestedAction } from '@/types/wep'
import { formatNumber } from '@/utils/formatters'

type ScannerState = 'closed' | 'scanning' | 'detected' | 'resolving' | 'resolved' | 'error' | 'noticing'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean]; 'notice-success': [] }>()
const readerId = `qr-reader-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
const state = ref<ScannerState>('closed')
const error = ref('')
const result = ref<QrResolveResponse | null>(null)
let scanner: Html5QrcodeInstance | null = null
let resolving = false
let scannerGeneration = 0

const actionCopy: Record<Exclude<QrSuggestedAction, 'AVISAR_CLIENTE'>, string> = {
  YA_AVISADO: 'El cliente ya fue avisado.',
  YA_ENTREGADA: 'Esta parada ya fue entregada.',
  NO_ENTREGADA: 'Esta parada está marcada como no entregada.',
  VIAJE_NO_INICIADO: 'Primero debés iniciar la vuelta para avisar al cliente.',
}
const canNotice = computed(() => result.value?.accionSugerida === 'AVISAR_CLIENTE')
const actionMessage = computed(() => {
  const action = result.value?.accionSugerida
  return action && action !== 'AVISAR_CLIENTE' ? actionCopy[action] : ''
})

function cameraMessage(reason: unknown): string {
  const name = reason instanceof DOMException ? reason.name : ''
  const text = reason instanceof Error ? reason.message.toLowerCase() : String(reason).toLowerCase()
  if (name === 'NotAllowedError' || /permission|notallowed|denied/.test(text)) return 'No pudimos acceder a la cámara. Revisá los permisos del navegador.'
  if (name === 'NotFoundError' || /notfound|no camera|no cameras/.test(text)) return 'No encontramos una cámara disponible en este dispositivo.'
  return 'No pudimos iniciar la cámara. Revisá que esté disponible e intentá de nuevo.'
}

function resolveMessage(reason: unknown): string {
  if (!(reason instanceof ApiError)) return 'Ocurrió un error al procesar el código QR.'
  if (reason.status === 400) return 'El código QR no es válido.'
  if (reason.status === 404) return 'No se encontró una parada para este QR.'
  if (reason.status === 409) {
    const message = reason.message.toLowerCase()
    return message.includes('parada')
      ? 'La Nota de Pedido está asociada a más de una parada.'
      : 'La Nota de Pedido está asociada a más de una vuelta.'
  }
  if (reason.status >= 500) return 'Ocurrió un error al procesar el código QR.'
  return reason.status === 0 ? 'No pudimos conectar con WEP. Revisá tu conexión e intentá de nuevo.' : 'No pudimos resolver el código QR.'
}

async function stopScanner(): Promise<void> {
  const active = scanner
  scanner = null
  if (!active) return
  try {
    if (active.isScanning) await active.stop()
  } catch {
    // La cámara puede haber sido detenida por el navegador al cambiar de pantalla.
  }
  try { active.clear() } catch { /* El contenedor puede haberse desmontado. */ }
}

async function resolveCode(decodedText: string, generation: number): Promise<void> {
  if (generation !== scannerGeneration || resolving || state.value !== 'scanning') return
  resolving = true
  state.value = 'detected'
  await stopScanner()
  state.value = 'resolving'
  try {
    result.value = await wepApi.resolveQr(decodedText)
    state.value = 'resolved'
  } catch (reason) {
    error.value = resolveMessage(reason)
    state.value = 'error'
  } finally {
    resolving = false
  }
}

async function startScanner(): Promise<void> {
  await stopScanner()
  const generation = ++scannerGeneration
  result.value = null
  error.value = ''
  if (!navigator.mediaDevices?.getUserMedia) {
    error.value = 'Este dispositivo o navegador no permite usar la cámara.'
    state.value = 'error'
    return
  }
  state.value = 'scanning'
  await nextTick()
  try {
    const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')
    if (!props.open || state.value !== 'scanning') return
    const instance = new Html5Qrcode(readerId, { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false })
    scanner = instance
    await instance.start(
      { facingMode: { ideal: 'environment' } },
      { fps: 10, qrbox: (width, height) => ({ width: Math.min(width, height, 260), height: Math.min(width, height, 260) }) },
      decodedText => { void resolveCode(decodedText, generation) },
      () => undefined,
    )
    if (generation !== scannerGeneration || !props.open || state.value !== 'scanning') {
      if (instance.isScanning) await instance.stop()
      instance.clear()
      if (scanner === instance) scanner = null
    }
  } catch (reason) {
    if (generation !== scannerGeneration || !props.open) return
    await stopScanner()
    error.value = cameraMessage(reason)
    state.value = 'error'
  }
}

async function setOpen(value: boolean): Promise<void> {
  if (!value && state.value === 'noticing') return
  if (!value) {
    scannerGeneration++
    await stopScanner()
    state.value = 'closed'
  }
  emit('update:open', value)
}

async function noticeClient(): Promise<void> {
  const resolved = result.value
  if (!resolved || !canNotice.value || state.value === 'noticing') return
  state.value = 'noticing'
  try {
    await wepApi.stopNotice(resolved.viaje.id, resolved.parada.grupoId)
    toast.success('Cliente avisado correctamente')
    emit('notice-success')
    state.value = 'resolved'
    await setOpen(false)
  } catch (reason) {
    error.value = reason instanceof ApiError && reason.status === 409
      ? 'La parada cambió de estado. Actualizá e intentá nuevamente.'
      : resolveMessage(reason)
    state.value = 'error'
  }
}

function orderLabel(order: QrResolveResponse['parada']['entregas'][number]['ordenPreparacion']): string {
  return [order.division, order.tipo, order.numero].filter(value => value !== null && value !== '').join(' / ')
}

watch(() => props.open, open => {
  if (open) void startScanner()
  else {
    scannerGeneration++
    void stopScanner()
  }
})
onBeforeUnmount(() => {
  scannerGeneration++
  void stopScanner()
})
</script>

<template>
  <Dialog :open="open" @update:open="setOpen">
    <DialogContent
      :show-close-button="false"
      class="top-auto bottom-0 max-h-[94dvh] w-full max-w-xl translate-y-0 overflow-y-auto rounded-b-none rounded-t-3xl pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      @interact-outside="state === 'noticing' && $event.preventDefault()"
      @escape-key-down="state === 'noticing' && $event.preventDefault()"
    >
      <DialogHeader>
        <DialogTitle>{{ state === 'resolved' || state === 'noticing' ? 'QR encontrado' : 'Escanear QR' }}</DialogTitle>
        <DialogDescription v-if="state === 'scanning'">Apuntá la cámara al código del remito.</DialogDescription>
        <DialogDescription v-else-if="state === 'detected' || state === 'resolving'">Código leído. Estamos buscando la parada…</DialogDescription>
      </DialogHeader>

      <div v-show="state === 'scanning'" class="overflow-hidden rounded-2xl bg-black">
        <div :id="readerId" class="min-h-72 w-full" />
      </div>
      <p v-if="state === 'scanning'" class="text-center text-xs text-muted-foreground">Ejemplo: WEP|0001|NPC|0000883524</p>

      <div v-if="state === 'detected' || state === 'resolving'" class="flex min-h-64 flex-col items-center justify-center gap-3" role="status">
        <LoaderCircle class="size-10 animate-spin text-primary" aria-hidden="true" />
        <p class="font-semibold">Resolviendo código…</p>
      </div>

      <section v-if="result && (state === 'resolved' || state === 'noticing')" class="space-y-4">
        <div class="rounded-2xl border bg-white p-4 shadow-sm">
          <div class="flex items-start justify-between gap-3">
            <div><h3 class="text-lg font-bold">{{ result.parada.cliente.nombre || 'Cliente sin nombre' }}</h3><p class="text-sm text-muted-foreground">Vuelta {{ result.viaje.numeroVuelta }}</p></div>
            <DeliveryStatusBadge :status="result.parada.estado.codigo" />
          </div>
          <div class="mt-4 space-y-3 text-sm">
            <div class="flex items-start gap-2"><MapPin :size="18" class="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" /><div><p class="font-medium">{{ result.parada.domicilio || 'Domicilio no informado' }}</p><p v-if="result.parada.localidad" class="text-muted-foreground">{{ result.parada.localidad }}</p></div></div>
            <p class="flex items-center gap-2"><QrCode :size="18" class="text-muted-foreground" aria-hidden="true" />{{ result.qr.division }} / {{ result.qr.tipo }} / {{ result.qr.pedido }}</p>
            <p class="flex items-center gap-2"><FileText :size="18" class="text-muted-foreground" aria-hidden="true" />{{ result.parada.cantidadOrdenes }} {{ result.parada.cantidadOrdenes === 1 ? 'orden' : 'órdenes' }}</p>
            <p class="flex items-center gap-2"><Package :size="18" class="text-muted-foreground" aria-hidden="true" />{{ formatNumber(result.parada.totales.bultos) }} bultos</p>
          </div>
        </div>
        <div v-if="result.parada.entregas.length" class="rounded-xl bg-secondary p-4">
          <p class="text-sm font-semibold">Órdenes incluidas</p>
          <ul class="mt-2 space-y-1 text-sm text-muted-foreground"><li v-for="delivery in result.parada.entregas" :key="delivery.id">OP {{ orderLabel(delivery.ordenPreparacion) || delivery.id }}</li></ul>
        </div>
        <p v-if="actionMessage" class="flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-900"><CheckCircle :size="19" class="mt-0.5 shrink-0" aria-hidden="true" />{{ actionMessage }}</p>
      </section>

      <div v-if="state === 'error'" class="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl bg-red-50 p-5 text-center" role="alert">
        <AlertCircle class="size-10 text-destructive" aria-hidden="true" />
        <p class="font-semibold text-red-900">{{ error }}</p>
      </div>

      <DialogFooter class="gap-2">
        <template v-if="state === 'resolved' || state === 'noticing'">
          <Button variant="outline" :disabled="state === 'noticing'" @click="setOpen(false)">Cerrar</Button>
          <Button :disabled="!canNotice || state === 'noticing'" @click="noticeClient">
            <LoaderCircle v-if="state === 'noticing'" class="animate-spin" aria-hidden="true" />
            {{ state === 'noticing' ? 'Avisando…' : 'Avisar cliente' }}
          </Button>
        </template>
        <template v-else-if="state === 'error'">
          <Button variant="outline" @click="setOpen(false)">Cerrar</Button>
          <Button @click="startScanner">Reintentar</Button>
        </template>
        <Button v-else variant="outline" @click="setOpen(false)">Cancelar</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
