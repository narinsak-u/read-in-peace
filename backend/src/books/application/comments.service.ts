// CommentsService — use cases for the comments subfeature. The
// recordFromComment flow requires a cross-table write (comment + rating) to
// be atomic, which is the one place we open a transaction. The transaction
// boundary still lives in application code — the DrizzleCommentRepository
// takes a `tx` argument and is otherwise unaware of transactions.
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DATABASE, type Database } from '../../core/database/database.provider';
import { COMMENT_REPOSITORY, type CommentRepository } from '../domain/comment';
import { RATING_REPOSITORY, type RatingRepository } from '../domain/engagement';
import type { CreateCommentDto } from '../presentation/dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    @Inject(COMMENT_REPOSITORY) private readonly comments: CommentRepository,
    @Inject(RATING_REPOSITORY) private readonly ratings: RatingRepository,
    @Inject(DATABASE) private readonly db: Database,
  ) {}

  async findByBook(bookId: string, currentUserId?: string) {
    const rows = await this.comments.findByBook(bookId);
    const ids = rows.map((c) => c.id);
    const likeCountMap = await this.comments.countLikesFor(ids);
    const likedByUserMap = currentUserId
      ? await this.comments.likedSetFor(ids, currentUserId)
      : new Map<string, boolean>();

    const attach = (c: (typeof rows)[number]) => ({
      ...c,
      likeCount: likeCountMap.get(c.id) ?? 0,
      likedByUser: likedByUserMap.get(c.id) ?? false,
    });

    const topLevel = rows.filter((c) => !c.parentId);
    const replies = rows.filter((c) => c.parentId);

    return topLevel.map((comment) => ({
      ...attach(comment),
      replies: replies.filter((r) => r.parentId === comment.id).map(attach),
    }));
  }

  async create(bookId: string, userId: string, dto: CreateCommentDto) {
    if (dto.parentId) {
      const parent = await this.comments.findRaw(dto.parentId);
      if (!parent) throw new NotFoundException('Parent comment not found');
      if (parent.bookId !== bookId)
        throw new BadRequestException(
          'Parent comment does not belong to this book',
        );
    }

    if (dto.rating !== undefined && dto.parentId) {
      throw new BadRequestException('Replies cannot include a rating');
    }

    return this.db.transaction(async (tx) => {
      const row = await this.comments.create(
        {
          bookId,
          userId,
          text: dto.text,
          parentId: dto.parentId ?? null,
          rating: dto.rating ?? null,
        },
        tx,
      );

      await this.ratings.recordFromComment(tx, {
        bookId,
        userId,
        rating: dto.rating ?? null,
      });

      const all = await this.comments.findByBook(bookId);
      const withUser = all.find((r) => r.id === row.id);
      if (!withUser)
        throw new NotFoundException('Comment not found after insert');
      return { ...withUser, likeCount: 0, likedByUser: false };
    });
  }

  async remove(commentId: string, userId: string) {
    const comment = await this.comments.findRaw(commentId);
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId)
      throw new ForbiddenException('You can only delete your own comments');
    await this.comments.delete(commentId);
  }

  like(commentId: string, userId: string) {
    return this.comments.like(commentId, userId);
  }

  unlike(commentId: string, userId: string) {
    return this.comments.unlike(commentId, userId);
  }
}
