// Reader-feed (post) domain types. The PostWithUser projection is what
// the read model hands to the controller for the feed endpoint.
export interface PostRow {
  id: string;
  userId: string;
  text: string;
  rating: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostReplyRow {
  id: string;
  postId: string;
  userId: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostWithUser extends PostRow {
  user: { id: string; name: string; image: string | null };
  likeCount: number;
  replyCount: number;
  liked?: boolean;
}

export const POST_REPOSITORY = Symbol('POST_REPOSITORY');

export interface PostRepository {
  feed(
    limit: number,
    userId?: string,
  ): Promise<Array<PostWithUser & { liked?: boolean }>>;
  create(userId: string, text: string, rating?: number): Promise<PostRow>;
  findById(postId: string): Promise<{ id: string } | null>;
  toggleLike(
    postId: string,
    userId: string,
  ): Promise<{ liked: boolean; likeCount: number }>;
  isLikedBy(postId: string, userId: string): Promise<boolean>;
  getReplies(postId: string): Promise<
    Array<{
      id: string;
      text: string;
      createdAt: Date;
      user: { id: string; name: string; image: string | null };
    }>
  >;
  createReply(
    postId: string,
    userId: string,
    text: string,
  ): Promise<PostReplyRow>;
}
