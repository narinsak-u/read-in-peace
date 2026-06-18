// Drizzle implementation of BookRepository.
// Owns all single-table book writes. The cross-table read projection
// (with likeCount, commentCount, avgRating, ratingsCount) lives in BookReadModel.
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, or, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../db/db.module';
import * as schema from '../../db/schema';
import {
  type BookPricing,
  type BookRepository,
  type BookRow,
  type NewBook,
  type UpdateBook,
} from '../interfaces/book.repository';
import { BOOK_REPO } from '../tokens';

@Injectable()
export class DrizzleBookRepository implements BookRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

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

  async findPricingForPurchase(bookIds: string[]): Promise<BookPricing[]> {
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

  async create(data: NewBook, userId: string): Promise<BookRow> {
    const [row] = await this.db
      .insert(schema.books)
      .values({
        ...data,
        totalPages: data.totalPages ?? 300,
        createdBy: userId,
      })
      .returning();
    return row;
  }

  async update(id: string, data: UpdateBook): Promise<BookRow | null> {
    const [row] = await this.db
      .update(schema.books)
      .set(data)
      .where(eq(schema.books.id, id))
      .returning();
    return row ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(schema.books)
      .where(eq(schema.books.id, id))
      .returning({ id: schema.books.id });
    return result.length > 0;
  }

  async incrementStock(bookId: string): Promise<void> {
    await this.db
      .update(schema.books)
      .set({
        inStock: sql`${schema.books.inStock} + 1`,
        isAvailable: true,
      })
      .where(eq(schema.books.id, bookId));
  }

  async decrementStock(bookId: string): Promise<BookRow | null> {
    const [row] = await this.db
      .update(schema.books)
      .set({ inStock: sql`${schema.books.inStock} - 1` })
      .where(and(eq(schema.books.id, bookId), gt(schema.books.inStock, 1)))
      .returning();
    return row ?? null;
  }
}

export const bookRepoProvider = {
  provide: BOOK_REPO,
  useExisting: DrizzleBookRepository,
};
