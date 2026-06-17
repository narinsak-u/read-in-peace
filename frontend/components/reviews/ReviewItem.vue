<script setup lang="ts">
import { Button } from "~/components/ui/button";

interface Review {
  id: number;
  initials: string;
  name: string;
  time: string;
  rating: number;
  text: string;
  likes: number;
  replies: string[];
}

defineProps<{
  review: Review;
  isReplying: boolean;
}>();

const emit = defineEmits<{
  like: [];
  reply: [];
  "publish-reply": [text: string];
  "cancel-reply": [];
}>();

const replyText = ref("");
</script>

<template>
  <article class="py-7 first:pt-0">
    <div class="flex gap-4">
      <span
        class="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold"
      >
        {{ review.initials }}
      </span>
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <strong class="text-sm">{{ review.name }}</strong>
          <span class="font-mono text-[10px] text-muted-foreground">{{
            review.time
          }}</span>
          <span
            class="ml-auto text-sm text-primary"
            :aria-label="`${review.rating} out of 5 stars`"
          >
            {{ "★".repeat(review.rating)
            }}<span class="text-foreground/10">{{
              "★".repeat(5 - review.rating)
            }}</span>
          </span>
        </div>
        <p class="mt-3 max-w-3xl leading-7 text-foreground/80 text-sm">
          {{ review.text }}
        </p>
        <div class="mt-3 flex gap-2">
          <Button size="sm" variant="archivalGhost" @click="emit('like')">
            Like ({{ review.likes }})
          </Button>
          <Button size="sm" variant="archivalGhost" @click="emit('reply')">
            Reply ({{ review.replies.length }})
          </Button>
        </div>
        <div
          v-if="review.replies.length > 0"
          class="mt-4 space-y-3 border-l border-primary/20 pl-4"
        >
          <p
            v-for="(text, i) in review.replies"
            :key="i"
            class="text-sm leading-6 text-muted-foreground"
          >
            {{ text }}
          </p>
        </div>
        <div v-if="isReplying" class="mt-4">
          <textarea
            v-model="replyText"
            rows="2"
            placeholder="Write your reply..."
            class="w-full resize-none rounded-sm border border-border bg-card p-3 text-sm focus:ring-1 focus:ring-ring"
          />
          <div class="mt-2 flex justify-end gap-2">
            <Button
              size="sm"
              variant="archivalGhost"
              @click="emit('cancel-reply')"
              >Cancel</Button
            >
            <Button
              size="sm"
              variant="archival"
              :disabled="!replyText.trim()"
              @click="
                emit('publish-reply', replyText.trim());
                replyText = '';
              "
            >
              Post Reply
            </Button>
          </div>
        </div>
      </div>
    </div>
  </article>
</template>
