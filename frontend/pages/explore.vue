<script setup lang="ts">
import { useBooksStore } from '~/stores/books';
import { useAuthStore } from '~/stores/auth';

const booksStore = useBooksStore();
const auth = useAuthStore();

const { page, activeCategory, categories, totalPages, setPage, setCategory } = useShelf();

const booksList = computed(() => [...booksStore.books]);
const trendingList = computed(() => [...booksStore.trending]);

function handleEdit(book: import('~/stores/books').BookWithMeta) {
  booksStore.openEditForm(book);
}

function handleAddBook() {
  booksStore.openCreateForm();
}

watch(() => booksStore.showForm, (showing) => {
  if (!showing) {
    booksStore.fetchBooks(page.value, 12, activeCategory.value === 'All' ? undefined : activeCategory.value);
  }
});

definePageMeta({
  layout: 'app',
  title: 'Explore — Read in Pace',
  description: 'Browse trending books and the full library on Read in Pace.',
});
</script>

<template>
  <div class="animate-enter">
    <TrendingSection :trending="trendingList" />
  </div>

  <div class="animate-enter [animation-delay:150ms]">
    <BookShelf
      :books="booksList"
      :categories="categories"
      :active-category="activeCategory"
      :page="page"
      :total-pages="totalPages"
      :admin-mode="auth.adminMode"
      @edit="handleEdit"
      @add-book="handleAddBook"
      @category-change="setCategory"
      @page-change="setPage"
    />
  </div>
</template>
