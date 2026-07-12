<script setup lang="ts">
import type { Conversation } from "~/types/chat";
import { timeAgo } from "~/utils/comment";

defineProps<{
  conversations: readonly Conversation[];
  loading: boolean;
}>();

const emit = defineEmits<{
  select: [userId: string];
}>();
</script>

<template>
  <div class="flex flex-col">
    <div v-if="loading" class="flex items-center justify-center py-12 text-sm text-muted-foreground">
      Loading...
    </div>
    <div v-else-if="conversations.length === 0" class="flex flex-col items-center justify-center py-12 px-4 text-sm text-muted-foreground">
      <p>No conversations yet.</p>
      <p class="mt-1 text-xs">Start one from a profile page.</p>
    </div>
    <div v-else class="divide-y divide-border">
      <button
        v-for="conv in conversations"
        :key="conv.userId"
        class="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50"
        @click="emit('select', conv.userId)"
      >
        <div
          class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
        >
          {{ conv.name.slice(0, 2).toUpperCase() }}
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">{{ conv.name }}</span>
            <span class="text-[10px] text-muted-foreground">
              {{ timeAgo(conv.lastMessageAt) }}
            </span>
          </div>
          <p class="truncate text-xs text-muted-foreground">
            {{ conv.lastMessage }}
          </p>
        </div>
        <div
          v-if="conv.unreadCount > 0"
          class="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground"
        >
          {{ conv.unreadCount }}
        </div>
      </button>
    </div>
  </div>
</template>
