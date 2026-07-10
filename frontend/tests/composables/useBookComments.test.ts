import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getInitials, timeAgo, mapCommentToReview } from '~/utils/comment'
import type { ApiComment } from '~/composables/useBookComments'

describe('getInitials', () => {
  it('returns first 2 uppercase characters for full name', () => {
    expect(getInitials('Alice')).toBe('AL')
  })

  it('returns first 2 chars for single name', () => {
    expect(getInitials('Jo')).toBe('JO')
  })

  it('handles empty string', () => {
    expect(getInitials('')).toBe('')
  })

  it('converts lowercase to uppercase', () => {
    expect(getInitials('alice')).toBe('AL')
  })
})

describe('timeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-04T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "just now" for < 60 seconds', () => {
    const now = new Date()
    expect(timeAgo(now.toISOString())).toBe('just now')
  })

  it('returns "Xm ago" for < 60 minutes', () => {
    const past = new Date(Date.now() - 5 * 60 * 1000)
    expect(timeAgo(past.toISOString())).toBe('5m ago')
  })

  it('returns "Xh ago" for < 24 hours', () => {
    const past = new Date(Date.now() - 3 * 60 * 60 * 1000)
    expect(timeAgo(past.toISOString())).toBe('3h ago')
  })

  it('returns "Yesterday" for 24-48 hours', () => {
    const past = new Date(Date.now() - 25 * 60 * 60 * 1000)
    expect(timeAgo(past.toISOString())).toBe('Yesterday')
  })

  it('returns "Xd ago" for 2+ days', () => {
    const past = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    expect(timeAgo(past.toISOString())).toBe('5d ago')
  })
})

describe('mapCommentToReview', () => {
  it('maps a complete ApiComment to Review', () => {
    const comment = {
      id: 'c1',
      bookId: 'b1',
      userId: 'u1',
      parentId: null,
      text: 'Great book!',
      rating: 5,
      createdAt: '2026-07-01T12:00:00Z',
      updatedAt: '2026-07-01T12:00:00Z',
      likeCount: 10,
      likedByUser: true,
      user: { id: 'u1', name: 'Alice', image: null },
      replies: [
        {
          id: 'r1', bookId: 'b1', userId: 'u2', parentId: 'c1',
          text: 'I agree!', rating: null, createdAt: '', updatedAt: '',
          likeCount: 0, likedByUser: false,
          user: { id: 'u2', name: 'Bob', image: null },
        },
      ],
    } as ApiComment

    const review = mapCommentToReview(comment)
    expect(review.id).toBe('c1')
    expect(review.initials).toBe('AL')
    expect(review.name).toBe('Alice')
    expect(review.text).toBe('Great book!')
    expect(review.rating).toBe(5)
    expect(review.likes).toBe(10)
    expect(review.likedByUser).toBe(true)
    expect(review.replies).toEqual([{ userId: 'u2', name: 'Bob', text: 'I agree!' }])
  })

  it('handles null rating', () => {
    const comment = {
      id: 'c1', bookId: 'b1', userId: 'u1', parentId: null,
      text: 'OK', rating: null, createdAt: '', updatedAt: '',
      likeCount: 0, likedByUser: false,
      user: { id: 'u1', name: 'Test', image: null },
    } as ApiComment
    expect(mapCommentToReview(comment).rating).toBe(0)
  })

  it('handles no replies', () => {
    const comment = {
      id: 'c1', bookId: 'b1', userId: 'u1', parentId: null,
      text: 'OK', rating: null, createdAt: '', updatedAt: '',
      likeCount: 0, likedByUser: false,
      user: { id: 'u1', name: 'Test', image: null },
    } as ApiComment
    expect(mapCommentToReview(comment).replies).toEqual([])
  })
})
