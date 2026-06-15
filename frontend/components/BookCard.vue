<script setup lang="ts">
import { computed } from 'vue';
import { Pencil, Trash2, RotateCcw, BookOpen } from 'lucide-vue-next';
import type { BookWithMeta } from '~/stores/books';
import { useDashboardStore } from '~/stores/dashboard';
import { useBooksStore } from '~/stores/books';
import { useAuthStore } from '~/stores/auth';
import { useCartStore } from '~/stores/cart';

const props = withDefaults(
  defineProps<{
    book: BookWithMeta;
    variant?: 'default' | 'borrowed' | 'purchased';
  }>(),
  { variant: 'default' },
);

const emit = defineEmits<{
  edit: [book: BookWithMeta];
}>();

const dashboard = useDashboardStore();
const booksStore = useBooksStore();
const auth = useAuthStore();
const cartStore = useCartStore();

const formattedPrice = computed(() => Number(props.book.price).toFixed(2));

const borrowBtnClass = computed(() => {
  return props.book.isAvailable && props.book.inStock >= 1
    ? "cursor-pointer border-primary/30 text-primary hover:bg-primary-soft hover:border-primary"
    : "cursor-not-allowed border-dashed border-muted-foreground/30 text-muted-foreground/50";
});

const borrowLabel = computed(() => {
  return props.book.isAvailable && props.book.inStock >= 1 ? "Borrow" : "Unavailable";
});

const stockClass = computed(() => {
  return props.book.inStock >= 1 ? "bg-primary-soft text-primary" : "bg-red-500/10 text-red-500";
});

const stockLabel = computed(() => {
  return props.book.inStock >= 1 ? `In stock: ${props.book.inStock}` : "Out of stock";
});

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

async function handleDelete() {
  if (confirm("Delete this book?")) {
    await booksStore.deleteBook(props.book.id);
  }
}
</script>

<template>
  <div
    class="group relative flex flex-col overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm transition-all duration-200 hover:shadow-md"
  >
    <div
      v-if="auth.adminMode"
      class="absolute right-3 top-3 z-10 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100"
    >
      <button
        @click="emit('edit', book)"
        class="flex h-8 w-8 items-center cursor-pointer justify-center rounded-lg bg-background/90 backdrop-blur ring-1 ring-border hover:bg-background"
      >
        <Pencil class="h-3.5 w-3.5" />
      </button>
      <button
        @click="handleDelete"
        class="flex h-8 w-8 items-center cursor-pointer justify-center rounded-lg bg-background/90 text-destructive backdrop-blur ring-1 ring-border hover:bg-background"
      >
        <Trash2 class="h-3.5 w-3.5" />
      </button>
    </div>

    <NuxtLink :to="`/book/${book.id}`" class="block overflow-hidden bg-muted">
      <div class="aspect-2/3 w-full overflow-hidden">
        <img
          :src="book.cover"
          :alt="book.title"
          loading="lazy"
          class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
    </NuxtLink>

    <div class="flex flex-1 flex-col gap-3 p-4">
      <NuxtLink :to="`/book/${book.id}`" class="space-y-1">
        <h3 class="line-clamp-1 font-semibold tracking-tight">
          {{ book.title }}
        </h3>
        <p class="text-sm text-muted-foreground">{{ book.author }}</p>
        <p
          class="inline-block rounded-full mt-2 px-2 py-0.5 text-xs font-medium"
          :class="stockClass"
        >
          {{ stockLabel }}
        </p>
      </NuxtLink>

      <!-- Actions conditionally rendered based on variant -->
      <div class="mt-auto flex items-center justify-between gap-2 pt-2">
        <template v-if="variant === 'borrowed'">
          <button
            @click="dashboard.returnBook(book.id)"
            class="flex w-full items-center cursor-pointer justify-center gap-2 rounded-lg border border-primary/30 px-3 py-2 text-sm font-medium text-primary transition-all duration-200 hover:bg-primary-soft"
          >
            <RotateCcw class="h-4 w-4" /> Return Book
          </button>
        </template>
        <template v-else-if="variant === 'purchased'">
          <button
            class="flex w-full items-center cursor-pointer justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <BookOpen class="h-4 w-4" /> Read Now
          </button>
        </template>
        <template v-else>
          <button
            v-if="book.inStock > 1"
            @click="handleBuy()"
            class="flex-1 rounded-lg bg-primary cursor-pointer px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Buy ${{ formattedPrice }}
          </button>
          <button
            @click="dashboard.borrowBook(book.id)"
            :disabled="!book.isAvailable || book.inStock < 1"
            class="flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-200"
            :class="borrowBtnClass"
          >
            {{ borrowLabel }}
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
