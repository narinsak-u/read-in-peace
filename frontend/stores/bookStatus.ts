import { defineStore } from "pinia";
import { shallowRef, watch } from "vue";
import { useAuthStore } from "~/stores/auth";
import { useMembershipStore } from "~/stores/membership";
import { useInvalidate } from "~/composables/useInvalidate";

export const useBookStatusStore = defineStore("bookStatus", () => {
  const auth = useAuthStore();
  const { invalidate, onInvalidate } = useInvalidate();

  const borrowedSlugs = shallowRef<Set<string>>(new Set());
  const purchasedCounts = shallowRef<Map<string, number>>(new Map());
  const loaded = shallowRef(false);

  async function init() {
    if (!auth.signedIn) {
      borrowedSlugs.value = new Set();
      purchasedCounts.value = new Map();
      loaded.value = true;
      return;
    }
    loaded.value = false;
    try {
      const [borrowsRes, purchases] = await Promise.all([
        $fetch<{
          data: {
            borrow: Record<string, unknown>;
            book: Record<string, unknown>;
          }[];
        }>("/api/user/borrows", { query: { page: 1, limit: 100 } }),
        $fetch<
          {
            purchase: Record<string, unknown>;
            book: Record<string, unknown>;
          }[]
        >("/api/user/purchases"),
      ]);
      borrowedSlugs.value = new Set(
        borrowsRes.data.map(
          (b) => (b.book.slug as string) ?? (b.book.id as string),
        ),
      );
      const counts = new Map<string, number>();
      for (const entry of purchases) {
        const id = (entry.book.id as string) ?? (entry.book.slug as string);
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
      purchasedCounts.value = counts;
    } catch {
      borrowedSlugs.value = new Set();
      purchasedCounts.value = new Map();
    } finally {
      loaded.value = true;
    }
  }

  async function borrow(bookId: string, slug: string) {
    await $fetch(`/api/books/${bookId}/borrow`, { method: "POST" });
    borrowedSlugs.value = new Set([...borrowedSlugs.value, slug]);
    invalidate("borrows", "books");
    useMembershipStore().fetchMembership();
  }

  async function returnBook(bookId: string, slug: string) {
    await $fetch(`/api/books/${bookId}/return`, { method: "POST" });
    const next = new Set(borrowedSlugs.value);
    next.delete(slug);
    borrowedSlugs.value = next;
    invalidate("borrows", "books");
    useMembershipStore().fetchMembership();
  }

  async function refreshPurchases() {
    if (!auth.signedIn) {
      purchasedCounts.value = new Map();
      return;
    }
    try {
      const purchases = await $fetch<
        {
          purchase: Record<string, unknown>;
          book: Record<string, unknown>;
        }[]
      >("/api/user/purchases");
      const counts = new Map<string, number>();
      for (const entry of purchases) {
        const id = (entry.book.id as string) ?? (entry.book.slug as string);
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
      purchasedCounts.value = counts;
    } catch {
      // keep existing
    }
  }

  function clear() {
    borrowedSlugs.value = new Set();
    purchasedCounts.value = new Map();
    loaded.value = true;
  }

  watch(
    () => auth.signedIn,
    (val) => {
      if (val) {
        init();
      } else {
        clear();
      }
    },
    { immediate: true },
  );

  onInvalidate("purchases", () => refreshPurchases());

  return {
    borrowedSlugs,
    purchasedCounts,
    loaded,
    init,
    borrow,
    returnBook,
    refreshPurchases,
    clear,
  };
});
