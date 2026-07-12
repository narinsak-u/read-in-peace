<script setup lang="ts">
import { X } from "lucide-vue-next";
import { useChatStore } from "~/stores/chat";
import { useConversations } from "~/composables/useConversations";
import { useChatMessages } from "~/composables/useChatMessages";
import ConversationList from "./ConversationList.vue";
import MessageThread from "./MessageThread.vue";

const chat = useChatStore();
const {
  conversations,
  unreadCount,
  loading: convsLoading,
  fetchConversations,
  fetchUnread,
} = useConversations();

watch(
  () => chat.showModal,
  (open) => {
    if (open) {
      fetchConversations();
      fetchUnread();
    }
  },
  { immediate: true },
);

const activeUser = computed(() => {
  if (!chat.activeUserId) return null;
  return (
    conversations.value.find((c) => c.userId === chat.activeUserId) ?? null
  );
});

const messagesApi = computed(() => {
  if (!chat.activeUserId) return null;
  return useChatMessages(chat.activeUserId);
});

function onSelect(userId: string) {
  chat.openConversation(userId);
}

function onClose() {
  chat.closeConversation();
}

function onSend(text: string) {
  messagesApi.value?.send(text);
}

function onLoadMore() {
  // Cursor pagination TBD
}
</script>

<template>
  <div>
    <!-- Expanded modal -->
    <div
      v-if="chat.showModal"
      class="fixed bottom-0 right-0 z-50 flex h-[500px] w-[360px] flex-col overflow-hidden rounded-t-xl border border-border bg-card shadow-2xl md:bottom-4 md:right-4 md:rounded-xl"
    >
      <div
        class="flex items-center justify-between border-b border-border px-4 py-3"
      >
        <h3 class="text-sm font-semibold">
          {{ chat.activeUserId ? activeUser?.name : "Messages" }}
        </h3>
        <button
          class="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
          @click="chat.close()"
        >
          <X class="size-4" />
        </button>
      </div>

      <div class="flex-1 overflow-hidden">
        <ConversationList
          v-if="!chat.activeUserId"
          :conversations="conversations"
          :loading="convsLoading"
          @select="onSelect"
        />
        <MessageThread
          v-else-if="messagesApi"
          :user-id="chat.activeUserId!"
          :user-name="activeUser?.name || chat.activeUserId!"
          :messages="messagesApi.messages.value"
          :loading="messagesApi.loading.value"
          :sending="messagesApi.sending.value"
          :has-more="messagesApi.hasMore.value"
          @send="onSend"
          @load-more="onLoadMore"
          @close="onClose"
        />
      </div>
    </div>
  </div>
</template>
