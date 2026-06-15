<script setup lang="ts">
import { useDashboardStore } from '~/stores/dashboard';
import { useBooksStore } from '~/stores/books';
import { useCartStore } from '~/stores/cart';
import { useSearch } from '~/composables/useSearch';
import type { BookWithMeta } from '~/stores/books';

const dashboard = useDashboardStore();
const booksStore = useBooksStore();
const cartStore = useCartStore();
const search = useSearch();
const notice = shallowRef('');

definePageMeta({
  title: 'Home — Read in Pace',
  description: 'Your personal library dashboard.',
});

const activeLoans = computed(() => dashboard.borrowed);
const arrivals = computed(() =>
  booksStore.newArrivals.filter((b: BookWithMeta) =>
    `${b.title} ${b.author}`.toLowerCase().includes(search.query.value.toLowerCase()),
  ),
);

const flash = (message: string) => {
  notice.value = message;
  setTimeout(() => (notice.value = ''), 2400);
};

async function handleReturn(bookId: string, title: string) {
  await dashboard.returnBook(bookId);
  flash(`${title} returned. Thank you!`);
}

async function handleBorrow(bookId: string, title: string) {
  try {
    await dashboard.borrowBook(bookId);
    flash(`${title} borrowed. Due in 21 days.`);
    booksStore.fetchNewArrivals();
  } catch {}
}

function handleBuy(book: BookWithMeta) {
  cartStore.addItem({
    bookId: book.id,
    title: book.title,
    author: book.author,
    cover: book.cover,
    price: Number(book.price),
    category: book.category,
    crop: book.crop,
  });
  flash(`${book.title} added to your cart.`);
}

function dueDateLabel(dueAt: string): { label: string; overdue: boolean } {
  const now = new Date();
  const due = new Date(dueAt);
  const diffMs = due.getTime() - now.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: `OVERDUE (${Math.abs(days)}D)`, overdue: true };
  if (days === 0) return { label: 'DUE TODAY', overdue: false };
  return { label: `DUE IN ${days} DAYS`, overdue: false };
}

onMounted(async () => {
  await Promise.all([dashboard.fetchBorrows(), booksStore.fetchNewArrivals()]);
});
</script>

<template>
  <NuxtLayout name="app">
    <template #sidebar>
      <AppSidebar>
        <template #yearly-progress>
          <YearlyProgressCard />
        </template>
      </AppSidebar>
    </template>

    <!-- Active Loans -->
    <section class="animate-enter">
      <div class="mb-6 flex items-baseline justify-between border-b border-border pb-2">
        <h1 class="font-serif text-2xl">Active Loans</h1>
        <span class="font-mono text-[10px] uppercase text-muted-foreground">
          {{ activeLoans.length }} {{ activeLoans.length === 1 ? 'item' : 'items' }} currently on desk
        </span>
      </div>

      <template v-if="activeLoans.length === 0">
        <p class="text-muted-foreground italic">
          You don't have any active loans yet. Find something in the Explore tab.
        </p>
      </template>

      <template v-for="item in activeLoans" :key="item.borrow.id">
        <article class="group flex flex-col gap-8 rounded-sm border border-border bg-card p-5 md:flex-row md:p-6 mb-6">
          <NuxtLink
            :to="`/book/${item.borrow.bookId}`"
            class="shrink-0 self-center shadow-xl transition-transform duration-500 group-hover:-translate-y-1 md:self-auto"
          >
            <img
              :src="item.book.cover"
              :alt="item.book.title"
              class="h-[270px] w-[180px] object-cover"
            />
          </NuxtLink>
          <div class="flex flex-1 flex-col justify-between py-2">
            <div>
              <div class="mb-2 flex flex-wrap items-center gap-2">
                <span
                  class="rounded-sm px-2 py-0.5 font-mono text-[10px]"
                  :class="dueDateLabel(item.borrow.dueAt).overdue ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'"
                >
                  {{ dueDateLabel(item.borrow.dueAt).label }}
                </span>
                <span class="font-mono text-[10px] uppercase text-muted-foreground">
                  Shelf: {{ item.book.id.slice(0, 8).toUpperCase() }}
                </span>
              </div>
              <h2 class="mb-1 font-serif text-3xl font-bold">
                <NuxtLink
                  :to="`/book/${item.borrow.bookId}`"
                  class="transition-colors hover:text-primary"
                >
                  {{ item.book.title }}
                </NuxtLink>
              </h2>
              <p class="mb-4 italic text-muted-foreground">by {{ item.book.author }}</p>
              <div class="mb-6 flex items-center gap-1">
                <span class="text-lg text-primary">
                  {{ '★★★★★'.slice(0, Math.round(Number(item.book.rating))) }}
                </span>
                <span class="text-lg text-foreground/10">
                  {{ '★★★★★'.slice(Math.round(Number(item.book.rating))) }}
                </span>
                <span class="ml-2 text-[11px] font-medium tracking-tight text-muted-foreground">
                  {{ Number(item.book.rating).toFixed(1) }} AVG RATING
                </span>
              </div>
              <div class="h-1.5 w-full overflow-hidden rounded-full bg-foreground/5">
                <div
                  class="h-full bg-primary"
                  :style="{ width: (item.borrow.currentPage / item.borrow.totalPages * 100) + '%' }"
                />
              </div>
              <p class="mt-2 font-mono text-[11px] text-muted-foreground">
                PAGE {{ item.borrow.currentPage }} OF {{ item.borrow.totalPages }}
                ({{ Math.round(item.borrow.currentPage / item.borrow.totalPages * 100) }}%)
              </p>
            </div>
            <div class="mt-6 flex flex-wrap gap-3">
              <Button variant="archival" @click="handleReturn(item.borrow.bookId, item.book.title)">
                Return Book
              </Button>
              <Button variant="archivalOutline" @click="flash('Review composer opened.')">
                Write Review
              </Button>
              <Button variant="archivalGhost" @click="handleBuy(item.book as BookWithMeta)">
                Buy ${{ Number(item.book.price).toFixed(2) }}
              </Button>
            </div>
          </div>
        </article>
      </template>
    </section>

    <!-- New Arrivals -->
    <section class="animate-enter [animation-delay:150ms]">
      <div class="mb-6 flex items-baseline justify-between border-b border-border pb-2">
        <h1 class="font-serif text-2xl">New Arrivals</h1>
        <span class="font-mono text-[10px] uppercase text-muted-foreground">Curated this week</span>
      </div>

      <div v-if="arrivals.length === 0" class="border-y border-border py-12 text-center font-serif italic text-muted-foreground">
        <template v-if="search.query.value">
          No volumes match &ldquo;{{ search.query.value }}&rdquo;. Try another title or author.
        </template>
        <template v-else>
          Loading new arrivals...
        </template>
      </div>

      <div v-else class="grid grid-cols-2 gap-6 md:grid-cols-4">
        <article
          v-for="book in arrivals"
          :key="book.id"
          class="flex flex-col items-center text-center"
        >
          <NuxtLink :to="`/book/${book.id}`" class="mb-3 w-full">
            <div :class="`cover-crop cover-${book.crop}`" class="aspect-2/3 w-full overflow-hidden rounded-sm border border-border/40 bg-muted shadow-sm">
              <img :src="book.cover" :alt="book.title" loading="lazy" />
            </div>
          </NuxtLink>
          <NuxtLink
            :to="`/book/${book.id}`"
            class="font-serif text-sm font-semibold transition-colors hover:text-primary line-clamp-1"
          >
            {{ book.title }}
          </NuxtLink>
          <p class="text-xs text-muted-foreground">{{ book.author }}</p>
          <div class="mt-1 flex items-center gap-1 text-xs text-primary">
            <span>{{ '★★★★★'.slice(0, Math.round(Number(book.avgRating))) }}</span>
            <span class="text-foreground/10">{{ '★★★★★'.slice(Math.round(Number(book.avgRating))) }}</span>
            <span class="text-muted-foreground">{{ Number(book.avgRating).toFixed(1) }}</span>
          </div>
          <Button
            variant="archivalOutline"
            size="sm"
            class="mt-3 w-full"
            @click="handleBorrow(book.id, book.title)"
          >
            Borrow
          </Button>
        </article>
      </div>
    </section>
  </NuxtLayout>

  <!-- Flash notice -->
  <div
    v-if="notice"
    role="status"
    class="fixed right-5 top-20 z-50 border border-border bg-foreground px-4 py-3 text-sm text-background shadow-xl animate-enter"
  >
    {{ notice }}
  </div>
</template>
