import { ref, watch, onBeforeUnmount, type Ref } from 'vue'
import { wepApi } from '@/api/wep.api'
import type { DeliveryDetail } from '@/types/wep'
import { errorMessage } from '@/utils/formatters'

export function useDeliveryDetail(id: Ref<number | null>) {
  const delivery = ref<DeliveryDetail | null>(null)
  const loading = ref(false)
  const error = ref('')
  let controller: AbortController | undefined
  async function load() {
    controller?.abort()
    delivery.value = null
    error.value = ''
    if (id.value === null) { loading.value = false; return }
    controller = new AbortController()
    const signal = controller.signal
    loading.value = true
    try { delivery.value = (await wepApi.delivery(id.value, signal)).entrega }
    catch (e) { if (!signal.aborted) error.value = errorMessage(e) }
    finally { if (!signal.aborted) loading.value = false }
  }
  watch(id, load, { immediate: true })
  onBeforeUnmount(() => controller?.abort())
  return { delivery, loading, error, load }
}
