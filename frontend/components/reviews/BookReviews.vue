<script setup lang="ts">
import { Button } from '~/components/ui/button';
import { useAuthStore } from '~/stores/auth';
import { useBookComments } from '~/composables/useBookComments';

const { flash, bookId } = defineProps<{
  flash: (message: string) => void;
  bookId: string;
}>();

const auth = useAuthStore();

const {
  reviews,
  addComment,
  addReply,
  toggleLike,
} = useBookComments(() => bookId);

const rating = shallowRef(0);
const reviewText = shallowRef('');
const replyingTo = shallowRef<string | null>(null);
const submitting = shallowRef(false);
const replyingSubmitId = shallowRef<string | null>(null);

async function publishReview() {
  if (!rating.value || !reviewText.value.trim()) return;
  if (!auth.signedIn) {
    auth.openAuthModal(() => { void publishReview(); });
    return;
  }
  submitting.value = true;
  try {
    await addComment(reviewText.value.trim(), rating.value);
    rating.value = 0;
    reviewText.value = '';
    flash('Your review is now part of the discussion.');
  } catch (e: any) {
    if (e?.status === 401) {
      auth.openAuthModal(() => { void publishReview(); });
    } else if (e?.data?.message) {
      flash(e.data.message);
    } else {
      flash('Could not publish your review. Please try again.');
    }
  } finally {
    submitting.value = false;
  }
}

async function publishReply(reviewId: string, text: string) {
  if (!text.trim()) return;
  if (!auth.signedIn) {
    auth.openAuthModal(() => { void publishReply(reviewId, text); });
    return;
  }
  replyingSubmitId.value = reviewId;
  try {
    await addReply(reviewId, text);
    replyingTo.value = null;
  } catch (e: any) {
    if (e?.status === 401) {
      auth.openAuthModal(() => { void publishReply(reviewId, text); });
    } else if (e?.data?.message) {
      flash(e.data.message);
    } else {
      flash('Could not post your reply. Please try again.');
    }
  } finally {
    replyingSubmitId.value = null;
  }
}

async function onToggleLike(commentId: string, reviewIndex: number) {
  if (!auth.signedIn) {
    auth.openAuthModal(() => { void onToggleLike(commentId, reviewIndex); });
    return;
  }
  try {
    await toggleLike(commentId);
  } catch {
    flash('Could not update like.');
  }
}
</script>

<template>
  <section id="discussion" class="scroll-mt-24 py-14">
    <div class="grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div>
        <div class="mb-8 flex items-end justify-between border-b border-border pb-3">
          <div>
            <p class="font-mono text-[10px] uppercase tracking-widest text-primary">Reader room</p>
            <h2 class="mt-1 font-serif text-3xl">Reviews &amp; discussion</h2>
          </div>
          <span class="text-sm text-muted-foreground">{{ reviews.length }} conversations</span>
        </div>
        <div class="divide-y divide-border">
          <ReviewItem
            v-for="(item, idx) in reviews"
            :key="item.id"
            :review="item"
            :is-replying="replyingTo === item.id"
            :reply-submitting="replyingSubmitId === item.id"
            @like="onToggleLike(item.id, idx)"
            @reply="replyingTo = replyingTo === item.id ? null : item.id"
            @publish-reply="(text: string) => publishReply(item.id, text)"
            @cancel-reply="replyingTo = null"
          />
        </div>
      </div>

      <ReviewForm
        :rating="rating"
        :review-text="reviewText"
        :flash="flash"
        :submitting="submitting"
        @update:rating="rating = $event"
        @update:review-text="reviewText = $event"
        @publish="publishReview"
      />
    </div>
  </section>
</template>
