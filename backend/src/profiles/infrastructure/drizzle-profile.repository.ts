import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../core/database/database.provider';
import * as schema from '../../core/database/schema';
import type { ProfileRepository, CategoryStat } from '../domain/profile';

@Injectable()
export class DrizzleProfileRepository implements ProfileRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findById(id: string) {
    const [row] = await this.db
      .select({
        id: schema.user.id,
        name: schema.user.name,
        image: schema.user.image,
        createdAt: schema.user.createdAt,
      })
      .from(schema.user)
      .where(eq(schema.user.id, id));
    return row ?? null;
  }

  async getCategoryStats(userId: string): Promise<CategoryStat[]> {
    const borrowRows = await this.db
      .select({ category: schema.books.category, borrowCount: count() })
      .from(schema.borrows)
      .innerJoin(schema.books, eq(schema.borrows.bookId, schema.books.id))
      .where(eq(schema.borrows.userId, userId))
      .groupBy(schema.books.category)
      .orderBy(schema.books.category);

    const purchaseRows = await this.db
      .select({ category: schema.books.category, purchaseCount: count() })
      .from(schema.purchases)
      .innerJoin(schema.books, eq(schema.purchases.bookId, schema.books.id))
      .where(eq(schema.purchases.userId, userId))
      .groupBy(schema.books.category)
      .orderBy(schema.books.category);

    const borrowMap = new Map(
      borrowRows.map((r) => [r.category, Number(r.borrowCount)]),
    );
    const purchaseMap = new Map(
      purchaseRows.map((r) => [r.category, Number(r.purchaseCount)]),
    );
    const allCategories = [
      ...new Set([...borrowMap.keys(), ...purchaseMap.keys()]),
    ].sort();

    return allCategories.map((category) => ({
      category,
      borrowCount: borrowMap.get(category) ?? 0,
      purchaseCount: purchaseMap.get(category) ?? 0,
    }));
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const [row] = await this.db
      .select()
      .from(schema.follows)
      .where(
        and(
          eq(schema.follows.followerId, followerId),
          eq(schema.follows.followingId, followingId),
        ),
      );
    return !!row;
  }

  async countFollowers(userId: string): Promise<number> {
    const [result] = await this.db
      .select({ value: count() })
      .from(schema.follows)
      .where(eq(schema.follows.followingId, userId));
    return Number(result?.value ?? 0);
  }

  async toggleFollow(
    followerId: string,
    followingId: string,
  ): Promise<{ following: boolean; followerCount: number }> {
    const existing = await this.isFollowing(followerId, followingId);
    if (existing) {
      await this.db
        .delete(schema.follows)
        .where(
          and(
            eq(schema.follows.followerId, followerId),
            eq(schema.follows.followingId, followingId),
          ),
        );
    } else {
      await this.db.insert(schema.follows).values({ followerId, followingId });
    }
    const followerCount = await this.countFollowers(followingId);
    return { following: !existing, followerCount };
  }
}
