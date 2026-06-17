<script setup lang="ts">
import { Star, ShoppingBag } from 'lucide-vue-next';
import { Button } from '~/components/ui/button';
import { useCartStore } from '~/stores/cart';
import { stockActions, type StockActions } from '~/utils/stock';
import type { Book } from '~/types/book';

const props = defineProps<{
  books: Book[];
  borrowedSlugs: Set<string>;
  flash: (message: string) => void;
}>();

const emit = defineEmits<{
  borrow: [slug: string];
}>();

const cart = useCartStore();

function buyBook(book: Book) {
  cart.addItem({
    id: book.id,
    title: book.title,
    author: book.author,
    price: Number(book.price),
    cover: book.cover,
    crop: book.crop,
  });
  props.flash(`${book.title} added to your cart.`);
}

function actions(book: Book): StockActions {
  return stockActions(book, props.borrowedSlugs);
}
</script>

<template>
  <template v-if="books.length > 0">
    <article class="group flex flex-col gap-8 rounded-sm border border-border bg-card p-5 md:flex-row md:p-6">
      <div class="shrink-0 self-center shadow-xl transition-transform duration-500 group-hover:-translate-y-1 md:self-auto">
        <CoverImage :crop="books[0].crop" :src="books[0].cover" :alt="`${books[0].title} book cover`" class="h-[270px] w-[180px]" />
      </div>
      <div class="flex flex-1 flex-col justify-between py-2">
        <div>
          <div class="mb-2 flex flex-wrap items-center gap-2">
            <span class="rounded-sm bg-primary px-2 py-0.5 font-mono text-[10px] text-primary-foreground">
              <Star class="mr-0.5 inline size-3 fill-current" /> {{ books[0].avgRating.toFixed(2) }}
            </span>
            <span class="font-mono text-[10px] uppercase text-muted-foreground">Shelf: {{ books[0].shelf }}</span>
          </div>
          <h2 class="mb-1 font-serif text-3xl font-bold">
            <NuxtLink :to="`/book/${books[0].slug}`" class="transition-colors hover:text-primary">{{ books[0].title }}</NuxtLink>
          </h2>
          <p class="mb-4 italic text-muted-foreground">by {{ books[0].author }}</p>
          <p class="max-w-2xl text-sm leading-6 text-foreground/70">{{ books[0].synopsis }}</p>
        </div>
        <div class="mt-6 flex flex-wrap gap-3">
          <template v-if="actions(books[0]).isBorrowed">
            <Button variant="archival" @click="$emit('borrow', books[0].slug)">Return Book</Button>
          </template>
          <template v-else-if="actions(books[0]).canBorrow">
            <Button variant="archival" @click="$emit('borrow', books[0].slug)">Borrow</Button>
          </template>
          <template v-else>
            <Button variant="archivalOutline" disabled>Unavailable</Button>
          </template>
          <Button v-if="actions(books[0]).canBuy" variant="archivalGhost" @click="buyBook(books[0])">
            <ShoppingBag /> Buy ${{ books[0].price }}
          </Button>
        </div>
      </div>
    </article>

    <div v-if="books.length > 1" class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
      <template v-for="book in books.slice(1)" :key="book.id">
        <article class="group flex gap-4 rounded-sm border border-border bg-card p-4 transition-colors hover:border-primary/30">
          <CoverImage :crop="book.crop" :src="book.cover" class="h-24 w-16 shrink-0 shadow-sm" />
          <div class="flex min-w-0 flex-1 flex-col justify-center">
            <h3 class="font-serif text-sm font-bold leading-tight">{{ book.title }}</h3>
            <p class="mb-2 text-xs italic text-muted-foreground">{{ book.author }}</p>
            <div class="flex items-center justify-between gap-2">
              <span class="font-mono text-[10px] text-primary">
                <Star class="mr-0.5 inline size-3 fill-current" /> {{ book.avgRating.toFixed(2) }}
              </span>
              <template v-if="actions(book).isBorrowed">
                <Button size="sm" variant="archivalGhost" @click="$emit('borrow', book.slug)">Return</Button>
              </template>
              <template v-else-if="actions(book).canBorrow">
                <Button size="sm" variant="archivalGhost" @click="$emit('borrow', book.slug)">Borrow</Button>
              </template>
              <template v-else>
                <Button size="sm" variant="archivalGhost" disabled>Unavailable</Button>
              </template>
            </div>
          </div>
        </article>
      </template>
    </div>
  </template>
</template>
