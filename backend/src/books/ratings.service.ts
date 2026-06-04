import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { DRIZZLE } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq, sql } from 'drizzle-orm';

@Injectable()
export class RatingsService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async upsert(bookId: string, userId: string, rating: number) {
    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      throw new BadRequestException('Rating must be an integer between 1 and 5');
    }

    await this.db
      .insert(schema.ratings)
      .values({ bookId, userId, rating })
      .onConflictDoUpdate({
        target: [schema.ratings.bookId, schema.ratings.userId],
        set: { rating },
      });

    const [{ avg }] = await this.db
      .select({ avg: sql<number>`AVG(${schema.ratings.rating})` })
      .from(schema.ratings)
      .where(eq(schema.ratings.bookId, bookId));

    return {
      avgRating: avg ? Number(Number(avg).toFixed(1)) : 0,
      userRating: rating,
    };
  }
}
