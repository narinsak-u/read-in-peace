import { ref, shallowRef, readonly, watch, toRef } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useInvalidate } from '~/composables/useInvalidate'
import { mapCommentToReview } from '~/utils/comment'

export interface CommentUser {
  id: string
  name: string
  image: string | null
}

export interface ApiComment {
  id: string
  bookId: string
  userId: string
  parentId: string | null
  text: string
  rating: number | null
  createdAt: string
  updatedAt: string
  likeCount: number
  likedByUser: boolean
  user: CommentUser
  replies?: ApiComment[]
}

export interface Review {
  id: string
  initials: string
  name: string
  time: string
  rating: number
  text: string
  likes: number
  likedByUser: boolean
  readonly replies: readonly string[]
}

export function useBookComments(bookId: string | Ref<string> | (() => string)) {
  const id = toRef(bookId)
  const auth = useAuthStore()
  const { invalidate, onInvalidate } = useInvalidate()

  const reviews = ref<Review[]>([])
  const loading = shallowRef(true)
  const error = shallowRef<unknown>(null)

  async function fetchComments() {
    if (!id.value) {
      loading.value = false
      reviews.value = []
      return
    }
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<ApiComment[]>(`/api/books/${id.value}/comments`)
      reviews.value = data.map(mapCommentToReview)
    } catch (e) {
      error.value = e
      reviews.value = []
    } finally {
      loading.value = false
    }
  }

  async function addComment(text: string, rating?: number) {
    if (!auth.signedIn) throw new Error('not signed in')
    await $fetch<ApiComment>(`/api/books/${id.value}/comments`, {
      method: 'POST',
      body: { text, rating },
    })
    invalidate(`comments:${id.value}`, 'books')
  }

  async function addReply(parentId: string, text: string) {
    if (!auth.signedIn) throw new Error('not signed in')
    await $fetch<ApiComment>(`/api/books/${id.value}/comments`, {
      method: 'POST',
      body: { text, parentId },
    })
    invalidate(`comments:${id.value}`)
  }

  async function toggleLike(commentId: string) {
    if (!auth.signedIn) throw new Error('not signed in')
    const idx = reviews.value.findIndex((r) => r.id === commentId)
    const prevLiked = idx !== -1 ? reviews.value[idx].likedByUser : false
    if (idx !== -1) {
      reviews.value[idx].likedByUser = !prevLiked
      reviews.value[idx].likes += reviews.value[idx].likedByUser ? 1 : -1
    }
    try {
      if (prevLiked) {
        await $fetch(`/api/books/${id.value}/comments/${commentId}/like`, { method: 'DELETE' })
      } else {
        await $fetch(`/api/books/${id.value}/comments/${commentId}/like`, { method: 'POST' })
      }
    } catch {
      if (idx !== -1) {
        reviews.value[idx].likedByUser = prevLiked
        reviews.value[idx].likes += prevLiked ? 1 : -1
      }
      throw new Error('Could not update like')
    }
  }

  watch(id, () => fetchComments(), { immediate: true })
  onInvalidate(`comments:${id.value}`, () => fetchComments())

  return {
    reviews: readonly(reviews),
    loading: readonly(loading),
    error: readonly(error),
    refresh: fetchComments,
    addComment,
    addReply,
    toggleLike,
  }
}
