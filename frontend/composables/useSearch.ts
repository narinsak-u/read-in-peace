import { shallowRef } from "vue";
import type { Ref } from "vue";
import { useDebounceFn } from "@vueuse/core";
import type { Book } from "~/types/book";
import { mapBookResponse } from "~/types/book";

export function useSearch(query: Ref<string>) {
  const results = ref<Book[]>([]);
  const loading = shallowRef(false);

  const debouncedSearch = useDebounceFn(async (q: string) => {
    if (!q.trim()) {
      results.value = [];
      return;
    }
    loading.value = true;
    try {
      const raw = await $fetch<Record<string, unknown>[]>("/api/books/search", {
        query: { q: q.trim() },
      });
      results.value = raw.map(mapBookResponse);
    } catch {
      results.value = [];
    } finally {
      loading.value = false;
    }
  }, 300);

  watch(query, (val) => {
    debouncedSearch(val);
  });

  function clear() {
    results.value = [];
  }

  return { results, loading, clear };
}
