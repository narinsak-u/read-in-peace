import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';

@Injectable()
export class ReadingGoalsService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async getGoal(userId: string) {
    const year = new Date().getFullYear();

    const [goal] = await this.db
      .select()
      .from(schema.readingGoals)
      .where(
        and(
          eq(schema.readingGoals.userId, userId),
          eq(schema.readingGoals.year, year),
        ),
      );

    const [completed] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.borrows)
      .where(
        and(
          eq(schema.borrows.userId, userId),
          sql`${schema.borrows.returnedAt} IS NOT NULL`,
          sql`EXTRACT(YEAR FROM ${schema.borrows.returnedAt}) = ${year}`,
        ),
      );

    const [purchased] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.purchases)
      .where(
        and(
          eq(schema.purchases.userId, userId),
          sql`EXTRACT(YEAR FROM ${schema.purchases.purchasedAt}) = ${year}`,
        ),
      );

    const current = (completed?.count ?? 0) + (purchased?.count ?? 0);

    return {
      year,
      goal: goal?.goal ?? 0,
      current,
      updatedAt: goal?.updatedAt ?? null,
    };
  }

  async setGoal(userId: string, goal: number) {
    const year = new Date().getFullYear();

    const [existing] = await this.db
      .select()
      .from(schema.readingGoals)
      .where(
        and(
          eq(schema.readingGoals.userId, userId),
          eq(schema.readingGoals.year, year),
        ),
      );

    if (existing) {
      const [updated] = await this.db
        .update(schema.readingGoals)
        .set({ goal, updatedAt: new Date() })
        .where(eq(schema.readingGoals.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await this.db
      .insert(schema.readingGoals)
      .values({ userId, year, goal })
      .returning();
    return created;
  }
}
