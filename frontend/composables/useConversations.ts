import { ref, readonly } from "vue";
import type { Conversation } from "~/types/chat";

const conversations = ref<Conversation[]>([]);
const unreadCount = ref(0);
const loading = ref(false);

export function useConversations() {
  const config = useRuntimeConfig();

  async function fetchConversations(): Promise<void> {
    loading.value = true;
    try {
      const data = await $fetch<Conversation[]>(
        `${config.public.backendUrl}/api/chat/conversations`,
        { credentials: "include" },
      );
      conversations.value = data;
    } catch {
      conversations.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function fetchUnread(): Promise<void> {
    try {
      const data = await $fetch<{ count: number }>(
        `${config.public.backendUrl}/api/chat/unread`,
        { credentials: "include" },
      );
      unreadCount.value = data.count;
    } catch {
      unreadCount.value = 0;
    }
  }

  return {
    conversations: readonly(conversations),
    unreadCount: readonly(unreadCount),
    loading: readonly(loading),
    fetchConversations,
    fetchUnread,
  };
}
