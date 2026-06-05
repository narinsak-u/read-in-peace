<script setup lang="ts">
import { Star } from 'lucide-vue-next';
import type { BookWithMeta } from '~/stores/books';

defineProps<{
  book: BookWithMeta;
}>();
</script>

<template>
  <div class="grid grid-cols-1 gap-12 md:grid-cols-2 md:items-start">
    <div class="flex justify-center md:sticky md:top-24">
      <div class="w-full max-w-md">
        <div class="w-full overflow-hidden rounded-lg shadow-lg shadow-black/20">
          <img
            :src="book.cover"
            :alt="book.title"
            class="h-full w-full object-cover"
          />
        </div>
      </div>
    </div>

    <div class="flex flex-col">
      <p class="mb-2 text-sm uppercase tracking-widest text-muted-foreground">
        {{ book.author }}
      </p>
      <h1 class="text-4xl font-semibold tracking-tight sm:text-5xl">
        {{ book.title }}
      </h1>

      <div class="mt-5 flex items-center gap-4">
        <span class="rounded-full bg-primary-soft px-4 py-1.5 text-sm font-semibold text-primary">
          ${{ Number(book.price).toFixed(2) }}
        </span>
        <div class="flex items-center gap-1 text-sm text-muted-foreground">
          <Star class="h-4 w-4 fill-foreground text-foreground" />
          {{ Number(book.avgRating).toFixed(1) }}
        </div>
        <span
          class="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
          :class="book.inStock >= 1 ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-500'"
        >
          {{ book.inStock >= 1 ? `In stock: ${book.inStock}` : 'Out of stock' }}
        </span>
      </div>

      <p class="mt-6 text-base leading-relaxed text-muted-foreground">
        {{ book.synopsis }}
      </p>
    </div>
  </div>
</template>
