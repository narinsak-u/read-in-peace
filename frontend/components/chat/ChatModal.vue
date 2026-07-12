<script setup lang="ts">
import { X, ArrowLeft } from "lucide-vue-next";
import { useChatStore } from "~/stores/chat";
import { useConversations } from "~/composables/useConversations";
import { useChatMessages } from "~/composables/useChatMessages";
import ConversationList from "./ConversationList.vue";
import MessageThread from "./MessageThread.vue";

const chat = useChatStore();
const {
  conversations,
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

watch(
  () => chat.activeUserId,
  (userId, prevId) => {
    if (!userId && prevId) {
      fetchConversations();
      fetchUnread();
    }
  },
);

const activeUser = computed(() => {
  if (!chat.activeUserId) return null;
  return (
    conversations.value.find((c) => c.userId === chat.activeUserId) ?? null
  );
});

const messagesApi = ref<ReturnType<typeof useChatMessages> | null>(null);

watch(
  () => chat.activeUserId,
  (userId) => {
    messagesApi.value = null;
    if (userId) {
      messagesApi.value = useChatMessages(userId, () => {
        fetchConversations();
        fetchUnread();
      });
    }
  },
  { immediate: true },
);

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
    <div
      v-if="chat.showModal"
      class="fixed inset-x-0 bottom-0 z-50 flex h-[70vh] flex-col overflow-hidden rounded-t-xl border border-border bg-card shadow-2xl md:inset-auto md:bottom-4 md:right-4 md:h-[500px] md:w-[360px] md:rounded-xl"
    >
      <div
        class="flex items-center justify-between border-b border-border px-4 py-3"
      >
        <div class="flex items-center gap-2">
          <button
            v-if="chat.activeUserId"
            class="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
            @click="onClose"
          >
            <ArrowLeft class="size-4" />
          </button>
          <h3 class="text-sm font-semibold uppercase">
            {{ chat.activeUserId ? activeUser?.name : "Messages" }}
          </h3>
        </div>
        <button
          class="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
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
          :messages="messagesApi.messages"
          :loading="messagesApi.loading"
          :sending="messagesApi.sending"
          :has-more="messagesApi.hasMore"
          @send="onSend"
          @load-more="onLoadMore"
        />
      </div>
    </div>
  </div>
</template>
