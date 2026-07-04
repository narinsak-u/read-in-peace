import type { DatabaseOrTransaction } from '../../core/database/database.provider';

export interface PurchaseRow {
  id: string;
  bookId: string;
  userId: string;
  purchasedAt: Date;
  stripeSessionId: string | null;
  receiptUrl: string | null;
  amountTotal: number | null;
}

export const PURCHASE_REPOSITORY = Symbol('PURCHASE_REPOSITORY');

export interface PurchaseRepository {
  findExisting(
    bookId: string,
    userId: string,
    tx?: DatabaseOrTransaction,
  ): Promise<{ id: string } | null>;
  record(
    bookId: string,
    userId: string,
    stripeSessionId?: string,
    receiptUrl?: string,
    amountTotal?: number,
    tx?: DatabaseOrTransaction,
  ): Promise<PurchaseRow>;
  listForUser(
    userId: string,
  ): Promise<Array<{ row: PurchaseRow; bookId: string }>>;
}
