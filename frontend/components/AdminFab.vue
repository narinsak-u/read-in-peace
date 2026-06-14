<script setup lang="ts">
import { Plus } from "lucide-vue-next";
import { useAuthStore } from "~/stores/auth";
import { useBooksStore } from "~/stores/books";

const auth = useAuthStore();
const booksStore = useBooksStore();
</script>

<template>
  <button
    v-if="auth.adminMode"
    @click="booksStore.openCreateForm()"
    class="fixed bottom-8 right-8 z-40 flex h-14 items-center gap-2 rounded-lg cursor-pointer bg-primary px-5 text-primary-foreground shadow-lg shadow-primary/30 transition-all duration-200 hover:scale-105 hover:-translate-y-px"
  >
    <Plus class="h-5 w-5" />
    <span class="font-medium">Add New Book</span>
  </button>
</template>
