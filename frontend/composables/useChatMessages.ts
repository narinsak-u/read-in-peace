import { ref, readonly, onUnmounted } from 'vue';
import { useChatSocket } from './useChatSocket';
import { useAuthStore } from '~/stores/auth';
import type { DirectMessage } from '~/types/chat';

export function useChatMessages(userId: string, onSent?: () => void) {
  const config = useRuntimeConfig();
  const { user } = useAuthStore();
  const currentUserId = user?.id ?? '';
  const messages = ref<DirectMessage[]>([]);
  const loading = ref(false);
  const sending = ref(false);
  const error = ref<string | null>(null);
  const hasMore = ref(true);
  const { connect, emit } = useChatSocket();

  let tempCounter = 0;
  let lastSentTempId: string | null = null;
  let socket: ReturnType<typeof connect> | null = null;

  function connectSocket(): void {
    if (socket) return;
    socket = connect();
    socket.on('chat:message', handleIncoming);
    socket.on('chat:sent', handleSent);
    socket.on('chat:error', handleError);
  }

  function disconnectSocket(): void {
    if (!socket) return;
    socket.off('chat:message', handleIncoming);
    socket.off('chat:sent', handleSent);
    socket.off('chat:error', handleError);
    socket = null;
  }

  function handleIncoming(data: DirectMessage): void {
    if (data.senderId === userId) {
      messages.value = [...messages.value, data];
    }
  }

  function handleSent(data: { id: string; createdAt: string }): void {
    if (lastSentTempId) {
      const idx = messages.value.findIndex((m) => m.id === lastSentTempId);
      if (idx !== -1) {
        messages.value[idx] = {
          ...messages.value[idx],
          id: data.id,
          createdAt: new Date(data.createdAt),
          senderId: currentUserId,
        };
      }
      lastSentTempId = null;
    }
    sending.value = false;
    onSent?.();
  }

  function handleError(data: { code: string; message: string }): void {
    error.value = data.message;
    sending.value = false;
    messages.value = messages.value.filter((m) => !m.id.startsWith('temp-'));
  }

  async function fetch(before?: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const params = new URLSearchParams();
      if (before) params.set('before', before);
      params.set('limit', '50');
      const url = `${config.public.backendUrl}/api/chat/messages/${userId}?${params}`;
      const data = await $fetch<DirectMessage[]>(url, {
        credentials: 'include',
      });
      messages.value = data.reverse();
      hasMore.value = data.length >= 50;
    } catch (err: any) {
      error.value = err?.message ?? 'Failed to load messages';
    } finally {
      loading.value = false;
    }
  }

  function send(text: string): void {
    if (!text.trim()) return;

    sending.value = true;
    error.value = null;
    connectSocket();

    const tempId = `temp-${++tempCounter}`;
    lastSentTempId = tempId;
    messages.value = [
      ...messages.value,
      {
        id: tempId,
        senderId: currentUserId,
        receiverId: userId,
        text: text.trim(),
        read: false,
        createdAt: new Date(),
      } as DirectMessage,
    ];

    emit('chat:send', { receiverId: userId, text: text.trim() });

    setTimeout(() => {
      const stillTemp = messages.value.find((m) => m.id === tempId);
      if (stillTemp) {
        messages.value = messages.value.filter((m) => m.id !== tempId);
        sending.value = false;
        error.value = 'Message send timed out';
      }
    }, 10000);
  }

  async function markAsRead(): Promise<void> {
    try {
      await $fetch(
        `${config.public.backendUrl}/api/chat/messages/${userId}/read`,
        { method: 'POST', credentials: 'include' },
      );
    } catch {
      // silent
    }
  }

  async function init(): Promise<void> {
    await Promise.all([fetch(), markAsRead()]);
  }

  init();

  onUnmounted(() => {
    disconnectSocket();
  });

  return {
    messages: readonly(messages),
    loading: readonly(loading),
    sending: readonly(sending),
    error: readonly(error),
    hasMore: readonly(hasMore),
    fetch,
    send,
    markAsRead,
  };
}
