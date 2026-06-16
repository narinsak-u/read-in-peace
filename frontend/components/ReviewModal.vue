<script setup lang="ts">
import { Star } from 'lucide-vue-next';
import { Button } from '~/components/ui/button';

const open = defineModel<boolean>('open', { default: false });
const rating = defineModel<number>('rating', { default: 0 });
const reviewText = defineModel<string>('reviewText', { default: '' });

defineProps<{
  flashcards: (message: string) => void;
}>();
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-title"
      @mousedown="open = false"
    >
      <div class="w-full max-w-lg border border-border bg-background p-6 shadow-2xl" @mousedown.stop>
        <div class="mb-6 flex gap-4">
          <img
            src="/images/architecture-memory.png"
            alt=""
            width="768"
            height="1152"
            class="h-24 w-16 object-cover shadow"
          />
          <div>
            <p class="font-mono text-[10px] uppercase text-primary">Reader review</p>
            <h2 id="review-title" class="font-serif text-2xl font-bold">The Architecture of Memory</h2>
            <p class="text-sm text-muted-foreground">What stayed with you?</p>
          </div>
        </div>
        <div class="mb-4 flex gap-1" :aria-label="`Your rating: ${rating} out of 5`">
          <button v-for="value in 5" :key="value" type="button" :aria-label="`Rate ${value} stars`" @click="rating = value">
            <Star :class="`size-7 ${value <= rating ? 'fill-current text-primary' : 'text-border'}`" />
          </button>
        </div>
        <label class="text-sm font-medium" for="review">Your review</label>
        <textarea
          id="review"
          v-model="reviewText"
          rows="5"
          placeholder="Write from the margins..."
          class="mt-2 w-full resize-none rounded-sm border border-border bg-card p-3 text-sm focus:ring-1 focus:ring-ring"
        />
        <div class="mt-5 flex justify-end gap-2">
          <Button variant="archivalGhost" @click="open = false">Cancel</Button>
          <Button
            variant="archival"
            :disabled="!rating || !reviewText.trim()"
            @click="
              () => {
                open = false;
                reviewText = '';
                flashcards('Your review was published to the reader feed.');
              }
            "
          >Publish Review</Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
