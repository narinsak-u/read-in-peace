// Business logic for books: CRUD, paginated listing, stock management, and trending.
// Uses Drizzle ORM with computed subquery fields (likeCount, commentCount, avgRating).
// Enforces ownership on update/delete. decrementStock is used by the purchase flow.
import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DRIZZLE } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { desc, eq, sql, count, gt, and } from 'drizzle-orm';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';

@Injectable()
export class BooksService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  private bookWithMeta = {
    id: schema.books.id,
    title: schema.books.title,
    author: schema.books.author,
    price: schema.books.price,
    cover: schema.books.cover,
    synopsis: schema.books.synopsis,
    category: schema.books.category,
    trending: schema.books.trending,
    inStock: schema.books.inStock,
    isAvailable: schema.books.isAvailable,
    createdBy: schema.books.createdBy,
    createdAt: schema.books.createdAt,
    updatedAt: schema.books.updatedAt,
    likeCount: sql<number>`(SELECT COUNT(*) FROM ${schema.likes} WHERE ${schema.likes.bookId} = ${schema.books.id})`,
    commentCount: sql<number>`(SELECT COUNT(*) FROM ${schema.comments} WHERE ${schema.comments.bookId} = ${schema.books.id})`,
    avgRating: sql<number>`COALESCE((SELECT AVG(${schema.ratings.rating}) FROM ${schema.ratings} WHERE ${schema.ratings.bookId} = ${schema.books.id}), 0)`,
  } as const;

  private avgRatingOrderBy = desc(
    sql`COALESCE((SELECT AVG(${schema.ratings.rating}) FROM ${schema.ratings} WHERE ${schema.ratings.bookId} = ${schema.books.id}), 0)`,
  );

  async findAll(page: number, limit: number, category?: string) {
    const offset = (page - 1) * limit;
    const where = category ? eq(schema.books.category, category) : undefined;

    const data = await this.db
      .select(this.bookWithMeta)
      .from(schema.books)
      .where(where)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(schema.books.createdAt));

    const totalResult = await this.db
      .select({ value: count() })
      .from(schema.books)
      .where(where);

    const total = Number(totalResult[0].value);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const [book] = await this.db
      .select(this.bookWithMeta)
      .from(schema.books)
      .where(eq(schema.books.id, id));

    if (!book) throw new NotFoundException('Book not found');
    return book;
  }

  private async findOwner(id: string) {
    const [book] = await this.db
      .select({ createdBy: schema.books.createdBy })
      .from(schema.books)
      .where(eq(schema.books.id, id));
    if (!book) throw new NotFoundException('Book not found');
    return book.createdBy;
  }

  async create(data: CreateBookDto, userId: string) {
    const [book] = await this.db
      .insert(schema.books)
      .values({ ...data, createdBy: userId })
      .returning();
    return book;
  }

  async update(id: string, data: UpdateBookDto, userId: string) {
    const owner = await this.findOwner(id);
    if (owner !== userId) {
      throw new ForbiddenException('You can only edit your own books');
    }
    const [updated] = await this.db
      .update(schema.books)
      .set(data)
      .where(eq(schema.books.id, id))
      .returning();
    return updated;
  }

  async remove(id: string, userId: string) {
    const owner = await this.findOwner(id);
    if (owner !== userId) {
      throw new ForbiddenException('You can only delete your own books');
    }
    await this.db.delete(schema.books).where(eq(schema.books.id, id));
  }

  async decrementStock(id: string) {
    const [updated] = await this.db
      .update(schema.books)
      .set({ inStock: sql`${schema.books.inStock} - 1` })
      .where(and(eq(schema.books.id, id), gt(schema.books.inStock, 0)))
      .returning();
    return updated;
  }

  async getTrending() {
    return this.db
      .select(this.bookWithMeta)
      .from(schema.books)
      .orderBy(this.avgRatingOrderBy)
      .limit(3);
  }
}
