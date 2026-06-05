<script setup lang="ts">
import { useBooksStore } from '~/stores/books';
import { useAuthStore } from '~/stores/auth';

const booksStore = useBooksStore();
const auth = useAuthStore();

const { page, activeCategory, categories, totalPages, setPage, setCategory } = useShelf();

const showBookForm = ref(false);
const editingBook = ref<import('~/stores/books').BookWithMeta | null>(null);

function handleEdit(book: import('~/stores/books').BookWithMeta) {
  editingBook.value = book;
  showBookForm.value = true;
}

function handleAddBook() {
  editingBook.value = null;
  showBookForm.value = true;
}

function handleFormSaved() {
  showBookForm.value = false;
  editingBook.value = null;
  booksStore.fetchBooks(page.value, 12, activeCategory.value === 'All' ? undefined : activeCategory.value);
}

function handleFormClosed() {
  showBookForm.value = false;
  editingBook.value = null;
}

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

    <BookFormModal
      v-if="showBookForm"
      :book="editingBook"
      @close="handleFormClosed"
      @saved="handleFormSaved"
    />
  </main>
</template>
