<script setup lang="ts">
import { useBooksStore } from '~/stores/books';
import { useAuthStore } from '~/stores/auth';

const booksStore = useBooksStore();
const auth = useAuthStore();

const { page, activeCategory, categories, totalPages, setPage, setCategory } = useShelf();

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
  title: 'Feed — Read in Pace',
  description: 'Browse trending books and the full library on Read in Pace.',
});
</script>

<template>
  <Navbar />
  <main class="mx-auto max-w-5xl px-6 md:px-0 py-10">
    <TrendingSection :trending="booksStore.trending" />

    <BookShelf
      :books="booksStore.books"
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
  </main>
</template>
