import type { FeedPost } from '~/composables/useFeed';

export function mapFeedPost(raw: Record<string, unknown>): FeedPost {
  const replies = (raw.replies as Record<string, unknown>[] | undefined) ?? [];
  return {
    id: raw.id as string,
    text: raw.text as string,
    rating: (raw.rating as number | null) ?? null,
    createdAt: raw.createdAt as string,
    user: raw.user as FeedPost['user'],
    likeCount: (raw.likeCount as number) ?? 0,
    replyCount: replies.length,
    replies: replies.map((r) => ({
      name: ((r.user as Record<string, unknown>)?.name as string) ?? 'Unknown',
      text: r.text as string,
    })),
    liked: (raw.likedByUser as boolean) ?? false,
  };
}
