import { ref, shallowRef, computed, readonly, watch } from 'vue'
import type { Book } from '~/types/book'
import { mapBookResponse } from '~/types/book'
import { useAuthStore } from '~/stores/auth'
import { useInvalidate } from '~/composables/useInvalidate'
import { useBorrows } from '~/composables/useBorrows'

export function useBooks(options?: {
  page?: Ref<number> | number
  limit?: Ref<number> | number
  category?: Ref<string | undefined> | string | undefined
  query?: Ref<string> | string
}) {
  const { invalidate, onInvalidate } = useInvalidate()
  const auth = useAuthStore()
  const { borrowedSlugs } = useBorrows()

  const page = ref(options?.page ?? 1)
  const limit = ref(options?.limit ?? 8)
  const category = ref<string | undefined>(options?.category ?? undefined)
  const query = ref(options?.query ?? '')

  const rawPage = ref<{ data: Record<string, unknown>[]; meta: { page: number; limit: number; total: number; totalPages: number } } | null>(null)
  const loading = shallowRef(true)
  const error = shallowRef<unknown>(null)

  async function fetch() {
    loading.value = true
    error.value = null
    try {
      rawPage.value = await $fetch('/api/books', {
        query: { page: page.value, limit: limit.value, category: category.value },
      })
    } catch (e) {
      error.value = e
      rawPage.value = null
    } finally {
      loading.value = false
    }
  }

  const books = computed<Book[]>(() => {
    if (!rawPage.value?.data) return []
    return rawPage.value.data.map(mapBookResponse)
  })

  const meta = computed(() => rawPage.value?.meta ?? null)

  const filtered = computed(() => {
    const q = query.value.toLowerCase().trim()
    if (!q) return books.value
    return books.value.filter((b) =>
      `${b.title} ${b.author}`.toLowerCase().includes(q),
    )
  })

  const pageNumbers = computed(() => {
    const total = meta.value?.totalPages ?? 1
    const current = page.value
    const pages: number[] = []
    const start = Math.max(1, current - 2)
    const end = Math.min(total, current + 2)
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
  })

  async function borrow(slug: string, bookId: string) {
    if (!auth.signedIn) throw new Error('not signed in')
    const { borrowBook } = useBorrows()
    await borrowBook(bookId, slug)
    invalidate('books')
  }

  async function returnBook(slug: string, bookId: string) {
    const { returnBook: ret } = useBorrows()
    await ret(bookId, slug)
    invalidate('books')
  }

  watch([page, category], () => fetch(), { immediate: true })
  onInvalidate('books', () => fetch())
  onInvalidate('borrows', () => fetch())

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
    borrow,
    return: returnBook,
  }
}
