import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../../core/database/database.provider';
import * as schema from '../../core/database/schema';
import type {
  PostRepository,
  PostReplyRow,
  PostRow,
  PostWithUser,
} from '../domain/post';

@Injectable()
export class DrizzlePostRepository implements PostRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async feed(
    limit: number,
    userId?: string,
  ): Promise<Array<PostWithUser & { liked?: boolean }>> {
    const rows = (await this.db
      .select({
        id: schema.posts.id,
        text: schema.posts.text,
        rating: schema.posts.rating,
        createdAt: schema.posts.createdAt,
        user: {
          id: schema.user.id,
          name: schema.user.name,
          image: schema.user.image,
        },
        likeCount: sql<number>`(SELECT COUNT(*) FROM ${schema.postLikes} WHERE ${schema.postLikes.postId} = ${schema.posts.id})`,
        replyCount: sql<number>`(SELECT COUNT(*) FROM ${schema.postReplies} WHERE ${schema.postReplies.postId} = ${schema.posts.id})`,
      })
      .from(schema.posts)
      .innerJoin(schema.user, eq(schema.posts.userId, schema.user.id))
      .orderBy(desc(schema.posts.createdAt))
      .limit(limit)) as PostWithUser[];

    if (!userId) {
      return rows.map((p) => ({ ...p, liked: false }));
    }
    const likedPosts = await this.db
      .select({ postId: schema.postLikes.postId })
      .from(schema.postLikes)
      .where(eq(schema.postLikes.userId, userId));
    const likedSet = new Set(likedPosts.map((l) => l.postId));
    return rows.map((p) => ({ ...p, liked: likedSet.has(p.id) }));
  }

  async create(
    userId: string,
    text: string,
    rating?: number,
  ): Promise<PostRow> {
    const [row] = await this.db
      .insert(schema.posts)
      .values({ userId, text, rating: rating ?? null })
      .returning();
    return row;
  }

  async findById(postId: string): Promise<{ id: string } | null> {
    const [row] = await this.db
      .select({ id: schema.posts.id })
      .from(schema.posts)
      .where(eq(schema.posts.id, postId));
    return row ?? null;
  }

  async toggleLike(
    postId: string,
    userId: string,
  ): Promise<{ liked: boolean; likeCount: number }> {
    const [existing] = await this.db
      .select()
      .from(schema.postLikes)
      .where(
        and(
          eq(schema.postLikes.postId, postId),
          eq(schema.postLikes.userId, userId),
        ),
      );

    if (existing) {
      await this.db
        .delete(schema.postLikes)
        .where(
          and(
            eq(schema.postLikes.postId, postId),
            eq(schema.postLikes.userId, userId),
          ),
        );
    } else {
      await this.db.insert(schema.postLikes).values({ postId, userId });
    }

    const [result] = await this.db
      .select({ value: count() })
      .from(schema.postLikes)
      .where(eq(schema.postLikes.postId, postId));

    return { liked: !existing, likeCount: Number(result?.value ?? 0) };
  }

  async isLikedBy(postId: string, userId: string): Promise<boolean> {
    const [row] = await this.db
      .select()
      .from(schema.postLikes)
      .where(
        and(
          eq(schema.postLikes.postId, postId),
          eq(schema.postLikes.userId, userId),
        ),
      );
    return !!row;
  }

  async getReplies(postId: string) {
    return this.db
      .select({
        id: schema.postReplies.id,
        text: schema.postReplies.text,
        createdAt: schema.postReplies.createdAt,
        user: {
          id: schema.user.id,
          name: schema.user.name,
          image: schema.user.image,
        },
      })
      .from(schema.postReplies)
      .innerJoin(schema.user, eq(schema.postReplies.userId, schema.user.id))
      .where(eq(schema.postReplies.postId, postId))
      .orderBy(schema.postReplies.createdAt);
  }

  async createReply(
    postId: string,
    userId: string,
    text: string,
  ): Promise<PostReplyRow> {
    const [row] = await this.db
      .insert(schema.postReplies)
      .values({ postId, userId, text })
      .returning();
    return row;
  }
}
