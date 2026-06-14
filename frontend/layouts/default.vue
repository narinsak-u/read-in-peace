<script setup lang="ts">
import { Toaster } from 'vue-sonner';
import { useBooksStore } from '~/stores/books';

const route = useRoute();
const booksStore = useBooksStore();
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <main class="flex-1">
      <slot />
    </main>
    <Footer v-if="route.name !== 'index'" />
    <AdminFab />
    <BookFormModal
      v-if="booksStore.showForm"
      :book="booksStore.editingBook"
      @close="booksStore.closeForm()"
      @saved="booksStore.closeForm()"
    />
    <Toaster richColors position="top-center" />
  </div>
</template>
