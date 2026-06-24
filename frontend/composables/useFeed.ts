import { ref, shallowRef, readonly, watch } from 'vue'
import { useInvalidate } from '~/composables/useInvalidate'
import { useBooks } from '~/composables/useBooks'

export interface FeedUser {
  id: string
  name: string
  image: string | null
}

export interface FeedPost {
  id: string
  text: string
  rating: number | null
  createdAt: string
  user: FeedUser
  likeCount: number
  replyCount: number
  liked?: boolean
}

export function useFeed() {
  const { invalidate, onInvalidate } = useInvalidate()
  const { books: trendingBooks, loading: trendingLoading } = useBooks({ trending: true })

  const posts = ref<FeedPost[]>([])
  const bookSlug = shallowRef('')
  const loading = shallowRef(true)
  const error = shallowRef<unknown>(null)
  const replySubmittingId = shallowRef<string | null>(null)

  async function fetchFeed() {
    loading.value = true
    error.value = null
    try {
      // Wait for trending to load
      if (trendingLoading.value && trendingBooks.value.length === 0) {
        await new Promise<void>((resolve) => {
          const unwatch = watch(trendingLoading, (val) => {
            if (!val) { unwatch(); resolve(); }
          })
        })
      }
      const trending = trendingBooks.value
      if (trending.length === 0) {
        posts.value = []
        bookSlug.value = ''
        return
      }
      const first = trending[0]
      bookSlug.value = first.slug
      const data = await $fetch<FeedPost[]>(`/api/books/${first.id}/comments`)
      posts.value = data.slice(0, 3)
    } catch (e) {
      error.value = e
      posts.value = []
      bookSlug.value = ''
    } finally {
      loading.value = false
    }
  }

  async function toggleLike(postId: string) {
    const idx = posts.value.findIndex((p) => p.id === postId)
    if (idx === -1) return
    const prevLiked = posts.value[idx].liked ?? false
    posts.value[idx].liked = !prevLiked
    posts.value[idx].likeCount += posts.value[idx].liked ? 1 : -1
    try {
      const res = await $fetch<{ liked: boolean; likeCount: number }>(
        `/api/feed/${postId}/like`,
        { method: 'POST' },
      )
      posts.value[idx].liked = res.liked
      posts.value[idx].likeCount = res.likeCount
    } catch {
      posts.value[idx].liked = prevLiked
      posts.value[idx].likeCount += prevLiked ? 1 : -1
      throw new Error('Could not update like')
    }
  }

  async function publishReply(postId: string, text: string): Promise<boolean> {
    if (!text.trim()) return false
    replySubmittingId.value = postId
    try {
      await $fetch(`/api/feed/${postId}/reply`, {
        method: 'POST',
        body: { text: text.trim() },
      })
      invalidate('feed')
      return true
    } catch {
      return false
    } finally {
      replySubmittingId.value = null
    }
  }

  onInvalidate('feed', () => fetchFeed())
  fetchFeed()

  return {
    posts: readonly(posts),
    bookSlug: readonly(bookSlug),
    loading: readonly(loading),
    error: readonly(error),
    replySubmittingId: readonly(replySubmittingId),
    refresh: fetchFeed,
    toggleLike,
    publishReply,
  }
}
