<script setup lang="ts">
import { useAuthStore } from "~/stores/auth";
import { useBookStatusStore } from "~/stores/bookStatus";
import { useBorrows } from "~/composables/useBorrows";
import { useBooks } from "~/composables/useBooks";

const props = defineProps<{
  mode: "loans" | "trending";
  flash: (message: string) => void;
}>();

const emit = defineEmits<{
  "open-review": [book: { id: string; title: string; cover: string; crop: number | null }];
}>();

const auth = useAuthStore();
const { borrow, returnBook } = useBookStatusStore();

const {
  borrows,
  borrowsLoaded,
  borrowError,
  fetchBorrows,
} = useBorrows();

const {
  books: trendingBooks,
  loading: trendingLoading,
  refresh: refreshTrending,
} = useBooks({ trending: true });

const showTrendingSection = computed(
  () => !auth.signedIn || (borrowsLoaded.value && borrows.value.length === 0),
);

const userBorrowedSlugs = computed(() => {
  const slugs = new Set<string>();
  for (const loan of borrows.value) {
    slugs.add(loan.bookSlug);
  }
  return slugs;
});

async function onBorrowBook(bookId: string) {
  try {
    await borrow(bookId, "");
    props.flash("Book borrowed for 14 days.");
    await fetchBorrows(1);
    refreshTrending();
  } catch (e: any) {
    if (e?.status === 401) {
      auth.openAuthModal();
    } else if (e?.data?.message) {
      props.flash(e.data.message);
    } else {
      props.flash("Could not borrow the book. Please try again.");
    }
  }
}

async function onReturnBook(bookId: string, title: string, slug: string) {
  try {
    await returnBook(bookId, slug);
    props.flash(`${title} returned. Thank you!`);
    await fetchBorrows(1);
    refreshTrending();
  } catch (e: any) {
    props.flash(e?.data?.message || "Could not return the book.");
  }
}

function onBorrow(bookId: string) {
  if (!auth.signedIn) {
    auth.openAuthModal();
    return;
  }
  onBorrowBook(bookId);
}

onMounted(() => {
  if (props.mode === "loans") {
    fetchBorrows(1).then(() => {
      if (borrows.value.length === 0) refreshTrending();
    });
  } else {
    refreshTrending();
  }
});

watch(
  () => auth.signedIn,
  (val) => {
    if (val && props.mode === "loans") {
      fetchBorrows(1).then(() => {
        if (borrows.value.length === 0) refreshTrending();
      });
    }
  },
);
</script>

<template>
  <section id="loans" class="animate-enter scroll-mt-24">
    <template v-if="showTrendingSection">
      <div
        class="mb-6 flex items-baseline justify-between border-b border-border pb-2"
      >
        <template v-if="auth.signedIn">
          <h2 class="font-serif text-lg">
            No active loans — check what's trending
          </h2>
        </template>
        <template v-else>
          <h1 class="font-serif text-2xl">Trending Now</h1>
          <span class="font-mono text-[10px] uppercase text-muted-foreground">
            Most popular this month
          </span>
        </template>
      </div>

      <div
        v-if="trendingLoading"
        class="border-y border-border py-12 text-center font-serif italic text-muted-foreground"
      >
        Loading trending books...
      </div>
      <div
        v-else-if="trendingBooks.length === 0"
        class="border-y border-border py-12 text-center font-serif italic text-muted-foreground"
      >
        No trending books right now.
      </div>
      <TrendingSection
        v-else
        :books="trendingBooks as any"
        :borrowed-slugs="userBorrowedSlugs"
        :flash="flash"
        @borrow="(_slug, bookId) => onBorrow(bookId)"
        @return="
          (slug, bookId) =>
            onReturnBook(
              bookId,
              (trendingBooks as any).find(
                (b: any) => b.id === bookId || b.slug === slug,
              )?.title ?? 'Book',
              slug,
            )
        "
      />
    </template>

    <template v-else>
      <div
        class="mb-6 flex items-baseline justify-between border-b border-border pb-2"
      >
        <h1 class="font-serif text-2xl">Active Loans</h1>
        <span class="font-mono text-[10px] uppercase text-muted-foreground">
          {{ borrows.length }}
          {{ borrows.length === 1 ? "item" : "items" }} currently on desk
        </span>
      </div>

      <div
        v-if="!borrowsLoaded"
        class="border-y border-border py-12 text-center font-serif italic text-muted-foreground"
      >
        Loading your loans...
      </div>
      <div
        v-else-if="borrowError"
        class="border-y border-border py-12 text-center font-serif italic text-muted-foreground"
      >
        Could not load your loans. Please try again.
      </div>
      <LoansSection
        v-else
        :loans="borrows as any"
        :flash="flash"
        @return="(bookId, title, slug) => onReturnBook(bookId, title, slug)"
        @open-review="(book: { id: string; title: string; cover: string; crop: number | null }) => emit('open-review', book)"
      />
    </template>
  </section>
</template>
