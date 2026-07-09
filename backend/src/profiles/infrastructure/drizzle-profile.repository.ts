import { Inject, Injectable } from '@nestjs/common';
import { count, eq } from 'drizzle-orm';
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
      .select({
        category: schema.books.category,
        borrowCount: count(),
      })
      .from(schema.borrows)
      .innerJoin(schema.books, eq(schema.borrows.bookId, schema.books.id))
      .where(eq(schema.borrows.userId, userId))
      .groupBy(schema.books.category)
      .orderBy(schema.books.category);

    const purchaseRows = await this.db
      .select({
        category: schema.books.category,
        purchaseCount: count(),
      })
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
}
