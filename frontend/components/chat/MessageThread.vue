<script setup lang="ts">
import type { DirectMessage } from "~/types/chat";
import MessageBubble from "./MessageBubble.vue";
import MessageComposer from "./MessageComposer.vue";
import { useAuthStore } from "~/stores/auth";

const props = withDefaults(
  defineProps<{
    userId: string;
    userName: string;
    messages: readonly DirectMessage[];
    loading?: boolean;
    sending?: boolean;
    hasMore?: boolean;
  }>(),
  { loading: false, sending: false, hasMore: false },
);

const emit = defineEmits<{
  send: [text: string];
  loadMore: [];
}>();

const scrollRef = ref<HTMLElement | null>(null);
const currentUserId = useAuthStore().user?.id ?? "";

function scrollToBottom() {
  nextTick(() => {
    if (scrollRef.value) {
      scrollRef.value.scrollTop = scrollRef.value.scrollHeight;
    }
  });
}

watch(
  () => props.messages.length,
  () => scrollToBottom(),
);
</script>

<template>
  <div class="flex h-full flex-col">
    <div ref="scrollRef" class="scrollbar-thin flex-1 space-y-2 overflow-y-auto p-4">
      <button
        v-if="hasMore && !loading"
        class="w-full py-2 text-xs text-muted-foreground hover:text-foreground"
        @click="emit('loadMore')"
      >
        Load earlier messages
      </button>
      <div
        v-if="loading && messages.length === 0"
        class="flex items-center justify-center py-12 text-sm text-muted-foreground"
      >
        Loading...
      </div>
      <div
        v-else-if="messages.length === 0"
        class="flex items-center justify-center py-12 text-sm text-muted-foreground"
      >
        Send a message to start the conversation.
      </div>
      <MessageBubble
        v-for="msg in messages"
        :key="msg.id"
        :message="msg"
        :is-own="msg.senderId === currentUserId"
      />
    </div>

    <MessageComposer :disabled="sending" @send="emit('send', $event)" />
  </div>
</template>
