<script setup lang="ts">
import { BookMarked, Library } from "lucide-vue-next";
import { useAuthStore } from "~/stores/auth";
import { useDashboardStore } from "~/stores/dashboard";
import { useBooksStore } from "~/stores/books";

const auth = useAuthStore();
const dashboard = useDashboardStore();
const booksStore = useBooksStore();
const tab = ref<"borrowed" | "purchased">("borrowed");

const borrowedBooks = computed(() =>
  booksStore.books.filter((b) => dashboard.borrowed.includes(b.id)),
);
const purchasedBooks = computed(() =>
  booksStore.books.filter((b) => dashboard.purchased.includes(b.id)),
);
const list = computed(() =>
  tab.value === "borrowed" ? borrowedBooks.value : purchasedBooks.value,
);

definePageMeta({
  title: "My Dashboard — Read in Pace",
});
</script>

<template>
  <Navbar />
  <main class="mx-auto max-w-5xl px-6 md:px-0 py-10">
    <div class="mb-10">
      <p class="text-sm text-muted-foreground">Welcome back</p>
      <h1 class="mt-1 text-4xl font-semibold tracking-tight">
        {{ auth.username }}
      </h1>
    </div>

    <div
      class="mb-8 inline-flex gap-1 rounded-full border border-border bg-card p-1"
    >
      <button
        @click="tab = 'borrowed'"
        class="flex items-center gap-2 rounded-full cursor-pointer px-5 py-2 text-sm font-medium transition-all"
        :class="
          tab === 'borrowed'
            ? 'bg-foreground text-background shadow'
            : 'text-muted-foreground hover:text-foreground'
        "
      >
        <BookMarked class="h-4 w-4" /> Borrowed · {{ borrowedBooks.length }}
      </button>
      <button
        @click="tab = 'purchased'"
        class="flex items-center gap-2 rounded-full cursor-pointer px-5 py-2 text-sm font-medium transition-all"
        :class="
          tab === 'purchased'
            ? 'bg-foreground text-background shadow'
            : 'text-muted-foreground hover:text-foreground'
        "
      >
        <Library class="h-4 w-4" /> Purchased · {{ purchasedBooks.length }}
      </button>
    </div>

    <template v-if="list.length === 0">
      <div
        class="rounded-2xl border border-dashed border-border py-20 text-center"
      >
        <p class="text-muted-foreground">Nothing here yet.</p>
        <NuxtLink
          to="/feed"
          class="mt-3 inline-block text-sm font-medium text-primary hover:underline"
        >
          Find something to read →
        </NuxtLink>
      </div>
    </template>
    <template v-else>
      <div
        class="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
      >
        <BookCard v-for="b in list" :key="b.id" :book="b" :variant="tab" />
      </div>
    </template>
  </main>
</template>
