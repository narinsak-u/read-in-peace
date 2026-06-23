<script setup lang="ts">
import { shallowRef } from "vue";
import { stockActions } from "~/utils/stock";
import { useAuthStore } from "~/stores/auth";
import { useLibraryStore } from "~/stores/library";
import { useBooks } from "~/composables/useBooks";

const query = defineModel<string>("query", { default: "" });

const props = defineProps<{
  flash: (message: string) => void;
}>();

const auth = useAuthStore();
const store = useLibraryStore();

const {
  filtered,
  meta,
  page,
  category,
  pageNumbers,
} = useBooks({ query });

const categories = ["How-to", "Fiction", "Manga"] as const;
const PAGE_SIZE = 8;

async function onBorrow(slug: string, bookId: string) {
  if (!auth.signedIn) {
    auth.openAuthModal();
    return;
  }
  try {
    await $fetch(`/api/books/${bookId}/borrow`, { method: "POST" });
    store.addBorrowedSlug(slug);
    props.flash("Book borrowed for 14 days.");
  } catch (e: any) {
    props.flash(e?.data?.message || "Could not borrow the book.");
  }
}

async function onReturn(slug: string, bookId: string) {
  try {
    await $fetch(`/api/books/${bookId}/return`, { method: "POST" });
    store.removeBorrowedSlug(slug);
    props.flash("Book returned. Thank you!");
  } catch (e: any) {
    props.flash(e?.data?.message || "Could not return the book.");
  }
}

function onCategoryChange(cat: string | undefined) {
  category.value = cat;
}

function onPageGo(p: number) {
  page.value = Math.max(1, Math.min(p, meta.value?.totalPages ?? 1));
}
</script>

<template>
  <section
    id="arrivals"
    class="animate-enter scroll-mt-24 [animation-delay:150ms]"
  >
    <div class="mb-6 border-b border-border pb-3">
      <div class="mb-3 flex items-baseline justify-between">
        <h2 class="font-serif text-2xl">New Arrivals</h2>
        <span
          v-if="meta"
          class="font-mono text-[10px] uppercase text-muted-foreground"
        >
          {{ meta.total }} volumes
        </span>
      </div>
      <CategoryFilter
        :categories="categories"
        :active="category"
        @change="onCategoryChange"
      />
    </div>

    <div
      v-if="filtered.length > 0"
      class="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-4"
    >
      <BookCard
        v-for="book in filtered"
        :key="book.id"
        :book="book"
        :actions="stockActions(book, store.borrowedSlugs)"
        :flash="flash"
        @borrow="onBorrow(book.slug, book.id)"
        @return="onReturn(book.slug, book.id)"
      />
    </div>

    <p
      v-else
      class="border-y border-border py-12 text-center font-serif italic text-muted-foreground"
    >
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
