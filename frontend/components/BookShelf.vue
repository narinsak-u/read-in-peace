<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';
import type { BookWithMeta } from '~/stores/books';

const props = defineProps<{
  books: BookWithMeta[];
  categories: string[];
  activeCategory: string;
  page: number;
  totalPages: number;
  adminMode: boolean;
}>();

const emit = defineEmits<{
  edit: [book: BookWithMeta];
  addBook: [];
  categoryChange: [cat: string];
  pageChange: [page: number];
}>();
</script>

<template>
  <section>
    <div class="mb-5 flex items-end justify-between">
      <h2 class="text-2xl font-semibold tracking-tight">Full shelf</h2>
      <button
        v-if="adminMode"
        @click="emit('addBook')"
        class="rounded-lg bg-foreground cursor-pointer px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
      >
        + New Book
      </button>
    </div>

    <div class="mb-6 flex flex-wrap gap-2">
      <button
        v-for="cat in categories"
        :key="cat"
        @click="emit('categoryChange', cat)"
        class="rounded-full cursor-pointer px-4 py-1.5 text-sm font-medium transition-all duration-200"
        :class="
          activeCategory === cat
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'border border-border/60 text-muted-foreground hover:text-foreground hover:border-border'
        "
      >
        {{ cat }}
      </button>
    </div>

    <div class="grid grid-cols-1 gap-y-6 gap-x-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      <BookCard
        v-for="b in books"
        :key="b.id"
        :book="b"
        @edit="emit('edit', b)"
      />
    </div>

    <div class="mt-14 flex items-center justify-center gap-1.5">
      <button
        @click="emit('pageChange', Math.max(1, page - 1))"
        :disabled="page === 1"
        class="flex h-9 w-9 items-center cursor-pointer justify-center rounded-lg border border-border transition-colors hover:bg-muted disabled:opacity-40"
      >
        <ChevronLeft class="h-4 w-4" />
      </button>
      <button
        v-for="n in Math.min(totalPages, 5)"
        :key="n"
        @click="emit('pageChange', n)"
        class="h-9 min-w-9 rounded-lg cursor-pointer px-3 text-sm font-medium transition-colors"
        :class="
          page === n ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted'
        "
      >
        {{ n }}
      </button>
      <button
        v-if="totalPages > 5"
        @click="emit('pageChange', totalPages)"
        class="h-9 min-w-9 rounded-lg cursor-pointer px-3 text-sm font-medium transition-colors"
        :class="
          page === totalPages ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted'
        "
      >
        {{ totalPages }}
      </button>
      <button
        @click="emit('pageChange', Math.min(totalPages, page + 1))"
        :disabled="page === totalPages"
        class="flex h-9 w-9 items-center cursor-pointer justify-center rounded-lg border border-border transition-colors hover:bg-muted disabled:opacity-40"
      >
        <ChevronRight class="h-4 w-4" />
      </button>
    </div>
  </section>
</template>
