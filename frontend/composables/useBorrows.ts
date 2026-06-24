import { ref, shallowRef, computed, readonly, watch } from "vue";
import { useAuthStore } from "~/stores/auth";
import { useInvalidate } from "~/composables/useInvalidate";

export interface BorrowItem {
  borrowId: string;
  bookId: string;
  bookSlug: string;
  title: string;
  author: string;
  cover: string;
  crop: number | null;
  shelf: string;
  category: string;
  dueAt: string;
  currentPage: number;
  totalPages: number;
  price: string;
  inStock: number;
  avgRating: number;
  ratingsCount: number;
}

export interface BorrowsResponse {
  data: {
    borrow: Record<PropertyKey, unknown>;
    book: Record<PropertyKey, unknown>;
  }[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const borrows = shallowRef<BorrowItem[]>([]);
const borrowsPage = shallowRef(1);
const borrowsMeta = shallowRef<{
  page: number;
  limit: number;
  total: number;
  totalPages: number;
} | null>(null);
const borrowsLoaded = shallowRef(false);
const borrowError = shallowRef<unknown>(null);
const borrowedSlugs = shallowRef<Set<string>>(new Set());

let lastBorrowsLimit = 3;

export function useBorrows() {
  const auth = useAuthStore();
  const { invalidate, onInvalidate } = useInvalidate();

  const hasMoreBorrows = computed(() => {
    if (!borrowsMeta.value) return false;
    return borrowsPage.value < borrowsMeta.value.totalPages;
  });

  async function fetchBorrows(page = 1, append = false, limit?: number, sort?: string) {
    if (!auth.signedIn) {
      borrows.value = [];
      borrowsLoaded.value = true;
      borrowError.value = null;
      return;
    }
    borrowsLoaded.value = false;
    lastBorrowsLimit = limit ?? 3;
    
    try {
      const res = await $fetch<BorrowsResponse>("/api/user/borrows", {
        query: { page, limit: lastBorrowsLimit, ...(sort ? { sort } : {}) },
      });
      const items = res.data.map(mapBorrowResponse);
      borrows.value = append ? [...borrows.value, ...items] : items;
      borrowsPage.value = page;
      borrowsMeta.value = res.meta;
      borrowError.value = null;
    } catch (e) {
      if (!append) borrows.value = [];
      borrowError.value = e;
    } finally {
      borrowsLoaded.value = true;
    }
  }

  function loadMoreBorrows() {
    if (!hasMoreBorrows.value) return;
    fetchBorrows(borrowsPage.value + 1, true, lastBorrowsLimit);
  }

  async function borrowBook(bookId: string, slug: string) {
    await $fetch(`/api/books/${bookId}/borrow`, { method: "POST" });
    borrowedSlugs.value = new Set([...borrowedSlugs.value, slug]);
    invalidate("borrows", "books");
  }

  async function returnBook(bookId: string, slug: string) {
    await $fetch(`/api/books/${bookId}/return`, { method: "POST" });
    const next = new Set(borrowedSlugs.value);
    next.delete(slug);
    borrowedSlugs.value = next;
    invalidate("borrows", "books");
  }

  async function initBorrowedSlugs() {
    if (!auth.signedIn) {
      borrowedSlugs.value = new Set();
      return;
    }
    try {
      const res = await $fetch<BorrowsResponse>("/api/user/borrows", {
        query: { page: 1, limit: 3 },
      });
      borrowedSlugs.value = new Set(
        res.data.map((b) => (b.book.slug as string) ?? (b.book.id as string)),
      );
    } catch {
      borrowedSlugs.value = new Set();
    }
  }

  onInvalidate("borrows", () => fetchBorrows(1));

  watch(
    () => auth.signedIn,
    (val) => {
      if (val) {
        initBorrowedSlugs();
      } else {
        borrowedSlugs.value = new Set();
      }
    },
    { immediate: true },
  );

  return {
    borrows: readonly(borrows),
    borrowsPage: readonly(borrowsPage),
    borrowsMeta: readonly(borrowsMeta),
    borrowsLoaded: readonly(borrowsLoaded),
    borrowError: readonly(borrowError),
    hasMoreBorrows,
    borrowedSlugs: readonly(borrowedSlugs),
    fetchBorrows,
    loadMoreBorrows,
    borrowBook,
    returnBook,
  };
}

function mapBorrowResponse(entry: BorrowsResponse["data"][number]): BorrowItem {
  return {
    borrowId: entry.borrow.id as string,
    bookId: entry.book.id as string,
    bookSlug: (entry.book.slug as string) ?? (entry.book.id as string),
    title: entry.book.title as string,
    author: entry.book.author as string,
    cover: entry.book.cover as string,
    crop: (entry.book.crop as number | null) ?? null,
    shelf: (entry.book.shelf as string) ?? "GEN",
    category: (entry.book.category as string) ?? "",
    dueAt: entry.borrow.dueAt as string,
    currentPage: entry.borrow.currentPage as number,
    totalPages: entry.borrow.totalPages as number,
    price: String(entry.book.price ?? "0"),
    inStock: (entry.book.inStock as number) ?? 0,
    avgRating: Number(entry.book.avgRating ?? 0),
    ratingsCount: (entry.book.ratingsCount as number) ?? 0,
  };
}
