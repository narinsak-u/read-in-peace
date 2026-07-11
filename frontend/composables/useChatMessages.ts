import { ref, readonly, onUnmounted } from 'vue';
import { useChatSocket } from './useChatSocket';
import type { DirectMessage } from '~/types/chat';

export function useChatMessages(userId: string) {
  const messages = ref<DirectMessage[]>([]);
  const loading = ref(false);
  const sending = ref(false);
  const error = ref<string | null>(null);
  const hasMore = ref(true);
  const { connect, emit } = useChatSocket();

  let tempCounter = 0;

  function fetch(before?: string): void {
    loading.value = true;
    error.value = null;
    connect();
    emit('chat:history', { userId, before, limit: 50 });
  }

  function send(text: string): void {
    if (!text.trim()) return;

    sending.value = true;
    error.value = null;

    const tempId = `temp-${++tempCounter}`;

    messages.value = [
      ...messages.value,
      {
        id: tempId,
        senderId: '',
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

  function markAsRead(): void {
    emit('chat:read', { userId });
  }

  const handleHistory = (data: { messages: DirectMessage[]; userId: string }) => {
    if (data.userId === userId) {
      messages.value = data.messages.reverse();
      loading.value = false;
      hasMore.value = data.messages.length >= 50;
    }
  };

  const handleSent = (data: { id: string; createdAt: string }) => {
    const tempIdx = messages.value.findIndex((m) => m.id.startsWith('temp-'));
    if (tempIdx !== -1) {
      messages.value[tempIdx] = {
        ...messages.value[tempIdx],
        id: data.id,
        createdAt: new Date(data.createdAt),
        senderId: 'me',
      };
    }
    sending.value = false;
  };

  const handleMessage = (data: DirectMessage) => {
    if (data.senderId === userId) {
      messages.value = [...messages.value, data];
    }
  };

  const handleError = (data: { code: string; message: string }) => {
    error.value = data.message;
    sending.value = false;
    messages.value = messages.value.filter((m) => !m.id.startsWith('temp-'));
  };

  const socket = connect();
  socket.on('chat:history', handleHistory);
  socket.on('chat:sent', handleSent);
  socket.on('chat:message', handleMessage);
  socket.on('chat:error', handleError);

  onUnmounted(() => {
    socket.off('chat:history', handleHistory);
    socket.off('chat:sent', handleSent);
    socket.off('chat:message', handleMessage);
    socket.off('chat:error', handleError);
  });

  fetch();
  markAsRead();

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
