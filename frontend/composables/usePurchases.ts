import { ref, shallowRef, readonly } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useInvalidate } from '~/composables/useInvalidate'

export function usePurchases() {
  const auth = useAuthStore()
  const { invalidate, onInvalidate } = useInvalidate()

  const purchases = ref<any[]>([])
  const loaded = shallowRef(false)
  const loading = shallowRef(false)
  const error = shallowRef<unknown>(null)

  async function fetchPurchases() {
    if (!auth.signedIn) {
      loaded.value = true
      purchases.value = []
      return
    }
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<any[]>('/api/user/purchases')
      purchases.value = data
    } catch (e) {
      error.value = e
      purchases.value = []
    } finally {
      loaded.value = true
      loading.value = false
    }
  }

  async function confirmPurchase(sessionId: string) {
    await $fetch('/api/confirm-purchase', {
      method: 'POST',
      query: { session_id: sessionId },
    })
    invalidate('purchases')
  }

  onInvalidate('purchases', () => fetchPurchases())

  return {
    purchases: readonly(purchases),
    loaded: readonly(loaded),
    loading: readonly(loading),
    error: readonly(error),
    refresh: fetchPurchases,
    fetchPurchases,
    confirmPurchase,
  }
}
