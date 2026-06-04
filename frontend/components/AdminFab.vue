<script setup lang="ts">
import { Plus } from "lucide-vue-next";
import { useAuthStore } from "~/stores/auth";

const auth = useAuthStore();
</script>

<template>
  <button
    v-if="auth.adminMode"
    class="fixed bottom-8 right-8 z-40 flex h-14 items-center gap-2 rounded-lg bg-primary px-5 text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105"
  >
    <Plus class="h-5 w-5" />
    <span class="font-medium">Add New Book</span>
  </button>
</template>
