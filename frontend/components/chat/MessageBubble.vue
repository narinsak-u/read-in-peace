<script setup lang="ts">
import type { DirectMessage } from "~/types/chat";

const props = withDefaults(
  defineProps<{
    message: DirectMessage;
    isOwn?: boolean;
  }>(),
  { isOwn: false },
);

const isError = computed(() => props.message.senderId === "");

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
</script>

<template>
  <div :class="['flex', isOwn ? 'justify-end' : 'justify-start']">
    <div
      :class="[
        'max-w-[75%] rounded-2xl px-4 py-2 text-sm leading-relaxed',
        isOwn
          ? 'bg-primary text-primary-foreground rounded-br-md'
          : 'bg-muted text-foreground rounded-bl-md',
        isError ? 'opacity-60 border border-red-400' : '',
      ]"
    >
      <p>{{ message.text }}</p>
      <p
        :class="[
          'mt-0.5 text-[10px]',
          isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground',
        ]"
      >
        {{ formatTime(message.createdAt) }}
      </p>
    </div>
  </div>
</template>
