import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, or, sql } from 'drizzle-orm';
import {
  DATABASE,
  type Database,
  type DatabaseOrTransaction,
} from '../../core/database/database.provider';
import * as schema from '../../core/database/schema';
import type { BookRepository } from '../domain/book.repository';
import type { BookRow } from '../domain/book';

@Injectable()
export class DrizzleBookRepository implements BookRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findById(id: string): Promise<BookRow | null> {
    const [row] = await this.db
      .select()
      .from(schema.books)
      .where(eq(schema.books.id, id));
    return row ?? null;
  }

  async findByIdOrSlug(idOrSlug: string): Promise<BookRow | null> {
    const [row] = await this.db
      .select()
      .from(schema.books)
      .where(
        or(eq(schema.books.slug, idOrSlug), eq(schema.books.id, idOrSlug)),
      );
    return row ?? null;
  }

  async findOwner(bookId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ createdBy: schema.books.createdBy })
      .from(schema.books)
      .where(eq(schema.books.id, bookId));
    return row?.createdBy ?? null;
  }

  async findPricingForPurchase(bookIds: string[]) {
    if (bookIds.length === 0) return [];
    return this.db
      .select({
        id: schema.books.id,
        title: schema.books.title,
        price: schema.books.price,
        category: schema.books.category,
        inStock: schema.books.inStock,
        isAvailable: schema.books.isAvailable,
      })
      .from(schema.books)
      .where(sql`${schema.books.id} = ANY(${bookIds})`);
  }

  async create(
    data: Parameters<BookRepository['create']>[0],
    userId: string,
    tx?: DatabaseOrTransaction,
  ): Promise<BookRow> {
    const db = tx ?? this.db;
    const [row] = await db
      .insert(schema.books)
      .values({
        ...data,
        totalPages: data.totalPages ?? 300,
        createdBy: userId,
      })
      .returning();
    return row;
  }

  async update(
    id: string,
    data: Parameters<BookRepository['update']>[1],
    tx?: DatabaseOrTransaction,
  ): Promise<BookRow | null> {
    const db = tx ?? this.db;
    const [row] = await db
      .update(schema.books)
      .set(data)
      .where(eq(schema.books.id, id))
      .returning();
    return row ?? null;
  }

  async delete(id: string, tx?: DatabaseOrTransaction): Promise<boolean> {
    const db = tx ?? this.db;
    const result = await db
      .delete(schema.books)
      .where(eq(schema.books.id, id))
      .returning({ id: schema.books.id });
    return result.length > 0;
  }

  async incrementStock(
    bookId: string,
    tx?: DatabaseOrTransaction,
  ): Promise<void> {
    const db = tx ?? this.db;
    await db
      .update(schema.books)
      .set({
        inStock: sql`${schema.books.inStock} + 1`,
        isAvailable: true,
      })
      .where(eq(schema.books.id, bookId));
  }

  async decrementStock(
    bookId: string,
    tx?: DatabaseOrTransaction,
  ): Promise<BookRow | null> {
    const db = tx ?? this.db;
    const [row] = await db
      .update(schema.books)
      .set({ inStock: sql`${schema.books.inStock} - 1` })
      .where(and(eq(schema.books.id, bookId), gt(schema.books.inStock, 1)))
      .returning();
    return row ?? null;
  }

  async acquireLockForBorrow(
    id: string,
    tx: DatabaseOrTransaction,
  ): Promise<BookRow | null> {
    const [row] = await tx
      .select()
      .from(schema.books)
      .where(eq(schema.books.id, id))
      .for('update');
    return row ?? null;
  }
}
