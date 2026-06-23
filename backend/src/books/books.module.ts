// Books feature module. Imports IamModule to receive AuthGuard,
// OptionalAuthGuard, CurrentUser, and the policies guard/decorator framework
// (no @Global needed because we explicitly import here). Binds its own
// repository implementations to its own domain tokens, and its own policy
// implementations to its own CAN_* tokens.
import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { DrizzleBookRepository } from './infrastructure/drizzle-book.repository';
import { DrizzleBookReadModel } from './infrastructure/drizzle-book-read.model';
import { DrizzleCommentRepository } from './infrastructure/drizzle-comment.repository';
import { DrizzleLikeRepository } from './infrastructure/drizzle-like.repository';
import { DrizzleRatingRepository } from './infrastructure/drizzle-rating.repository';
import { BOOK_READ_MODEL, BOOK_REPOSITORY } from './domain/book.repository';
import { COMMENT_REPOSITORY } from './domain/comment';
import { LIKE_REPOSITORY, RATING_REPOSITORY } from './domain/engagement';
import { BooksService } from './application/books.service';
import { CommentsService } from './application/comments.service';
import { BooksController } from './presentation/books.controller';
import { CommentsController } from './presentation/comments.controller';
import { EditBookPolicy } from './authorization/edit-book.policy';
import { DeleteBookPolicy } from './authorization/delete-book.policy';
import { DeleteCommentPolicy } from './authorization/delete-comment.policy';
import {
  CAN_DELETE_BOOK,
  CAN_DELETE_COMMENT,
  CAN_EDIT_BOOK,
} from './authorization/policy.tokens';

const alias = (token: string | symbol, impl: unknown) => ({
  provide: token,
  useExisting: impl,
});

@Module({
  imports: [IamModule],
  controllers: [BooksController, CommentsController],
  providers: [
    DrizzleBookRepository,
    DrizzleBookReadModel,
    DrizzleCommentRepository,
    DrizzleLikeRepository,
    DrizzleRatingRepository,
    BooksService,
    CommentsService,
    EditBookPolicy,
    DeleteBookPolicy,
    DeleteCommentPolicy,
    alias(BOOK_REPOSITORY, DrizzleBookRepository),
    alias(BOOK_READ_MODEL, DrizzleBookReadModel),
    alias(COMMENT_REPOSITORY, DrizzleCommentRepository),
    alias(LIKE_REPOSITORY, DrizzleLikeRepository),
    alias(RATING_REPOSITORY, DrizzleRatingRepository),
    alias(CAN_EDIT_BOOK, EditBookPolicy),
    alias(CAN_DELETE_BOOK, DeleteBookPolicy),
    alias(CAN_DELETE_COMMENT, DeleteCommentPolicy),
  ],
  exports: [
    BooksService,
    CommentsService,
    BOOK_REPOSITORY,
    COMMENT_REPOSITORY,
    LIKE_REPOSITORY,
    RATING_REPOSITORY,
    BOOK_READ_MODEL,
  ],
})
export class BooksModule {}
