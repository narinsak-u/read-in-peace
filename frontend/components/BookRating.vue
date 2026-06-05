<script setup lang="ts">
import { Star } from 'lucide-vue-next';

defineProps<{
  avgRating: number;
  userRating: number | null;
}>();

const emit = defineEmits<{
  rate: [rating: number];
}>();

function isStarActive(star: number, userRating: number | null): boolean {
  return (userRating ?? 0) >= star;
}
</script>

<template>
  <div class="mt-6 flex items-center gap-1">
    <span class="text-sm text-muted-foreground mr-2">Your rating:</span>
    <button
      v-for="star in 5"
      :key="star"
      @click="emit('rate', star)"
      class="cursor-pointer transition-colors hover:text-amber-400"
      :class="isStarActive(star, userRating) ? 'text-amber-400' : 'text-muted-foreground/30'"
    >
      <Star
        class="h-5 w-5"
        :class="isStarActive(star, userRating) ? 'fill-current' : ''"
      />
    </button>
    <span class="ml-2 text-sm text-muted-foreground">
      {{ Number(avgRating).toFixed(1) }} avg
    </span>
  </div>
</template>
