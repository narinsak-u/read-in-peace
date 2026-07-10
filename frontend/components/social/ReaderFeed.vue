<script setup lang="ts">
import { Button } from "~/components/ui/button";
import { ArrowRight } from "lucide-vue-next";
import { useFeed } from "~/composables/useFeed";
import { useBookComments } from "~/composables/useBookComments";

defineProps<{
  flash: (message: string) => void;
}>();

const { posts, bookSlug, bookId, loading } = useFeed();

const { toggleLike, addReply } = useBookComments(() => bookId.value);
const replySubmittingId = shallowRef<string | null>(null);

const FEED_POST_LIMIT = 3;
const visiblePosts = computed(() => posts.value.slice(0, FEED_POST_LIMIT));

function getInitials(name: string): string {
  return name.toUpperCase().slice(0, 2);
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

async function onReply(postId: string, text: string): Promise<boolean> {
  replySubmittingId.value = postId;
  try {
    await addReply(postId, text);
    return true;
  } catch {
    return false;
  } finally {
    replySubmittingId.value = null;
  }
}

function onToggleLike(postId: string): () => Promise<void> {
  return () => toggleLike(postId);
}
</script>

<template>
  <section id="feed" class="animate-enter scroll-mt-24 [animation-delay:300ms]">
    <div
      class="mb-4 flex items-baseline justify-between border-b border-border pb-2"
    >
      <h2 class="font-serif text-xl">Reader Feed</h2>
      <span class="size-2 rounded-full bg-primary" />
    </div>
    <div v-if="loading" class="space-y-6">
      <div class="border-l border-foreground/5 pl-4 animate-pulse">
        <div class="mb-1 flex items-center gap-2">
          <span class="size-6 rounded-full bg-muted" />
          <span class="h-3 w-16 rounded bg-muted" />
          <span class="h-3 w-10 rounded bg-muted" />
        </div>
        <div class="h-3 w-full rounded bg-muted" />
      </div>
    </div>
    <div v-else-if="posts.length === 0" class="space-y-6">
      <p class="font-serif text-sm italic text-muted-foreground">
        No feed posts yet. Be the first to share what you're reading!
      </p>
    </div>
    <div v-else class="space-y-6">
      <FeedPost
        v-for="post in visiblePosts"
        :key="post.id"
        :initials="getInitials(post.user.name)"
        :name="post.user.name"
        :user-id="post.user.id"
        :time="timeAgo(post.createdAt)"
        :like-count="post.likeCount"
        :liked="post.liked"
        :replies="post.replies"
        :submitting="replySubmittingId === post.id"
        :submit-reply="(text: string) => onReply(post.id, text)"
        :toggle-like="onToggleLike(post.id)"
      >
        <span v-if="post.rating" class="text-primary">
          {{ "★".repeat(post.rating) }}
        </span>
        {{ post.text }}
      </FeedPost>
      <NuxtLink
        v-if="bookSlug"
        :to="`/book/${bookSlug}`"
        class="group inline-block"
      >
        <Button variant="archivalGhost" size="sm">
          View discussions
          <ArrowRight
            class="h-4 w-4 transition-transform group-hover:translate-x-1"
          />
        </Button>
      </NuxtLink>
    </div>
  </section>
</template>
