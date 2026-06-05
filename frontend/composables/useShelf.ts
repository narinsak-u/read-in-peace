import { shallowRef, computed, watch, onMounted } from 'vue';
import { useBooksStore } from '~/stores/books';

export function useShelf() {
  const booksStore = useBooksStore();

  const page = shallowRef(1);
  const activeCategory = shallowRef('All');
  const categories = shallowRef<string[]>(['All']);

  const totalPages = computed(() => booksStore.meta.totalPages);

  watch([page, activeCategory], async ([p, cat], _prev, onCleanup) => {
    let cancelled = false;
    onCleanup(() => { cancelled = true; });

    await booksStore.fetchBooks(p, 12, cat === 'All' ? undefined : cat);

    if (cancelled) return;
  });

  onMounted(async () => {
    await Promise.all([
      booksStore.fetchTrending(),
      booksStore.fetchBooks(1, 12),
    ]);
    const cats = [...new Set(booksStore.books.map((b) => b.category))];
    categories.value = ['All', ...cats];
  });

  function setPage(p: number) {
    page.value = p;
  }

  function setCategory(cat: string) {
    activeCategory.value = cat;
    page.value = 1;
  }

  return {
    page,
    activeCategory,
    categories,
    totalPages,
    setPage,
    setCategory,
  };
}
