import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import {
  DATABASE,
  type Database,
  type DatabaseOrTransaction,
} from '../../core/database/database.provider';
import * as schema from '../../core/database/schema';
import type { RatingRepository } from '../domain/engagement';

@Injectable()
export class DrizzleRatingRepository implements RatingRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findUserRating(bookId: string, userId: string): Promise<number | null> {
    const [row] = await this.db
      .select({ rating: schema.ratings.rating })
      .from(schema.ratings)
      .where(
        and(
          eq(schema.ratings.bookId, bookId),
          eq(schema.ratings.userId, userId),
        ),
      );
    return row?.rating ?? null;
  }

  async upsert(bookId: string, userId: string, rating: number): Promise<void> {
    await this.db
      .insert(schema.ratings)
      .values({ bookId, userId, rating })
      .onConflictDoUpdate({
        target: [schema.ratings.bookId, schema.ratings.userId],
        set: { rating },
      });
  }

  async recordFromComment(
    tx: DatabaseOrTransaction,
    input: { bookId: string; userId: string; rating: number | null },
  ): Promise<void> {
    if (input.rating === null) return;
    await tx
      .insert(schema.ratings)
      .values({
        bookId: input.bookId,
        userId: input.userId,
        rating: input.rating,
      })
      .onConflictDoUpdate({
        target: [schema.ratings.bookId, schema.ratings.userId],
        set: { rating: input.rating },
      });
  }

  async getAvgForBook(bookId: string): Promise<number | null> {
    const [row] = await this.db
      .select({ avg: sql<number>`AVG(${schema.ratings.rating})` })
      .from(schema.ratings)
      .where(eq(schema.ratings.bookId, bookId));
    return row?.avg ? Number(row.avg) : null;
  }
}
