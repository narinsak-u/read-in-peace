import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq, and, count, desc, sql } from 'drizzle-orm';

@Injectable()
export class SocialService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async getFeed(userId?: string) {
    const feed = await this.db
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
      .limit(20);

    if (userId) {
      const likedPosts = await this.db
        .select({ postId: schema.postLikes.postId })
        .from(schema.postLikes)
        .where(eq(schema.postLikes.userId, userId));
      const likedSet = new Set(likedPosts.map((l) => l.postId));
      return feed.map((p) => ({ ...p, liked: likedSet.has(p.id) }));
    }

    return feed.map((p) => ({ ...p, liked: false }));
  }

  async createPost(userId: string, text: string, rating?: number) {
    const [post] = await this.db
      .insert(schema.posts)
      .values({ userId, text, rating: rating ?? null })
      .returning();
    return post;
  }

  async toggleLike(postId: string, userId: string) {
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
      await this.db
        .insert(schema.postLikes)
        .values({ postId, userId });
    }

    const [result] = await this.db
      .select({ count: count() })
      .from(schema.postLikes)
      .where(eq(schema.postLikes.postId, postId));

    return { liked: !existing, likeCount: result.count };
  }

  async getLikeStatus(postId: string, userId: string) {
    const [existing] = await this.db
      .select()
      .from(schema.postLikes)
      .where(
        and(
          eq(schema.postLikes.postId, postId),
          eq(schema.postLikes.userId, userId),
        ),
      );
    return { liked: !!existing };
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

  async createReply(postId: string, userId: string, text: string) {
    const [post] = await this.db
      .select({ id: schema.posts.id })
      .from(schema.posts)
      .where(eq(schema.posts.id, postId));
    if (!post) throw new NotFoundException('Post not found');

    const [reply] = await this.db
      .insert(schema.postReplies)
      .values({ postId, userId, text })
      .returning();
    return reply;
  }
}
