<script setup lang="ts">
import { Heart, MessageCircle } from 'lucide-vue-next';
import { Button } from '~/components/ui/button';
import type { Book } from '~/types/book';

defineProps<{
  book: Book;
  flash: (message: string) => void;
}>();

const saved = ref(false);

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}
</script>

<template>
  <div class="flex flex-col justify-center">
    <div
      class="mb-5 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
    >
      <span>{{ book.year }}</span><span>&bull;</span><span>{{ book.totalPages }} pages</span><span>&bull;</span>
      <span>Shelf {{ book.shelf }}</span>
    </div>
    <h1
      class="max-w-2xl font-serif text-4xl font-bold leading-tight md:text-6xl"
    >
      {{ book.title }}
    </h1>
    <p class="mt-3 font-serif text-xl italic text-muted-foreground">
      by {{ book.author }}
    </p>
    <div class="mt-7 flex items-center gap-3">
      <span class="text-lg text-primary">
        {{ '★'.repeat(Math.round(book.avgRating)) }}<span class="text-foreground/10">{{ '★'.repeat(5 - Math.round(book.avgRating)) }}</span>
      </span>
      <strong>{{ book.avgRating.toFixed(2) }}</strong>
      <span class="text-sm text-muted-foreground"
        >from {{ book.ratingsCount }} reader ratings</span
      >
    </div>
    <p class="mt-8 max-w-2xl text-base leading-7 text-foreground/75">
      {{ book.synopsis }}
    </p>
    <div class="mt-8 flex flex-wrap gap-3">
      <Button variant="archivalGhost" @click="saved = !saved">
        <Heart :class="saved ? 'fill-current text-primary' : ''" />
        {{ saved ? 'Saved to list' : 'Save to list' }}
      </Button>
      <Button variant="archivalGhost" @click="scrollTo('discussion')">
        <MessageCircle /> Read discussion
      </Button>
    </div>
  </div>
</template>
