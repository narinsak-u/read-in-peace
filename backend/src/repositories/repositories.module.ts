import { Global, Module } from '@nestjs/common';
import {
  DrizzleBookRepository,
  bookRepoProvider,
} from './drizzle/drizzle-book.repository';
import {
  DrizzleBookReadModel,
  bookReadModelProvider,
} from './drizzle/drizzle-book-read.model';
import {
  DrizzleCommentRepository,
  commentRepoProvider,
} from './drizzle/drizzle-comment.repository';
import {
  DrizzleRatingRepository,
  ratingRepoProvider,
} from './drizzle/drizzle-rating.repository';
import {
  DrizzleLikeRepository,
  likeRepoProvider,
} from './drizzle/drizzle-like.repository';
import {
  DrizzleBorrowRepository,
  borrowRepoProvider,
} from './drizzle/drizzle-borrow.repository';
import {
  DrizzlePurchaseRepository,
  purchaseRepoProvider,
} from './drizzle/drizzle-purchase.repository';
import {
  DrizzlePostRepository,
  postRepoProvider,
} from './drizzle/drizzle-post.repository';
import {
  DrizzleGoalRepository,
  goalRepoProvider,
} from './drizzle/drizzle-goal.repository';

@Global()
@Module({
  providers: [
    DrizzleBookRepository,
    DrizzleBookReadModel,
    DrizzleCommentRepository,
    DrizzleRatingRepository,
    DrizzleLikeRepository,
    DrizzleBorrowRepository,
    DrizzlePurchaseRepository,
    DrizzlePostRepository,
    DrizzleGoalRepository,
    bookRepoProvider,
    bookReadModelProvider,
    commentRepoProvider,
    ratingRepoProvider,
    likeRepoProvider,
    borrowRepoProvider,
    purchaseRepoProvider,
    postRepoProvider,
    goalRepoProvider,
  ],
  exports: [
    bookRepoProvider,
    bookReadModelProvider,
    commentRepoProvider,
    ratingRepoProvider,
    likeRepoProvider,
    borrowRepoProvider,
    purchaseRepoProvider,
    postRepoProvider,
    goalRepoProvider,
  ],
})
export class RepositoriesModule {}
