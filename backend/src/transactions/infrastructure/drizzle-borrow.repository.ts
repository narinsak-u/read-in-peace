import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, isNull, sql } from 'drizzle-orm';
import {
  DATABASE,
  type Database,
  type DatabaseOrTransaction,
} from '../../core/database/database.provider';
import * as schema from '../../core/database/schema';
import type { BorrowRepository, BorrowRow } from '../domain/borrow';

@Injectable()
export class DrizzleBorrowRepository implements BorrowRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findActiveBorrow(
    bookId: string,
    userId: string,
    tx?: DatabaseOrTransaction,
  ): Promise<{ id: string } | null> {
    const db = tx ?? this.db;
    const [row] = await db
      .select({ id: schema.borrows.id })
      .from(schema.borrows)
      .where(
        and(
          eq(schema.borrows.bookId, bookId),
          eq(schema.borrows.userId, userId),
          isNull(schema.borrows.returnedAt),
        ),
      );
    return row ?? null;
  }

  async recordBorrow(
    bookId: string,
    userId: string,
    dueAt: Date,
    totalPages: number,
    tx?: DatabaseOrTransaction,
  ): Promise<BorrowRow> {
    const db = tx ?? this.db;
    const [row] = await db
      .insert(schema.borrows)
      .values({
        bookId,
        userId,
        dueAt,
        currentPage: 0,
        totalPages,
      })
      .returning();
    return row;
  }

  async markReturned(
    borrowId: string,
    tx?: DatabaseOrTransaction,
  ): Promise<BorrowRow | null> {
    const db = tx ?? this.db;
    const [row] = await db
      .update(schema.borrows)
      .set({ returnedAt: new Date() })
      .where(eq(schema.borrows.id, borrowId))
      .returning();
    return row ?? null;
  }

  async listActiveByUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ borrowIds: string[]; total: number }> {
    const offset = (page - 1) * limit;
    const [totalResult] = await this.db
      .select({ value: count() })
      .from(schema.borrows)
      .where(
        and(
          eq(schema.borrows.userId, userId),
          isNull(schema.borrows.returnedAt),
        ),
      );

    const rows = await this.db
      .select({
        id: schema.borrows.id,
        bookId: schema.borrows.bookId,
        userId: schema.borrows.userId,
        borrowedAt: schema.borrows.borrowedAt,
        returnedAt: schema.borrows.returnedAt,
        dueAt: schema.borrows.dueAt,
        currentPage: schema.borrows.currentPage,
        totalPages: schema.borrows.totalPages,
      })
      .from(schema.borrows)
      .where(
        and(
          eq(schema.borrows.userId, userId),
          isNull(schema.borrows.returnedAt),
        ),
      )
      .orderBy(sql`${schema.borrows.borrowedAt} DESC`)
      .limit(limit)
      .offset(offset);

    return {
      borrowIds: rows.map((r) => r.id),
      total: Number(totalResult?.value ?? 0),
    };
  }

  async findByIds(ids: string[]): Promise<BorrowRow[]> {
    if (ids.length === 0) return [];
    return this.db
      .select()
      .from(schema.borrows)
      .where(sql`${schema.borrows.id} = ANY(${ids})`);
  }
}
