import { ref, shallowRef, computed, readonly } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { useInvalidate } from '~/composables/useInvalidate';
import { mapBorrowResponse } from '~/utils/borrow';

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

export function useBorrows() {
  const auth = useAuthStore();
  const { invalidate, onInvalidate } = useInvalidate();

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

  let lastBorrowsLimit = 3;

  const hasMoreBorrows = computed(() => {
    if (!borrowsMeta.value) return false;
    return borrowsPage.value < borrowsMeta.value.totalPages;
  });

  async function fetchBorrows(
    page = 1,
    append = false,
    limit?: number,
    sort?: string,
  ) {
    if (!auth.signedIn) {
      borrows.value = [];
      borrowsLoaded.value = true;
      borrowError.value = null;
      return;
    }
    borrowsLoaded.value = false;
    lastBorrowsLimit = limit ?? 3;

    try {
      const res = await $fetch<BorrowsResponse>('/api/user/borrows', {
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

  onInvalidate('borrows', () => fetchBorrows(1, false, lastBorrowsLimit));

  return {
    borrows: readonly(borrows),
    borrowsPage: readonly(borrowsPage),
    borrowsMeta: readonly(borrowsMeta),
    borrowsLoaded: readonly(borrowsLoaded),
    borrowError: readonly(borrowError),
    hasMoreBorrows,
    fetchBorrows,
    loadMoreBorrows,
  };
}


