<script setup lang="ts">
import type { Post } from '~/stores/social';

defineProps<{ posts: Post[] }>();

function initials(name: string): string {
  return name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
</script>

<template>
  <div v-if="posts.length === 0">
    <p class="text-sm italic text-muted-foreground">No recent activity.</p>
  </div>
  <div v-else class="space-y-6">
    <article
      v-for="post in posts"
      :key="post.id"
      class="border-l border-foreground/5 pl-4"
    >
      <div class="mb-1 flex items-center gap-2">
        <span class="flex size-6 items-center justify-center rounded-full bg-muted text-[8px] font-bold">
          {{ initials(post.user.name) }}
        </span>
        <span class="text-[11px] font-bold uppercase">{{ post.user.name }}</span>
        <span class="font-mono text-[10px] text-muted-foreground">{{ timeAgo(post.createdAt) }}</span>
      </div>
      <p class="line-clamp-2 text-sm leading-snug text-foreground/80">{{ post.text }}</p>
      <p v-if="post.rating" class="mt-1 text-xs text-primary">
        {{ '★★★★★'.slice(0, post.rating) }}<span class="text-foreground/10">{{ '★★★★★'.slice(post.rating) }}</span>
      </p>
    </article>
  </div>
</template>
