import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';

@Injectable()
export class LikesService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async toggle(bookId: string, userId: string) {
    const existing = await this.db
      .select()
      .from(schema.likes)
      .where(and(
        eq(schema.likes.bookId, bookId),
        eq(schema.likes.userId, userId),
      ));

    if (existing.length > 0) {
      await this.db
        .delete(schema.likes)
        .where(and(
          eq(schema.likes.bookId, bookId),
          eq(schema.likes.userId, userId),
        ));
    } else {
      await this.db
        .insert(schema.likes)
        .values({ bookId, userId });
    }

    const [{ count: likeCount }] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(schema.likes)
      .where(eq(schema.likes.bookId, bookId));

    return {
      liked: existing.length === 0,
      likeCount: Number(likeCount),
    };
  }
}
