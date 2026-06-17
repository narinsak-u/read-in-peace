<script setup lang="ts">
import { Button } from '~/components/ui/button';

defineProps<{
  rating: number;
  reviewText: string;
  flash: (message: string) => void;
}>();

const emit = defineEmits<{
  'update:rating': [value: number];
  'update:reviewText': [value: string];
  publish: [];
}>();
</script>

<template>
  <aside class="lg:sticky lg:top-28 lg:self-start">
    <div class="border border-border bg-card p-6">
      <p class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Add your voice</p>
      <h3 class="mt-2 font-serif text-lg">What did you think of this volume?</h3>
      <div class="mb-4 mt-4" :aria-label="`Your rating: ${rating} out of 5`">
        <StarRating :value="rating" @change="emit('update:rating', $event)" />
      </div>
      <textarea
        :value="reviewText"
        rows="4"
        placeholder="Write from the margins..."
        class="w-full resize-none rounded-sm border border-border bg-card p-3 text-sm focus:ring-1 focus:ring-ring"
        @input="emit('update:reviewText', ($event.target as HTMLTextAreaElement).value)"
      />
      <Button class="mt-4 w-full" variant="archival" :disabled="!rating || !reviewText.trim()" @click="emit('publish')">
        Publish review
      </Button>
    </div>
  </aside>
</template>
