import { ref, shallowRef, computed, readonly, watch, toValue } from "vue";
import type { Book } from "~/types/book";
import { mapBookResponse } from "~/types/book";
import { useInvalidate } from "~/composables/useInvalidate";

export function useBooks(options?: {
  page?: Ref<number> | number;
  limit?: Ref<number> | number;
  category?: Ref<string | undefined> | string | undefined;
  query?: Ref<string> | string;
  trending?: boolean;
}) {
  const { onInvalidate } = useInvalidate();

  const trendingMode = options?.trending ?? false;
  const page = ref(options?.page ?? 1);
  const limit = ref(options?.limit ?? 8);
  const category = ref<string | undefined>(toValue(options?.category));
  const query = ref(options?.query ?? "");

  const rawPage = ref<{
    data: Record<string, unknown>[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  } | null>(null);
  const rawTrending = shallowRef<Record<string, unknown>[]>([]);
  const loading = shallowRef(true);
  const error = shallowRef<unknown>(null);

  // fetch books based on trending mode
  // if trending mode is enabled, fetch trending books; otherwise, fetch regular books
  async function fetch() {
    loading.value = true;
    error.value = null;
    try {
      if (trendingMode) {
        rawTrending.value = await $fetch<Record<string, unknown>[]>(
          "/api/books/trending",
        );
      } else {
        rawPage.value = await $fetch<{
          data: Record<string, unknown>[];
          meta: { page: number; limit: number; total: number; totalPages: number };
        }>("/api/books", {
          query: {
            page: page.value,
            limit: limit.value,
            category: category.value,
          },
        });
      }
    } catch (e) {
      error.value = e;
      rawPage.value = null;
      rawTrending.value = [];
    } finally {
      loading.value = false;
    }
  }

  const books = computed<Book[]>(() => {
    if (trendingMode) {
      if (rawTrending.value.length === 0) return [];
      return rawTrending.value.map(mapBookResponse);
    }
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

  const pageNumbers = computed(() => {
    const total = meta.value?.totalPages ?? 1;
    const current = page.value;
    const pages: number[] = [];
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  });

  if (trendingMode) {
    fetch();
  } else {
    watch([page, category], () => fetch(), { immediate: true });
  }
  onInvalidate("books", () => fetch());
  onInvalidate("borrows", () => fetch());

  return {
    books: readonly(books),
    filtered: readonly(filtered),
    meta,
    pageNumbers,
    page,
    category,
    query,
    loading: readonly(loading),
    error: readonly(error),
    refresh: fetch,
  };
}
