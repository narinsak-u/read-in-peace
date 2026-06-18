export const BOOK_REPO = Symbol('BOOK_REPO');
export const COMMENT_REPO = Symbol('COMMENT_REPO');
export const RATING_REPO = Symbol('RATING_REPO');
export const LIKE_REPO = Symbol('LIKE_REPO');
export const BORROW_REPO = Symbol('BORROW_REPO');
export const PURCHASE_REPO = Symbol('PURCHASE_REPO');
export const POST_REPO = Symbol('POST_REPO');
export const GOAL_REPO = Symbol('GOAL_REPO');
export const BOOK_READ_MODEL = Symbol('BOOK_READ_MODEL');

export type {
  BookPricing,
  BookRepository,
  BookReadModel,
  BookRow,
  NewBook,
  UpdateBook,
} from './interfaces/book.repository';
export type {
  CommentRepository,
  CommentRow,
  CommentWithUser,
  NewComment,
} from './interfaces/comment.repository';
export type { RatingRepository } from './interfaces/rating.repository';
export type { LikeRepository } from './interfaces/like.repository';
export type {
  BorrowRepository,
  BorrowRow,
  BorrowWithBook,
} from './interfaces/borrow.repository';
export type {
  PurchaseRepository,
  PurchaseRow,
} from './interfaces/purchase.repository';
export type {
  PostRepository,
  PostRow,
  PostWithUser,
} from './interfaces/post.repository';
export type {
  ReadingGoalRepository,
  ReadingGoalRow,
} from './interfaces/goal.repository';
export type { Paginated } from './paginated';
