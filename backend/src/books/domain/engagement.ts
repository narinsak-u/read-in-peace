// Book-level likes and ratings are part of the books feature: a like is
// always on a book, a rating is always of a book. Co-locating the
// repositories here keeps related read/write paths together.
import type { DatabaseOrTransaction } from '../../core/database/database.provider';

export const LIKE_REPOSITORY = Symbol('LIKE_REPOSITORY');

export interface LikeRepository {
  isLikedBy(bookId: string, userId: string): Promise<boolean>;
  toggle(
    bookId: string,
    userId: string,
  ): Promise<{ liked: boolean; likeCount: number }>;
}

export const RATING_REPOSITORY = Symbol('RATING_REPOSITORY');

export interface RatingRepository {
  findUserRating(bookId: string, userId: string): Promise<number | null>;
  upsert(bookId: string, userId: string, rating: number): Promise<void>;
  recordFromComment(
    tx: DatabaseOrTransaction,
    input: { bookId: string; userId: string; rating: number | null },
  ): Promise<void>;
  getAvgForBook(bookId: string): Promise<number | null>;
}
