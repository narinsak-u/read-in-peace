// PurchaseConfirmationService — verifies a Stripe session, records purchases
// atomically, and lists the user's purchase history.
import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { DATABASE, type Database } from '../../core/database/database.provider';
import {
  BOOK_READ_MODEL,
  BOOK_REPOSITORY,
} from '../../books/domain/book.repository';
import type {
  BookReadModel,
  BookRepository,
} from '../../books/domain/book.repository';
import {
  PURCHASE_REPOSITORY,
  type PurchaseRepository,
} from '../domain/purchase';
import { STRIPE, type StripeClient } from '../infrastructure/stripe.provider';

@Injectable()
export class PurchaseConfirmationService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(BOOK_REPOSITORY) private readonly books: BookRepository,
    @Inject(PURCHASE_REPOSITORY) private readonly purchases: PurchaseRepository,
    @Inject(BOOK_READ_MODEL) private readonly readModel: BookReadModel,
    @Inject(STRIPE) private readonly stripe: StripeClient,
  ) {}

  async confirm(sessionId: string, userId: string): Promise<unknown> {
    const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    });
    if (
      session.payment_status !== 'paid' ||
      session.metadata?.userId !== userId
    ) {
      throw new BadRequestException('Invalid purchase confirmation');
    }

    const receiptUrl =
      (session as any).payment_intent?.charges?.data?.[0]?.receipt_url ?? null;
    const amountTotal = session.amount_total ?? null;

    return this.recordFromSession(session, receiptUrl, amountTotal);
  }

  async recordFromSession(
    session: any,
    receiptUrl: string | null,
    amountTotal: number | null,
  ): Promise<unknown> {
    if (session.payment_status !== 'paid') {
      return { skipped: 'not paid' };
    }

    const userId: string | undefined = session.metadata?.userId;
    if (!userId) return { skipped: 'no userId' };
    const sessionId: string = session.id;

    const bookCount = Number(session.metadata?.bc);
    if (bookCount > 0) {
      const bookIds: string[] = [];
      for (let i = 0; i < bookCount; i++) {
        bookIds.push(session.metadata[`b${i}`]);
      }
      return this.recordBatchPurchases(
        bookIds,
        userId,
        sessionId,
        receiptUrl,
        amountTotal,
      );
    }

    const bookId: string | undefined = session.metadata?.bookId;
    if (!bookId) {
      throw new BadRequestException('No book IDs found in session metadata');
    }
    return this.recordSinglePurchase(
      bookId,
      userId,
      sessionId,
      receiptUrl,
      amountTotal,
    );
  }

  private async recordSinglePurchase(
    bookId: string,
    userId: string,
    stripeSessionId?: string,
    receiptUrl?: string | null,
    amountTotal?: number | null,
  ) {
    return this.db.transaction(async (tx) => {
      const existing = await this.purchases.findExisting(bookId, userId, tx);
      if (existing) return existing;

      const purchase = await this.purchases.record(
        bookId,
        userId,
        stripeSessionId,
        receiptUrl,
        amountTotal,
        tx,
      );
      await this.books.decrementStock(bookId, tx);

      return purchase;
    });
  }

  private async recordBatchPurchases(
    bookIds: string[],
    userId: string,
    stripeSessionId?: string,
    receiptUrl?: string | null,
    amountTotal?: number | null,
  ) {
    return this.db.transaction(async (tx) => {
      const inserted: string[] = [];
      for (const bookId of bookIds) {
        const existing = await this.purchases.findExisting(bookId, userId, tx);
        if (existing) continue;
        await this.purchases.record(
          bookId,
          userId,
          stripeSessionId,
          receiptUrl,
          amountTotal,
          tx,
        );
        inserted.push(bookId);
      }
      for (const bookId of inserted) {
        await this.books.decrementStock(bookId, tx);
      }
      return inserted;
    });
  }

  async listForUser(userId: string) {
    const rows = await this.purchases.listForUser(userId);
    const bookMap = await this.readModel.attachToPurchases(
      rows.map((r) => ({ bookId: r.bookId })),
    );
    return rows.flatMap(({ row, bookId }) => {
      const book = bookMap.get(bookId);
      if (!book) return [];
      return [{ purchase: row, book }];
    });
  }
}
