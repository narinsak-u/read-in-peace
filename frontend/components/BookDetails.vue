<script setup lang="ts">
import { computed } from 'vue';
import { Star } from 'lucide-vue-next';
import type { BookWithMeta } from '~/stores/books';

const props = defineProps<{
  book: BookWithMeta;
}>();

const formattedPrice = computed(() => Number(props.book.price).toFixed(2));
const formattedAvgRating = computed(() => Number(props.book.avgRating).toFixed(1));

const stockBadgeClass = computed(() => 
  props.book.inStock >= 1 ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-500'
);

const stockLabel = computed(() => 
  props.book.inStock >= 1 ? `In stock: ${props.book.inStock}` : 'Out of stock'
);
</script>

<template>
  <p class="mb-2 text-sm uppercase tracking-widest text-muted-foreground">
    {{ book.author }}
  </p>
  <h1 class="text-4xl font-semibold tracking-tight sm:text-5xl">
    {{ book.title }}
  </h1>

  <div class="mt-5 flex items-center gap-4">
    <span class="rounded-full bg-primary-soft px-4 py-1.5 text-sm font-semibold text-primary">
      ${{ formattedPrice }}
    </span>
    <div class="flex items-center gap-1 text-sm text-muted-foreground">
      <Star class="h-4 w-4 fill-foreground text-foreground" />
      {{ formattedAvgRating }}
    </div>
    <span
      class="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
      :class="stockBadgeClass"
    >
      {{ stockLabel }}
    </span>
  </div>

  <p class="mt-6 text-base leading-relaxed text-muted-foreground">
    {{ book.synopsis }}
  </p>
</template>
