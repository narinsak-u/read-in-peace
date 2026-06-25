<script setup lang="ts">
import { onMounted, onUnmounted, shallowRef, useTemplateRef } from "vue";
import { Loader2, Search } from "lucide-vue-next";

const query = defineModel<string>("query", { default: "" });
const { results, loading } = useSearch(query);

const searchInput = useTemplateRef<HTMLInputElement>("searchInput");
const isFocused = shallowRef(false);

function onKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    searchInput.value?.focus();
  }
}

function closeSearch() {
  isFocused.value = false;
  searchInput.value?.blur();
}

onMounted(() => document.addEventListener("keydown", onKeydown));
onUnmounted(() => document.removeEventListener("keydown", onKeydown));
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isFocused && query"
        class="fixed inset-0 z-30 bg-black/50"
        @click="closeSearch"
      />
    </Transition>
  </Teleport>

  <div class="relative flex-1 max-w-3xl">
    <label class="relative">
      <span class="sr-only">Search books</span>
      <Search
        class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <input
        ref="searchInput"
        v-model="query"
        placeholder="Search the books you want to read..."
        class="w-full rounded-sm border-0 bg-input py-2 pl-9 pr-14 text-sm placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
        @focus="isFocused = true"
        @keydown.escape="closeSearch"
      />
      <kbd
        class="absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-sm border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:flex"
      >
        <span>⌘</span>K
      </kbd>
    </label>

    <Transition name="fade">
      <div
        v-if="isFocused && query"
        class="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-border bg-background shadow-2xl"
        @mousedown.prevent
      >
        <div
          v-if="loading"
          class="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground"
        >
          <Loader2 class="size-4 animate-spin" />
          Searching...
        </div>
        <div
          v-else-if="results.length === 0"
          class="p-4 text-center text-sm text-muted-foreground"
        >
          No books found for "{{ query }}"
        </div>
        <div v-else class="max-h-80 overflow-y-auto p-1">
          <NuxtLink
            v-for="book in results"
            :key="book.id"
            :to="`/book/${book.slug}`"
            class="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-accent"
            @click="closeSearch"
          >
            <CoverImage
              :crop="book.crop"
              :src="book.cover"
              class="size-10 shrink-0 rounded object-cover"
            />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">{{ book.title }}</p>
              <p class="text-xs text-muted-foreground">{{ book.author }}</p>
            </div>
          </NuxtLink>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
:deep(.fade-enter-active),
:deep(.fade-leave-active) {
  transition: opacity 0.15s ease;
}

:deep(.fade-enter-from),
:deep(.fade-leave-to) {
  opacity: 0;
}
</style>
