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
  borrow: [slug: string, bookId: string];
  return: [slug: string, bookId: string];
}>();

const cart = useCartStore();

function actions(book: Book): StockActions {
  return stockActions(book, props.borrowedSlugs);
}

function buy(book: Book) {
  cart.addItem({ id: book.id, title: book.title, author: book.author, price: Number(book.price), cover: book.cover, crop: book.crop, stock: book.inStock });
  props.flash(`${book.title} added to your cart.`);
}
</script>

<template>
  <BookListSection :books="books" subtitle="Most popular this month">
    <template #badge="{ book }">
      <span class="rounded-sm bg-primary px-2 py-0.5 font-mono text-[10px] text-primary-foreground">
        <Star class="mr-0.5 inline size-3 fill-current" /> {{ book.avgRating.toFixed(2) }}
      </span>
      <span class="font-mono text-[10px] uppercase text-muted-foreground">Category: {{ book.category }}</span>
    </template>

    <template #extra="{ book }">
      <p class="max-w-2xl text-sm leading-6 text-foreground/70">{{ book.synopsis }}</p>
    </template>

    <template #actions="{ book }">
      <template v-if="actions(book).isBorrowed">
        <Button variant="archival" @click="$emit('return', book.slug, book.id)">Return Book</Button>
      </template>
      <template v-else-if="actions(book).canBorrow">
        <Button variant="archival" @click="$emit('borrow', book.slug, book.id)">Borrow</Button>
      </template>
      <template v-else>
        <Button variant="archivalOutline" disabled>Unavailable</Button>
      </template>
      <Button v-if="actions(book).canBuy" variant="archivalGhost" @click="buy(book)"><ShoppingBag /> Buy ${{ book.price }}</Button>
    </template>

    <template #compactBadge="{ book }">
      <span class="font-mono text-[10px] text-primary">
        <Star class="mr-0.5 inline size-3 fill-current" /> {{ book.avgRating.toFixed(2) }}
      </span>
    </template>

    <template #compactActions="{ book }">
      <div class="flex items-center gap-1">
        <template v-if="actions(book).isBorrowed">
          <Button size="sm" variant="archivalGhost" @click="$emit('return', book.slug, book.id)">Return</Button>
        </template>
        <template v-else-if="actions(book).canBorrow">
          <Button size="sm" variant="archivalGhost" @click="$emit('borrow', book.slug, book.id)">Borrow</Button>
        </template>
        <template v-else>
          <Button size="sm" variant="archivalGhost" disabled>Unavailable</Button>
        </template>
      </div>
    </template>
  </BookListSection>
</template>
