<script setup lang="ts">
import { computed } from 'vue';
import { useCartStore } from '~/stores/cart';
import type { BookWithMeta } from '~/stores/books';

const props = defineProps<{
  book: BookWithMeta;
  hasBorrowed: boolean;
}>();

const emit = defineEmits<{
  borrow: [];
}>();

const cartStore = useCartStore();

const borrowBtnClass = computed(() => {
  const canBorrow = props.book.isAvailable && props.book.inStock >= 1 && !props.hasBorrowed;
  return canBorrow
    ? 'cursor-pointer border-primary/30 text-primary hover:bg-primary-soft hover:border-primary'
    : 'cursor-not-allowed border-dashed border-muted-foreground/30 text-muted-foreground/50';
});

const borrowLabel = computed(() => {
  return props.book.isAvailable && props.book.inStock >= 1 && !props.hasBorrowed
    ? 'Borrow'
    : 'Unavailable';
});

const buyFullWidth = computed(() => props.book.inStock <= 1);

function handleBuy() {
  cartStore.addItem({
    bookId: props.book.id,
    title: props.book.title,
    author: props.book.author,
    cover: props.book.cover,
    price: Number(props.book.price),
    category: props.book.category,
    crop: props.book.crop,
  });
}
</script>

<template>
  <div class="mt-8 flex flex-col gap-3 sm:flex-row">
    <button
      v-if="book.inStock > 1"
      @click="handleBuy"
      class="flex-1 rounded-lg bg-primary cursor-pointer px-6 py-3.5 font-medium text-primary-foreground transition-all duration-200 hover:translate-y-[-1px] hover:shadow-md"
    >
      Buy Now — ${{ Number(book.price).toFixed(2) }}
    </button>
    <button
      @click="emit('borrow')"
      :disabled="!book.isAvailable || book.inStock < 1 || hasBorrowed"
      class="flex-1 rounded-lg border px-6 py-3.5 font-medium transition-colors"
      :class="[buyFullWidth ? 'w-full' : '', borrowBtnClass]"
    >
      {{ borrowLabel }}
    </button>
  </div>
</template>
