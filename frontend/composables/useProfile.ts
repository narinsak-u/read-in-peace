import { ref, shallowRef, readonly, onUnmounted } from "vue";
import type { ProfileResponse } from "~/types/profile";

export function useProfile(userId: string) {
  const profile = ref<ProfileResponse | null>(null);
  const loading = shallowRef(true);
  const error = shallowRef<unknown>(null);
  let cancelled = false;

  onUnmounted(() => {
    cancelled = true;
  });

  async function fetch() {
    loading.value = true;
    error.value = null;
    try {
      const data = await $fetch<ProfileResponse>(`/api/profiles/${userId}`);
      if (!cancelled) profile.value = data;
    } catch (e) {
      if (!cancelled) {
        error.value = e;
        profile.value = null;
      }
    } finally {
      if (!cancelled) loading.value = false;
    }
  }

  fetch();

  return {
    profile,
    loading: readonly(loading),
    error: readonly(error),
    refresh: fetch,
  };
}
