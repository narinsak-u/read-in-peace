import { ref, shallowRef, readonly, watch, toRef } from 'vue'
import type { Book } from '~/types/book'
import { mapBookResponse } from '~/types/book'
import { useAuthStore } from '~/stores/auth'
import { useInvalidate } from '~/composables/useInvalidate'

export function useBook(bookId: string | Ref<string>) {
  const id = toRef(bookId)
  const auth = useAuthStore()
  const { invalidate, onInvalidate } = useInvalidate()

  const book = ref<Book | null>(null)
  const liked = shallowRef(false)
  const likeCount = shallowRef(0)
  const userRating = shallowRef<number | null>(null)
  const loading = shallowRef(true)
  const error = shallowRef<unknown>(null)

  async function fetch() {
    loading.value = true; error.value = null
    try {
      const raw = await $fetch<Record<string, unknown>>(`/api/books/${id.value}`)
      book.value = mapBookResponse(raw)
      if (auth.signedIn) {
        try {
          const likeRes = await $fetch<{ liked: boolean }>(`/api/books/${id.value}/like`)
          liked.value = likeRes.liked
          const ratingRes = await $fetch<number | null>(`/api/books/${id.value}/rate`)
          userRating.value = ratingRes
        } catch { /* not authenticated */ }
      }
    } catch (e) { error.value = e; book.value = null }
    finally { loading.value = false }
  }

  async function toggleLike() {
    if (!auth.signedIn) { auth.openAuthModal(() => { void toggleLike() }); return }
    const prevLiked = liked.value; const prevCount = likeCount.value
    liked.value = !liked.value; likeCount.value += liked.value ? 1 : -1
    try {
      const res = await $fetch<{ liked: boolean; likeCount: number }>(`/api/books/${id.value}/like`, { method: 'POST' })
      liked.value = res.liked; likeCount.value = res.likeCount
      invalidate('books')
    } catch { liked.value = prevLiked; likeCount.value = prevCount }
  }

  async function setRating(rating: number) {
    if (!auth.signedIn) { auth.openAuthModal(() => { void setRating(rating) }); return }
    await $fetch(`/api/books/${id.value}/rate`, { method: 'POST', body: { rating } })
    userRating.value = rating; invalidate('books')
  }

  watch(id, () => fetch(), { immediate: true })
  onInvalidate(`book:${id.value}`, () => fetch())

  return {
    book: readonly(book), liked: readonly(liked), likeCount: readonly(likeCount),
    userRating, loading: readonly(loading), error: readonly(error),
    refresh: fetch, toggleLike, setRating,
  }
}
