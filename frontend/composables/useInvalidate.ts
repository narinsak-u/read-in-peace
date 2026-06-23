import { reactive, watch } from 'vue'

const channels = reactive<Record<string, number>>({})

export function useInvalidate() {
  function invalidate(...keys: string[]) {
    for (const key of keys) {
      channels[key] = (channels[key] ?? 0) + 1
    }
  }

  function onInvalidate(key: string | (() => string), cb: () => void) {
    const resolved = typeof key === 'function' ? key : () => key
    watch(
      () => channels[resolved()],
      () => cb(),
    )
  }

  return { invalidate, onInvalidate }
}
