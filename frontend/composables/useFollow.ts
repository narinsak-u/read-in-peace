import { shallowRef, readonly } from "vue";
import { useAuthStore } from "~/stores/auth";

export function useFollow() {
  const auth = useAuthStore();
  const submitting = shallowRef(false);
  const error = shallowRef<string | null>(null);

  async function toggle(
    targetUserId: string,
    onUpdate: (result: { following: boolean; followerCount: number }) => void,
  ) {
    if (!auth.signedIn) {
      auth.openAuthModal();
      return;
    }
    if (auth.user?.id === targetUserId) {
      error.value = "You cannot follow yourself";
      return;
    }

    submitting.value = true;
    error.value = null;

    try {
      const result = await $fetch<{
        following: boolean;
        followerCount: number;
      }>(`/api/profiles/${targetUserId}/follow`, { method: "POST" });
      onUpdate(result);
    } catch (err: any) {
      error.value =
        err?.message ?? err?.data?.message ?? "Failed to toggle follow";
    } finally {
      submitting.value = false;
    }
  }

  return {
    submitting: readonly(submitting),
    error: readonly(error),
    toggle,
  };
}
