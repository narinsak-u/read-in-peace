// Comment domain types. Kept independent from the database schema for the
// same reason as BookRow — the schema's row type is a Drizzle concern that
// the application layer should not depend on.
import type { DatabaseOrTransaction } from '../../core/database/database.provider';

export interface CommentRow {
  id: string;
  bookId: string;
  userId: string;
  parentId: string | null;
  text: string;
  rating: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewComment {
  bookId: string;
  userId: string;
  parentId?: string | null;
  text: string;
  rating?: number | null;
}

export interface CommentWithUser extends CommentRow {
  user: { id: string; name: string; image: string | null };
}

export const COMMENT_REPOSITORY = Symbol('COMMENT_REPOSITORY');

export interface CommentRepository {
  findByBook(bookId: string): Promise<CommentWithUser[]>;
  findById(commentId: string): Promise<CommentWithUser | null>;
  findRaw(commentId: string): Promise<CommentRow | null>;
  create(data: NewComment, tx?: DatabaseOrTransaction): Promise<CommentRow>;
  delete(commentId: string): Promise<void>;
  countLikesFor(commentIds: string[]): Promise<Map<string, number>>;
  likedSetFor(
    commentIds: string[],
    userId: string,
  ): Promise<Map<string, boolean>>;
  like(
    commentId: string,
    userId: string,
  ): Promise<{ liked: true; likeCount: number }>;
  unlike(
    commentId: string,
    userId: string,
  ): Promise<{ liked: false; likeCount: number }>;
}
