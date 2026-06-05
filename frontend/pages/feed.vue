<script setup lang="ts">
import { Flame, ChevronLeft, ChevronRight } from "lucide-vue-next";
import { useBooksStore } from "~/stores/books";
import { useAuthStore } from "~/stores/auth";

const booksStore = useBooksStore();
const auth = useAuthStore();
const page = ref(1);
const activeCategory = ref("All");
const categories = ref<string[]>(["All"]);
const showBookForm = ref(false);
const editingBook = ref<any>(null);

const filteredBooks = computed(() => booksStore.books);
const trending = computed(() => booksStore.trending);
const totalPages = computed(() => booksStore.meta.totalPages);

watch([page, activeCategory], async ([p, cat]) => {
  await booksStore.fetchBooks(p, 12, cat === "All" ? undefined : cat);
});

onMounted(async () => {
  await Promise.all([
    booksStore.fetchTrending(),
    booksStore.fetchBooks(1, 12),
  ]);
  const cats = [...new Set(booksStore.books.map((b) => b.category))];
  categories.value = ["All", ...cats];
});

function handleEdit(book: any) {
  editingBook.value = book;
  showBookForm.value = true;
}

function handleFormSaved() {
  showBookForm.value = false;
  editingBook.value = null;
  booksStore.fetchBooks(page.value, 12, activeCategory.value === "All" ? undefined : activeCategory.value);
}

function handleFormClosed() {
  showBookForm.value = false;
  editingBook.value = null;
}

definePageMeta({
  title: "Feed — Read in Pace",
  description: "Browse trending books and the full library on Read in Pace.",
});
</script>

<template>
  <Navbar />
  <main class="mx-auto max-w-5xl px-6 md:px-0 py-10">
    <!-- Trending Now -->
    <section class="mb-14">
      <div class="mb-5 flex items-end justify-between">
        <div>
          <div
            class="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-primary"
          >
            <Flame class="h-3.5 w-3.5" /> Trending Now
          </div>
          <h2 class="text-3xl font-semibold tracking-tight">
            This week's quiet favorites
          </h2>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-5 md:grid-cols-3">
        <NuxtLink
          v-for="(b, i) in trending"
          :key="b.id"
          :to="'/book/' + b.id"
          class="group relative overflow-hidden max-h-117.5 rounded-lg border border-border bg-card transition-all hover:shadow-2xl hover:shadow-black/5"
          :class="i === 0 ? 'md:col-span-2 md:row-span-2' : ''"
        >
          <div
            class="relative overflow-hidden"
            :class="i === 0 ? 'h-full' : 'aspect-16/11'"
          >
            <img
              :src="b.cover"
              :alt="b.title"
              class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div
              class="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent"
            />
            <div class="absolute bottom-0 left-0 right-0 p-6 text-white">
              <span
                class="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider backdrop-blur"
              >
                #{{ i + 1 }} Trending
              </span>
              <h3
                class="mt-3 font-semibold tracking-tight"
                :class="i === 0 ? 'text-3xl' : 'text-xl'"
              >
                {{ b.title }}
              </h3>
              <p class="text-sm text-white/70">{{ b.author }}</p>
            </div>
          </div>
        </NuxtLink>
      </div>
    </section>

    <!-- Shelf -->
    <section>
      <div class="mb-5 flex items-end justify-between">
        <h2 class="text-2xl font-semibold tracking-tight">Full shelf</h2>
        <button
          v-if="auth.adminMode"
          @click="showBookForm = true"
          class="rounded-lg bg-foreground cursor-pointer px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          + New Book
        </button>
      </div>

      <div class="mb-6 flex flex-wrap gap-2">
        <button
          v-for="cat in categories"
          :key="cat"
          @click="activeCategory = cat"
          class="rounded-full cursor-pointer px-4 py-1.5 text-sm font-medium transition-colors"
          :class="
            activeCategory === cat
              ? 'bg-foreground text-background'
              : 'border border-border text-muted-foreground hover:text-foreground'
          "
        >
          {{ cat }}
        </button>
      </div>

      <div
        class="grid grid-cols-1 gap-y-6 gap-x-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
      >
        <BookCard v-for="b in filteredBooks" :key="b.id" :book="b" @edit="handleEdit" />
      </div>

      <!-- Pagination -->
      <div class="mt-14 flex items-center justify-center gap-1.5">
        <button
          @click="page = Math.max(1, page - 1)"
          :disabled="page === 1"
          class="flex h-9 w-9 items-center cursor-pointer justify-center rounded-lg border border-border transition-colors hover:bg-muted disabled:opacity-40"
        >
          <ChevronLeft class="h-4 w-4" />
        </button>
        <button
          v-for="n in Math.min(totalPages, 5)"
          :key="n"
          @click="page = n"
          class="h-9 min-w-9 rounded-lg cursor-pointer px-3 text-sm font-medium transition-colors"
          :class="
            page === n ? 'bg-foreground text-background' : 'hover:bg-muted'
          "
        >
          {{ n }}
        </button>
        <!-- <span v-if="totalPages > 5" class="px-2 text-muted-foreground">\u2026</span> -->
        <button
          v-if="totalPages > 5"
          @click="page = totalPages"
          class="h-9 min-w-9 rounded-lg cursor-pointer px-3 text-sm font-medium transition-colors"
          :class="
            page === totalPages ? 'bg-foreground text-background' : 'hover:bg-muted'
          "
        >
          {{ totalPages }}
        </button>
        <button
          @click="page = Math.min(totalPages, page + 1)"
          :disabled="page === totalPages"
          class="flex h-9 w-9 items-center cursor-pointer justify-center rounded-lg border border-border transition-colors hover:bg-muted disabled:opacity-40"
        >
          <ChevronRight class="h-4 w-4" />
        </button>
      </div>
    </section>

    <BookFormModal
      v-if="showBookForm"
      :book="editingBook"
      @close="handleFormClosed"
      @saved="handleFormSaved"
    />
  </main>
</template>
