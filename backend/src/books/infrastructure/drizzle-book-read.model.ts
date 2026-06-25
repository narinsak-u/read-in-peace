import { Inject, Injectable } from '@nestjs/common';
import { desc, eq, ilike, inArray, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../../core/database/database.provider';
import * as schema from '../../core/database/schema';
import type { BookReadModel } from '../domain/book.repository';
import type { BookProjection } from '../domain/book';
import { buildPaginated } from '../domain/paginated';

@Injectable()
export class DrizzleBookReadModel implements BookReadModel {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findFullById(id: string): Promise<BookProjection | null> {
    const [row] = await this.db
      .select(bookWithMeta)
      .from(schema.books)
      .where(eq(schema.books.id, id));
    return row ?? null;
  }

  async findFullByIdOrSlug(idOrSlug: string): Promise<BookProjection | null> {
    const [row] = await this.db
      .select(bookWithMeta)
      .from(schema.books)
      .where(
        sql`${schema.books.slug} = ${idOrSlug} OR ${schema.books.id} = ${idOrSlug}`,
      );
    return row ?? null;
  }

  async findFullPaginated(page: number, limit: number, category?: string) {
    const offset = (page - 1) * limit;
    const where = category
      ? sql`${schema.books.category} = ${category}`
      : sql`TRUE`;

    const data = (await this.db
      .select(bookWithMeta)
      .from(schema.books)
      .where(where)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(schema.books.createdAt))) as BookProjection[];

    const [totalResult] = await this.db
      .select({ value: sql<number>`COUNT(*)` })
      .from(schema.books)
      .where(where);

    return buildPaginated(data, Number(totalResult?.value ?? 0), page, limit);
  }

  async search(q: string, limit: number): Promise<BookProjection[]> {
    const pattern = `%${q}%`;
    return await this.db
      .select(bookWithMeta)
      .from(schema.books)
      .where(ilike(schema.books.title, pattern))
      .limit(limit)
      .orderBy(desc(schema.books.createdAt));
  }

  async findNewArrivals(limit: number): Promise<BookProjection[]> {
    return await this.db
      .select(bookWithMeta)
      .from(schema.books)
      .limit(limit)
      .orderBy(desc(schema.books.createdAt));
  }

  async getTrending(limit: number): Promise<BookProjection[]> {
    return await this.db
      .select(bookWithMeta)
      .from(schema.books)
      .orderBy(
        desc(
          sql`COALESCE((SELECT AVG(${schema.ratings.rating}) FROM ${schema.ratings} WHERE ${schema.ratings.bookId} = ${schema.books.id}), 0)`,
        ),
      )
      .limit(limit);
  }

  async attachToBorrows(
    borrows: Array<{ bookId: string }>,
  ): Promise<Map<string, BookProjection>> {
    const ids = [...new Set(borrows.map((b) => b.bookId))];
    if (ids.length === 0) return new Map();
    const rows = (await this.db
      .select(bookWithMeta)
      .from(schema.books)
      .where(inArray(schema.books.id, ids))) as BookProjection[];
    return new Map(rows.map((r) => [r.id, r]));
  }

  async attachToPurchases(
    purchases: Array<{ bookId: string }>,
  ): Promise<Map<string, BookProjection>> {
    return this.attachToBorrows(purchases);
  }
}

// Inline aggregate select used for all "book + meta" reads. The subqueries
// compute like/comment/rating counts without a join — they are fast and
// avoid fan-out duplication.
const bookWithMeta = {
  id: schema.books.id,
  slug: schema.books.slug,
  title: schema.books.title,
  author: schema.books.author,
  price: schema.books.price,
  cover: schema.books.cover,
  synopsis: schema.books.synopsis,
  category: schema.books.category,
  crop: schema.books.crop,
  shelf: schema.books.shelf,
  year: schema.books.year,
  trending: schema.books.trending,
  inStock: schema.books.inStock,
  isAvailable: schema.books.isAvailable,
  totalPages: schema.books.totalPages,
  createdBy: schema.books.createdBy,
  createdAt: schema.books.createdAt,
  updatedAt: schema.books.updatedAt,
  likeCount: sql<number>`(SELECT COUNT(*) FROM ${schema.likes} WHERE ${schema.likes.bookId} = ${schema.books.id})`,
  commentCount: sql<number>`(SELECT COUNT(*) FROM ${schema.comments} WHERE ${schema.comments.bookId} = ${schema.books.id})`,
  avgRating: sql<number>`COALESCE((SELECT AVG(${schema.ratings.rating}) FROM ${schema.ratings} WHERE ${schema.ratings.bookId} = ${schema.books.id}), 0)`,
  ratingsCount: sql<number>`(SELECT COUNT(*) FROM ${schema.ratings} WHERE ${schema.ratings.bookId} = ${schema.books.id})`,
} as const;
