<script setup lang="ts">
import { computed } from "vue";
import { Pencil, Trash2, RotateCcw, BookOpen } from "lucide-vue-next";
import type { Book } from "~/data/books";
import { useDashboardStore } from "~/stores/dashboard";
import { useBooksStore } from "~/stores/books";
import { useAuthStore } from "~/stores/auth";

const props = withDefaults(
  defineProps<{
    book: Book;
    variant?: "default" | "borrowed" | "purchased";
  }>(),
  { variant: "default" },
);

const emit = defineEmits<{
  edit: [book: Book];
}>();

const dashboard = useDashboardStore();
const booksStore = useBooksStore();
const auth = useAuthStore();

const borrowBtnClass = computed(() => {
  return props.book.isAvailable && props.book.inStock >= 1
    ? "cursor-pointer border-border hover:bg-muted"
    : "cursor-not-allowed border-dashed border-muted-foreground/30 text-muted-foreground/50";
});

const borrowLabel = computed(() => {
  return props.book.isAvailable && props.book.inStock >= 1 ? "Borrow" : "Unavailable";
});

const stockClass = computed(() => {
  return props.book.inStock >= 1 ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-500";
});

const stockLabel = computed(() => {
  return props.book.inStock >= 1 ? `In stock: ${props.book.inStock}` : "Out of stock";
});

async function handleDelete() {
  if (confirm("Delete this book?")) {
    await booksStore.deleteBook(props.book.id);
  }
}
</script>

<template>
  <div
    class="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5"
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
            class="flex w-full items-center cursor-pointer justify-center gap-2 rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
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
            @click="dashboard.buyBook(book.id)"
            class="flex-1 rounded-lg bg-primary cursor-pointer px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Buy ${{ Number(book.price).toFixed(2) }}
          </button>
          <button
            @click="dashboard.borrowBook(book.id)"
            :disabled="!book.isAvailable || book.inStock < 1"
            class="flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
            :class="borrowBtnClass"
          >
            {{ borrowLabel }}
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
