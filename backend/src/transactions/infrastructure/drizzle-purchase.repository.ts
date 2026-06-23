import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import {
  DATABASE,
  type Database,
  type DatabaseOrTransaction,
} from '../../core/database/database.provider';
import * as schema from '../../core/database/schema';
import type { PurchaseRepository, PurchaseRow } from '../domain/purchase';

@Injectable()
export class DrizzlePurchaseRepository implements PurchaseRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findExisting(
    bookId: string,
    userId: string,
    tx?: DatabaseOrTransaction,
  ): Promise<{ id: string } | null> {
    const db = tx ?? this.db;
    const [row] = await db
      .select({ id: schema.purchases.id })
      .from(schema.purchases)
      .where(
        and(
          eq(schema.purchases.bookId, bookId),
          eq(schema.purchases.userId, userId),
        ),
      );
    return row ?? null;
  }

  async record(
    bookId: string,
    userId: string,
    tx?: DatabaseOrTransaction,
  ): Promise<PurchaseRow> {
    const db = tx ?? this.db;
    const [row] = await db
      .insert(schema.purchases)
      .values({ bookId, userId })
      .returning();
    return row;
  }

  async listForUser(
    userId: string,
  ): Promise<Array<{ row: PurchaseRow; bookId: string }>> {
    const rows = (await this.db
      .select({
        id: schema.purchases.id,
        bookId: schema.purchases.bookId,
        userId: schema.purchases.userId,
        purchasedAt: schema.purchases.purchasedAt,
      })
      .from(schema.purchases)
      .where(eq(schema.purchases.userId, userId))
      .orderBy(
        sql`${schema.purchases.purchasedAt} DESC`,
      )) as unknown as PurchaseRow[];
    return rows.map((r) => ({ row: r, bookId: r.bookId }));
  }
}
