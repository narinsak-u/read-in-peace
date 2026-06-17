<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';
import { mapBookResponse, type Book } from '~/types/book';

const props = defineProps<{
  mode: 'loans' | 'trending';
  returned?: string[];
  flash: (message: string) => void;
}>();

const emit = defineEmits<{
  return: [slug: string];
  'open-review': [];
}>();

const auth = useAuthStore();

// --- Trending ---

const trendingBooks = ref<Book[]>([]);
const trendingLoaded = shallowRef(false);

async function fetchTrending() {
  try {
    const raw = await $fetch<Record<string, unknown>[]>('/api/books/trending');
    trendingBooks.value = raw.map(mapBookResponse);
  } catch {
    trendingBooks.value = [];
  } finally {
    trendingLoaded.value = true;
  }
}

// --- Loans ---

interface BorrowItem {
  borrowId: string;
  bookId: string;
  bookSlug: string;
  title: string;
  author: string;
  cover: string;
  crop: number | null;
  shelf: string;
  dueAt: string;
  currentPage: number;
  totalPages: number;
  price: string;
  inStock: number;
}

const rawBorrows = ref<{ borrow: Record<PropertyKey, unknown>; book: Record<PropertyKey, unknown> }[] | null>(null);
const borrowError = shallowRef<unknown>(null);
const loansLoaded = shallowRef(false);

async function fetchBorrows() {
  if (!auth.signedIn) {
    rawBorrows.value = null;
    loansLoaded.value = true;
    return;
  }
  try {
    rawBorrows.value = await $fetch('/api/user/borrows');
    borrowError.value = null;
  } catch (e) {
    rawBorrows.value = null;
    borrowError.value = e;
  } finally {
    loansLoaded.value = true;
  }
}

const loans = computed<BorrowItem[]>(() => {
  if (!rawBorrows.value) return [];
  return rawBorrows.value.map((entry) => ({
    borrowId: entry.borrow.id as string,
    bookId: entry.book.id as string,
    bookSlug: (entry.book.slug as string) ?? (entry.book.id as string),
    title: entry.book.title as string,
    author: entry.book.author as string,
    cover: entry.book.cover as string,
    crop: (entry.book.crop as number | null) ?? null,
    shelf: (entry.book.shelf as string) ?? 'GEN',
    dueAt: entry.borrow.dueAt as string,
    currentPage: entry.borrow.currentPage as number,
    totalPages: entry.borrow.totalPages as number,
    price: String(entry.book.price ?? '0'),
    inStock: (entry.book.inStock as number) ?? 0,
  }));
});

// --- Shared state ---

const localBorrowed = ref<string[]>([]);
const userBorrowedSlugs = computed(() => {
  const slugs = new Set(localBorrowed.value);
  for (const loan of loans.value) {
    slugs.add(loan.bookSlug);
  }
  return slugs;
});

function onBorrow(slug: string) {
  if (localBorrowed.value.includes(slug)) {
    emit('return', slug);
    props.flash(`Book returned. Thank you!`);
    localBorrowed.value = localBorrowed.value.filter((s) => s !== slug);
  } else {
    localBorrowed.value.push(slug);
    props.flash(`Book borrowed for 21 days.`);
  }
}

// Init
if (props.mode === 'trending') {
  fetchTrending();
} else {
  fetchBorrows();
  watch(() => auth.signedIn, (val) => {
    if (val) fetchBorrows();
  });
}
</script>

<template>
  <section id="loans" class="animate-enter scroll-mt-24">
    <!-- Trending -->
    <template v-if="mode === 'trending'">
      <div class="mb-6 flex items-baseline justify-between border-b border-border pb-2">
        <h1 class="font-serif text-2xl">Trending Now</h1>
        <span class="font-mono text-[10px] uppercase text-muted-foreground">Most popular this month</span>
      </div>

      <div v-if="!trendingLoaded" class="border-y border-border py-12 text-center font-serif italic text-muted-foreground">
        Loading trending books...
      </div>
      <div v-else-if="trendingBooks.length === 0" class="border-y border-border py-12 text-center font-serif italic text-muted-foreground">
        No trending books right now.
      </div>
      <TrendingSection
        v-else
        :books="trendingBooks"
        :borrowed-slugs="userBorrowedSlugs"
        :flash="flash"
        @borrow="onBorrow"
      />
    </template>

    <!-- Loans -->
    <template v-else>
      <div class="mb-6 flex items-baseline justify-between border-b border-border pb-2">
        <h1 class="font-serif text-2xl">Active Loans</h1>
        <span class="font-mono text-[10px] uppercase text-muted-foreground">{{ loans.length }} items currently on desk</span>
      </div>

      <div v-if="!loansLoaded" class="border-y border-border py-12 text-center font-serif italic text-muted-foreground">
        Loading your loans...
      </div>
      <div v-else-if="!auth.signedIn" class="border-y border-border py-12 text-center font-serif italic text-muted-foreground">
        Sign in to see your active loans.
      </div>
      <div v-else-if="borrowError" class="border-y border-border py-12 text-center font-serif italic text-muted-foreground">
        Could not load your loans. Please try again.
      </div>

      <template v-else>
        <LoansSection :loans="loans" :flash="flash" @return="emit('return', $event)" @open-review="emit('open-review')" />
        <div v-if="loans.length === 0" class="border-y border-border py-12 text-center font-serif italic text-muted-foreground">
          No active loans. Browse the library to borrow a book.
        </div>
      </template>
    </template>
  </section>
</template>
