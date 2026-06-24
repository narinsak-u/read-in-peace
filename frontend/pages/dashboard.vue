<script setup lang="ts">
import { computed } from "vue";
import { CheckCircle, BookOpen } from "lucide-vue-next";
import { useAuthStore } from "~/stores/auth";
import { usePurchases } from "~/composables/usePurchases";
import { useBorrows } from "~/composables/useBorrows";
import type { BorrowItem } from "~/composables/useBorrows";
import type { Book } from "~/types/book";
import BookCard from "~/components/book/BookCard.vue";
import PaginationNav from "~/components/browse/PaginationNav.vue";

definePageMeta({
  title: "Dashboard — Read in Peace",
  description: "Your purchases and reading activity.",
});

const route = useRoute();
const router = useRouter();
const { flash } = useFlash();
const auth = useAuthStore();

const tab = shallowRef<"purchased" | "borrowed">(
  route.query.tab === "borrowed" ? "borrowed" : "purchased",
);
const confirming = shallowRef(false);

const {
  purchases,
  loaded,
  confirmPurchase,
  refresh: refreshPurchases,
} = usePurchases();

const {
  borrows,
  borrowsLoaded,
  borrowsPage,
  borrowsMeta,
  returnBook,
  fetchBorrows,
} = useBorrows();

const pageNumbers = computed(() => {
  const total = borrowsMeta.value?.totalPages ?? 1;
  const current = borrowsPage.value;
  const pages: number[] = [];
  const start = Math.max(1, current - 2);
  const end = Math.min(total, current + 2);
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
});

function onPageGo(p: number) {
  fetchBorrows(p, false, 12);
}

function toBook(loan: BorrowItem): Book {
  return {
    id: loan.bookId,
    slug: loan.bookSlug,
    title: loan.title,
    author: loan.author,
    price: loan.price,
    cover: loan.cover,
    synopsis: "",
    category: loan.category,
    crop: loan.crop,
    shelf: loan.shelf,
    year: 0,
    trending: false,
    inStock: loan.inStock,
    isAvailable: true,
    totalPages: loan.totalPages,
    likeCount: 0,
    commentCount: 0,
    avgRating: loan.avgRating,
    ratingsCount: loan.ratingsCount,
    createdBy: "",
    createdAt: "",
    updatedAt: "",
  };
}

function borrowActions(loan: BorrowItem) {
  return {
    isBorrowed: true,
    canBuy: loan.inStock > 1,
    canBorrow: false,
    unavailable: false,
  };
}

async function onConfirmPurchase(sessionId: string) {
  confirming.value = true;
  try {
    await confirmPurchase(sessionId);
    flash("Purchase confirmed! Welcome to your library.");
    await router.replace({ query: {} });
  } catch (e: any) {
    flash(e?.data?.message || "Could not confirm purchase.");
  } finally {
    confirming.value = false;
  }
}

watch(
  () => auth.signedIn,
  (val) => {
    if (val) {
      fetchBorrows(borrowsPage.value, false, 12);
    }
  },
  { immediate: true },
);

onMounted(async () => {
  const sessionId = route.query.session_id as string | undefined;
  if (sessionId) {
    await onConfirmPurchase(sessionId);
  }
  await refreshPurchases();
});
</script>

<template>
  <div class="min-h-screen pb-28 bg-background text-foreground">
    <Nav mode="cart" />
    <main class="mx-auto max-w-6xl px-4 py-10 md:px-6 lg:py-14">
      <div class="border-b border-border pb-5">
        <p class="font-mono text-[10px] uppercase tracking-widest text-primary">
          Your collection
        </p>
        <h1 class="mt-2 font-serif text-4xl font-bold md:text-5xl">
          My Library
        </h1>
      </div>

      <!-- Tabs -->
      <div class="mt-6 flex gap-1 border-b border-border">
        <button
          class="border-b-2 cursor-pointer px-4 py-2 font-serif text-sm transition-colors"
          :class="
            tab === 'purchased'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          "
          @click="tab = 'purchased'"
        >
          Purchased
        </button>
        <button
          class="border-b-2 px-4 py-2 font-serif text-sm transition-colors"
          :class="
            tab === 'borrowed'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          "
          @click="tab = 'borrowed'"
        >
          Borrowed
        </button>
      </div>

      <div v-if="confirming" class="mt-8 text-center">
        <p class="font-serif italic text-muted-foreground">
          Confirming your purchase...
        </p>
      </div>

      <div v-else-if="!auth.signedIn" class="mt-16 text-center">
        <BookOpen class="mx-auto size-10 text-muted-foreground" />
        <h2 class="mt-4 font-serif text-2xl">Sign in to see your library</h2>
        <p class="mt-2 text-sm text-muted-foreground">
          <button
            class="text-primary hover:underline"
            @click="auth.openAuthModal()"
          >
            Sign in
          </button>
          to view your library.
        </p>
      </div>

      <!-- Purchased tab -->
      <template v-else-if="tab === 'purchased'">
        <div v-if="!loaded" class="mt-16 text-center">
          <p class="font-serif italic text-muted-foreground">
            Loading your purchases...
          </p>
        </div>

        <div v-else-if="purchases.length === 0" class="mt-16 text-center">
          <BookOpen class="mx-auto size-10 text-muted-foreground" />
          <h2 class="mt-4 font-serif text-2xl">No purchases yet</h2>
          <p class="mt-2 text-sm text-muted-foreground">
            Books you buy will appear here. Browse the library to find your next
            keep.
          </p>
          <NuxtLink
            to="/feed"
            class="mt-6 inline-block rounded-sm bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
          >
            Browse the library
          </NuxtLink>
        </div>

        <div v-else class="mt-8 divide-y divide-border">
          <article
            v-for="entry in purchases"
            :key="entry.purchase?.id ?? entry.book?.id"
            class="flex gap-5 py-6"
          >
            <CoverImage
              :crop="entry.book?.crop ?? null"
              :src="entry.book?.cover ?? ''"
              :alt="`${entry.book?.title ?? 'Book'} cover`"
              class="h-28 w-20 shrink-0 shadow-md"
            />
            <div class="flex min-w-0 flex-1 flex-col justify-center">
              <h2 class="font-serif text-lg font-bold">
                <NuxtLink
                  :to="`/book/${entry.book?.slug ?? entry.book?.id}`"
                  class="hover:text-primary"
                >
                  {{ entry.book?.title ?? "Unknown Title" }}
                </NuxtLink>
              </h2>
              <p class="mt-0.5 text-sm italic text-muted-foreground">
                by {{ entry.book?.author ?? "Unknown" }}
              </p>
              <p class="mt-2 font-mono text-xs text-primary">
                ${{ entry.book?.price ?? "0" }}
              </p>
              <p
                v-if="entry.purchase?.purchasedAt"
                class="mt-1 font-mono text-[10px] text-muted-foreground"
              >
                Purchased
                {{ new Date(entry.purchase.purchasedAt).toLocaleDateString() }}
              </p>
            </div>
            <div class="flex items-center">
              <CheckCircle class="size-5 text-primary" />
            </div>
          </article>
        </div>
      </template>

      <!-- Borrowed tab -->
      <template v-else>
        <div v-if="!borrowsLoaded" class="mt-16 text-center">
          <p class="font-serif italic text-muted-foreground">
            Loading your borrows...
          </p>
        </div>

        <div v-else-if="borrows.length === 0" class="mt-16 text-center">
          <BookOpen class="mx-auto size-10 text-muted-foreground" />
          <h2 class="mt-4 font-serif text-2xl">No active borrows</h2>
          <p class="mt-2 text-sm text-muted-foreground">
            Books you borrow will appear here. Browse the library to find your
            next read.
          </p>
          <NuxtLink
            to="/feed"
            class="mt-6 inline-block rounded-sm bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
          >
            Browse the library
          </NuxtLink>
        </div>

        <div v-else>
          <div class="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-4">
            <BookCard
              v-for="loan in borrows"
              :key="loan.borrowId"
              :book="toBook(loan)"
              :actions="borrowActions(loan)"
              :flash="flash"
              @return="returnBook(loan.bookId, loan.title)"
            />
          </div>
          <PaginationNav
            :page="borrowsPage"
            :total-pages="borrowsMeta?.totalPages ?? 1"
            :page-numbers="pageNumbers"
            @go="onPageGo"
          />
        </div>
      </template>
    </main>
  </div>
</template>
