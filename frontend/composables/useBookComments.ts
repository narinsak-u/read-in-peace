import { ref, shallowRef, readonly, watch, toRef } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useInvalidate } from '~/composables/useInvalidate'

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

function getInitials(name: string): string {
  return name.toUpperCase().slice(0, 2)
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

function mapCommentToReview(comment: ApiComment): Review {
  return {
    id: comment.id,
    initials: getInitials(comment.user.name),
    name: comment.user.name,
    time: timeAgo(comment.createdAt),
    rating: comment.rating ?? 0,
    text: comment.text,
    likes: comment.likeCount ?? 0,
    likedByUser: comment.likedByUser,
    replies: (comment.replies ?? []).map((r) => `${r.text} — ${r.user.name}`),
  }
}

export function useBookComments(bookId: string | Ref<string> | (() => string)) {
  const id = toRef(bookId)
  const auth = useAuthStore()
  const { invalidate, onInvalidate } = useInvalidate()

  const reviews = ref<Review[]>([])
  const loading = shallowRef(true)
  const error = shallowRef<unknown>(null)

  async function fetchComments() {
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
    if (idx === -1) return
    const prevLiked = reviews.value[idx].likedByUser
    reviews.value[idx].likedByUser = !prevLiked
    reviews.value[idx].likes += reviews.value[idx].likedByUser ? 1 : -1
    try {
      if (prevLiked) {
        await $fetch(`/api/books/${id.value}/comments/${commentId}/like`, { method: 'DELETE' })
      } else {
        await $fetch(`/api/books/${id.value}/comments/${commentId}/like`, { method: 'POST' })
      }
    } catch {
      reviews.value[idx].likedByUser = prevLiked
      reviews.value[idx].likes += prevLiked ? 1 : -1
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
