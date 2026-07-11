import { ref, readonly } from 'vue';
import { useChatSocket } from './useChatSocket';
import type { Conversation } from '~/types/chat';

const conversations = ref<Conversation[]>([]);
const unreadCount = ref(0);
const loading = ref(false);
const error = ref<string | null>(null);
let initialized = false;

export function useConversations() {
  const { connect, emit } = useChatSocket();

  function init(): void {
    if (initialized) return;
    initialized = true;

    const socket = connect();

    socket.on('chat:conversations', (data: { conversations: Conversation[]; unreadCount: number }) => {
      conversations.value = data.conversations;
      unreadCount.value = data.unreadCount;
      loading.value = false;
    });

    socket.on('chat:unread', (data: { count: number }) => {
      unreadCount.value = data.count;
    });

    socket.on('chat:message', () => {
      fetch();
      emit('chat:unread');
    });

    if (socket.connected) {
      fetch();
    } else {
      socket.on('connect', () => {
        fetch();
        emit('chat:unread');
      });
    }
  }

  function fetch(): void {
    loading.value = true;
    emit('chat:conversations');
  }

  init();

  return {
    conversations: readonly(conversations),
    unreadCount: readonly(unreadCount),
    loading: readonly(loading),
    error: readonly(error),
  };
}
