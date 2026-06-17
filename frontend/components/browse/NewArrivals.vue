<script setup lang="ts">
import { computed, ref, shallowRef, watch } from "vue";
import { mapBookResponse, type Book } from "~/types/book";
import { stockActions } from "~/utils/stock";

const query = defineModel<string>("query", { default: "" });

defineProps<{
  flash: (message: string) => void;
}>();

const categories = ["How-to", "Fiction", "Manga"] as const;
const PAGE_SIZE = 8;

const page = shallowRef(1);
const category = shallowRef<string | undefined>(undefined);
const localBorrowed = ref<string[]>([]);

const { data: rawPage, refresh } = await useFetch<{
  data: Record<string, unknown>[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}>("/api/books", {
  query: { page, limit: PAGE_SIZE, category },
});

watch(page, () => refresh());
watch(category, () => { page.value = 1; refresh(); });
watch(query, () => { page.value = 1; });

const books = computed<Book[]>(() => {
  if (!rawPage.value?.data) return [];
  return rawPage.value.data.map(mapBookResponse);
});

const meta = computed(() => rawPage.value?.meta ?? null);

const filtered = computed(() => {
  const q = query.value.toLowerCase().trim();
  if (!q) return books.value;
  return books.value.filter((b) =>
    `${b.title} ${b.author}`.toLowerCase().includes(q),
  );
});

const borrowedSlugs = computed(() => new Set(localBorrowed.value));

const pageNumbers = computed(() => {
  const total = meta.value?.totalPages ?? 1;
  const current = page.value;
  const pages: number[] = [];
  const start = Math.max(1, current - 2);
  const end = Math.min(total, current + 2);
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
});

function onCategoryChange(cat: string | undefined) {
  category.value = cat;
}

function onPageGo(p: number) {
  page.value = Math.max(1, Math.min(p, meta.value?.totalPages ?? 1));
}

function onBorrow(slug: string) {
  localBorrowed.value.push(slug);
}
</script>

<template>
  <section id="arrivals" class="animate-enter scroll-mt-24 [animation-delay:150ms]">
    <div class="mb-6 border-b border-border pb-3">
      <div class="mb-3 flex items-baseline justify-between">
        <h2 class="font-serif text-2xl">New Arrivals</h2>
        <span v-if="meta" class="font-mono text-[10px] uppercase text-muted-foreground">{{ meta.total }} volumes</span>
      </div>
      <CategoryFilter :categories="categories" :active="category" @change="onCategoryChange" />
    </div>

    <div v-if="filtered.length > 0" class="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-4">
      <BookCard
        v-for="book in filtered"
        :key="book.id"
        :book="book"
        :actions="stockActions(book, borrowedSlugs)"
        :flash="flash"
        @borrow="onBorrow(book.slug)"
      />
    </div>

    <p v-else class="border-y border-border py-12 text-center font-serif italic text-muted-foreground">
      No volumes match "{{ query }}". Try another title or author.
    </p>

    <PaginationNav
      v-if="(meta?.totalPages ?? 1) > 1 && filtered.length > 0"
      :page="page"
      :total-pages="meta?.totalPages ?? 1"
      :page-numbers="pageNumbers"
      @go="onPageGo"
    />
  </section>
</template>
