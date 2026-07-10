export function getInitials(name: string): string {
  return name.toUpperCase().slice(0, 2);
}

export function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

export function mapCommentToReview(
  comment: import('~/composables/useBookComments').ApiComment,
): import('~/composables/useBookComments').Review {
  return {
    id: comment.id,
    userId: comment.user.id,
    initials: getInitials(comment.user.name),
    name: comment.user.name,
    time: timeAgo(comment.createdAt),
    rating: comment.rating ?? 0,
    text: comment.text,
    likes: comment.likeCount ?? 0,
    likedByUser: comment.likedByUser,
    replies: (comment.replies ?? []).map((r) => ({
      userId: r.user.id,
      name: r.user.name,
      text: r.text,
    })),
  };
}
