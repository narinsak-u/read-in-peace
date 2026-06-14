// Business logic for borrowing, returning, and purchasing books.
// Borrow uses a DB-level transaction with row locking (FOR UPDATE) for concurrency safety.
// Purchase uses Stripe Checkout Sessions with payment confirmation and idempotency guard.
import {
  Injectable,
  Inject,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { STRIPE } from './stripe.provider';
import StripeConstructor from 'stripe';
import * as schema from '../db/schema';
import { eq, and, isNull, sql, gt } from 'drizzle-orm';

type StripeClient = ReturnType<typeof StripeConstructor>;

export interface DiscountResult {
  subtotal: number;
  tierPercent: number;
  tierDiscount: number;
  categoryBonus: number;
  every100Discount: number;
  total: number;
}

export function applyDiscounts(
  books: { price: string; category: string }[],
): DiscountResult {
  const subtotal = books.reduce(
    (sum, b) => sum + Math.round(Number(b.price) * 100),
    0,
  );

  // Stage 1 — Quantity Tier
  const count = books.length;
  const tierPercent = count >= 4 ? 30 : count === 3 ? 20 : count === 2 ? 10 : 0;
  const tierDiscount = Math.round(subtotal * (tierPercent / 100));
  let runningTotal = subtotal - tierDiscount;

  // Stage 2 — Category Bonus (on original prices)
  const catSubtotals = new Map<string, { subtotal: number; count: number }>();
  for (const book of books) {
    const price = Math.round(Number(book.price) * 100);
    const existing = catSubtotals.get(book.category) ?? {
      subtotal: 0,
      count: 0,
    };
    existing.subtotal += price;
    existing.count += 1;
    catSubtotals.set(book.category, existing);
  }

  let categoryBonus = 0;
  for (const { subtotal: catSubtotal, count } of catSubtotals.values()) {
    if (count >= 2) {
      categoryBonus += Math.round(catSubtotal * 0.1);
    }
  }
  runningTotal -= categoryBonus;

  // Stage 3 — Every $100 (10000 cents)
  const EVERY_X = 10000;
  const DISCOUNT_Y = 100;
  const every100Discount = Math.floor(runningTotal / EVERY_X) * DISCOUNT_Y;
  runningTotal -= every100Discount;

  // Clamp to zero
  const total = Math.max(0, runningTotal);

  return {
    subtotal,
    tierPercent,
    tierDiscount,
    categoryBonus,
    every100Discount,
    total,
  };
}

@Injectable()
export class TransactionsService {
  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
    @Inject(STRIPE) private stripe: StripeClient,
  ) {}

  private async getBook(bookId: string) {
    const [book] = await this.db
      .select({
        id: schema.books.id,
        title: schema.books.title,
        price: schema.books.price,
        inStock: schema.books.inStock,
        isAvailable: schema.books.isAvailable,
        category: schema.books.category,
      })
      .from(schema.books)
      .where(eq(schema.books.id, bookId));
    if (!book) throw new NotFoundException('Book not found');
    return book;
  }

  async borrow(bookId: string, userId: string) {
    return this.db.transaction(async (tx) => {
      const [book] = await tx
        .select({
          id: schema.books.id,
          isAvailable: schema.books.isAvailable,
          inStock: schema.books.inStock,
        })
        .from(schema.books)
        .where(eq(schema.books.id, bookId))
        .for('update');

      if (!book) throw new NotFoundException('Book not found');
      if (!book.isAvailable) {
        throw new ConflictException(
          'Book is currently not available for borrowing',
        );
      }

      const [active] = await tx
        .select({ id: schema.borrows.id })
        .from(schema.borrows)
        .where(
          and(
            eq(schema.borrows.bookId, bookId),
            eq(schema.borrows.userId, userId),
            isNull(schema.borrows.returnedAt),
          ),
        );

      if (active) {
        throw new ConflictException('Book already borrowed');
      }

      const remaining = book.inStock - 1;
      await tx
        .update(schema.books)
        .set({
          inStock: remaining,
          isAvailable: remaining > 1,
        })
        .where(eq(schema.books.id, bookId));

      const [borrow] = await tx
        .insert(schema.borrows)
        .values({ bookId, userId })
        .returning();

      return borrow;
    });
  }

  async returnBook(bookId: string, userId: string) {
    const [active] = await this.db
      .select({ id: schema.borrows.id })
      .from(schema.borrows)
      .where(
        and(
          eq(schema.borrows.bookId, bookId),
          eq(schema.borrows.userId, userId),
          isNull(schema.borrows.returnedAt),
        ),
      );

    if (!active) {
      throw new BadRequestException('No active borrow to return');
    }

    await this.db
      .update(schema.books)
      .set({
        inStock: sql`${schema.books.inStock} + 1`,
        isAvailable: true,
      })
      .where(eq(schema.books.id, bookId));

    const [borrow] = await this.db
      .update(schema.borrows)
      .set({ returnedAt: new Date() })
      .where(eq(schema.borrows.id, active.id))
      .returning();

    return borrow;
  }

  async createCheckoutSession(bookId: string, userId: string) {
    const book = await this.getBook(bookId);
    if (book.inStock <= 1) {
      throw new BadRequestException(
        'Only one copy left — this book is borrow-only',
      );
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: book.title },
            unit_amount: Math.round(Number(book.price) * 100),
          },
          quantity: 1,
        },
      ],
      metadata: { bookId, userId },
      success_url: `${process.env.BETTER_AUTH_URL || 'http://localhost:3000'}/dashboard?tab=purchased&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BETTER_AUTH_URL || 'http://localhost:3000'}/book/${bookId}`,
    });

    return { url: session.url };
  }

  async createCartCheckoutSession(bookIds: string[], userId: string) {
    if (!bookIds || bookIds.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const books = await Promise.all(bookIds.map((id) => this.getBook(id)));

    const badBooks = books.filter((b) => b.inStock <= 1);
    if (badBooks.length > 0) {
      throw new BadRequestException(
        `Some books are no longer available for purchase: ${badBooks.map((b) => b.title).join(', ')}`,
      );
    }

    const discount = applyDiscounts(
      books.map((b) => ({ price: b.price, category: b.category })),
    );

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Read in Pace — ${bookIds.length} book${bookIds.length > 1 ? 's' : ''}`,
            },
            unit_amount: discount.total,
          },
          quantity: 1,
        },
      ],
      metadata: {
        bookIds: JSON.stringify(bookIds),
        userId,
      },
      success_url: `${process.env.BETTER_AUTH_URL || 'http://localhost:3000'}/dashboard?tab=purchased&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BETTER_AUTH_URL || 'http://localhost:3000'}/feed`,
    });

    return { url: session.url };
  }

  async confirmPurchase(sessionId: string, userId: string) {
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);
    if (
      session.payment_status !== 'paid' ||
      session.metadata?.userId !== userId
    ) {
      throw new BadRequestException('Invalid purchase confirmation');
    }

    const bookIdsRaw = session.metadata.bookIds;
    if (!bookIdsRaw) {
      const bookId = session.metadata.bookId;
      if (!bookId) {
        throw new BadRequestException('No book IDs found in session metadata');
      }
      return this.recordSinglePurchase(bookId, userId);
    }

    const bookIds = JSON.parse(bookIdsRaw) as string[];
    return this.recordBatchPurchases(bookIds, userId);
  }

  private async recordSinglePurchase(bookId: string, userId: string) {
    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: schema.purchases.id })
        .from(schema.purchases)
        .where(
          and(
            eq(schema.purchases.bookId, bookId),
            eq(schema.purchases.userId, userId),
          ),
        );

      if (existing) return existing;

      const [purchase] = await tx
        .insert(schema.purchases)
        .values({ bookId, userId })
        .returning();

      await tx
        .update(schema.books)
        .set({ inStock: sql`${schema.books.inStock} - 1` })
        .where(and(eq(schema.books.id, bookId), gt(schema.books.inStock, 1)));

      return purchase;
    });
  }

  private async recordBatchPurchases(bookIds: string[], userId: string) {
    return this.db.transaction(async (tx) => {
      const inserts: Promise<unknown>[] = [];
      for (const bookId of bookIds) {
        const [existing] = await tx
          .select({ id: schema.purchases.id })
          .from(schema.purchases)
          .where(
            and(
              eq(schema.purchases.bookId, bookId),
              eq(schema.purchases.userId, userId),
            ),
          );

        if (existing) continue;

        inserts.push(
          tx.insert(schema.purchases).values({ bookId, userId }).returning(),
        );
      }

      for (const bookId of bookIds) {
        await tx
          .update(schema.books)
          .set({ inStock: sql`${schema.books.inStock} - 1` })
          .where(and(eq(schema.books.id, bookId), gt(schema.books.inStock, 1)));
      }

      const results = await Promise.all(inserts);
      return results.flat();
    });
  }

  async getUserBorrows(userId: string) {
    return this.db
      .select({
        borrow: {
          id: schema.borrows.id,
          bookId: schema.borrows.bookId,
          userId: schema.borrows.userId,
          borrowedAt: schema.borrows.borrowedAt,
          returnedAt: schema.borrows.returnedAt,
        },
        book: {
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
        },
      })
      .from(schema.borrows)
      .innerJoin(schema.books, eq(schema.borrows.bookId, schema.books.id))
      .where(
        and(
          eq(schema.borrows.userId, userId),
          isNull(schema.borrows.returnedAt),
        ),
      )
      .orderBy(sql`${schema.borrows.borrowedAt} DESC`);
  }

  async getUserPurchases(userId: string) {
    return this.db
      .select({
        purchase: {
          id: schema.purchases.id,
          bookId: schema.purchases.bookId,
          userId: schema.purchases.userId,
          purchasedAt: schema.purchases.purchasedAt,
        },
        book: {
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
        },
      })
      .from(schema.purchases)
      .innerJoin(schema.books, eq(schema.purchases.bookId, schema.books.id))
      .where(eq(schema.purchases.userId, userId))
      .orderBy(sql`${schema.purchases.purchasedAt} DESC`);
  }
}
