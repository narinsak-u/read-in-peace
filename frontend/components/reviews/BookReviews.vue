<script setup lang="ts">
import { Button } from '~/components/ui/button';

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

const { flash } = defineProps<{
  flash: (message: string) => void;
}>();

const reviews = ref<Review[]>([
  {
    id: 1,
    initials: 'AM',
    name: 'Aris M.',
    time: '14m ago',
    rating: 5,
    text: 'The chapter on brutalist memorials is devastating. I kept returning to its idea that a building can remember on our behalf.',
    likes: 12,
    replies: ['That was the passage that stayed with me too. \u2014 Mina K.'],
  },
  {
    id: 2,
    initials: 'LW',
    name: 'Leo Wang',
    time: '2h ago',
    rating: 4,
    text: 'Measured, elegant, and full of unexpected connections. The middle essays wander, but the final one brings everything home.',
    likes: 8,
    replies: [],
  },
]);

const rating = ref(0);
const reviewText = ref('');
const replyingTo = ref<number | null>(null);

function publishReview() {
  if (!rating.value || !reviewText.value.trim()) return;
  reviews.value.unshift({
    id: Date.now(),
    initials: 'JS',
    name: 'Jamie S.',
    time: 'Just now',
    rating: rating.value,
    text: reviewText.value.trim(),
    likes: 0,
    replies: [],
  });
  rating.value = 0;
  reviewText.value = '';
  flash('Your review is now part of the discussion.');
}

function publishReply(reviewId: number, text: string) {
  reviews.value = reviews.value.map((r) =>
    r.id === reviewId ? { ...r, replies: [...r.replies, `${text} \u2014 Jamie S.`] } : r,
  );
  replyingTo.value = null;
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
            v-for="item in reviews"
            :key="item.id"
            :review="item"
            :is-replying="replyingTo === item.id"
            @like="item.likes++"
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
        @update:rating="rating = $event"
        @update:review-text="reviewText = $event"
        @publish="publishReview"
      />
    </div>
  </section>
</template>
