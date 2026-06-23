import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import {
  DATABASE,
  type Database,
  type DatabaseOrTransaction,
} from '../../core/database/database.provider';
import * as schema from '../../core/database/schema';
import type {
  CommentRepository,
  CommentWithUser,
  NewComment,
} from '../domain/comment';

// Shape of a row as it lives in the database. Drizzle returns this from
// `select()` without a column whitelist. The application layer expects
// `CommentRow` from the domain — both shapes are structurally identical.
type CommentRowFromSchema = typeof schema.comments.$inferSelect;

@Injectable()
export class DrizzleCommentRepository implements CommentRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findByBook(bookId: string): Promise<CommentWithUser[]> {
    return this.db
      .select({
        id: schema.comments.id,
        bookId: schema.comments.bookId,
        userId: schema.comments.userId,
        parentId: schema.comments.parentId,
        text: schema.comments.text,
        rating: schema.comments.rating,
        createdAt: schema.comments.createdAt,
        updatedAt: schema.comments.updatedAt,
        user: {
          id: schema.user.id,
          name: schema.user.name,
          image: schema.user.image,
        },
      })
      .from(schema.comments)
      .innerJoin(schema.user, eq(schema.comments.userId, schema.user.id))
      .where(eq(schema.comments.bookId, bookId))
      .orderBy(schema.comments.createdAt);
  }

  async findById(commentId: string): Promise<CommentWithUser | null> {
    const [row] = await this.db
      .select({
        id: schema.comments.id,
        bookId: schema.comments.bookId,
        userId: schema.comments.userId,
        parentId: schema.comments.parentId,
        text: schema.comments.text,
        rating: schema.comments.rating,
        createdAt: schema.comments.createdAt,
        updatedAt: schema.comments.updatedAt,
        user: {
          id: schema.user.id,
          name: schema.user.name,
          image: schema.user.image,
        },
      })
      .from(schema.comments)
      .innerJoin(schema.user, eq(schema.comments.userId, schema.user.id))
      .where(eq(schema.comments.id, commentId));
    return row ?? null;
  }

  async findRaw(commentId: string) {
    const [row] = await this.db
      .select()
      .from(schema.comments)
      .where(eq(schema.comments.id, commentId));
    return (row as CommentRowFromSchema | undefined) ?? null;
  }

  async create(data: NewComment, tx?: DatabaseOrTransaction) {
    const db = tx ?? this.db;
    const [row] = await db.insert(schema.comments).values(data).returning();
    return row;
  }

  async delete(commentId: string): Promise<void> {
    await this.db
      .delete(schema.comments)
      .where(eq(schema.comments.id, commentId));
  }

  async countLikesFor(commentIds: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (commentIds.length === 0) return map;
    const rows = await this.db
      .select({ commentId: schema.commentLikes.commentId })
      .from(schema.commentLikes)
      .where(inArray(schema.commentLikes.commentId, commentIds));
    for (const id of commentIds) {
      map.set(id, rows.filter((r) => r.commentId === id).length);
    }
    return map;
  }

  async likedSetFor(
    commentIds: string[],
    userId: string,
  ): Promise<Map<string, boolean>> {
    const map = new Map<string, boolean>();
    if (commentIds.length === 0) return map;
    const rows = await this.db
      .select({ commentId: schema.commentLikes.commentId })
      .from(schema.commentLikes)
      .where(
        and(
          inArray(schema.commentLikes.commentId, commentIds),
          eq(schema.commentLikes.userId, userId),
        ),
      );
    const liked = new Set(rows.map((r) => r.commentId));
    for (const id of commentIds) {
      map.set(id, liked.has(id));
    }
    return map;
  }

  async like(
    commentId: string,
    userId: string,
  ): Promise<{ liked: true; likeCount: number }> {
    await this.db
      .insert(schema.commentLikes)
      .values({ commentId, userId })
      .onConflictDoNothing();
    const count = (await this.countLikesFor([commentId])).get(commentId) ?? 0;
    return { liked: true, likeCount: count };
  }

  async unlike(
    commentId: string,
    userId: string,
  ): Promise<{ liked: false; likeCount: number }> {
    await this.db
      .delete(schema.commentLikes)
      .where(
        and(
          eq(schema.commentLikes.commentId, commentId),
          eq(schema.commentLikes.userId, userId),
        ),
      );
    const count = (await this.countLikesFor([commentId])).get(commentId) ?? 0;
    return { liked: false, likeCount: count };
  }
}
