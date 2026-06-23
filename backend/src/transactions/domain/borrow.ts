// Borrow and Purchase domain types for the transactions feature. These
// are the resource shapes the application services operate on; the
// Drizzle implementations in infrastructure/ map between the schema and
// these types.
import type { DatabaseOrTransaction } from '../../core/database/database.provider';
import type { BookRow } from '../../books/domain/book';

export interface BorrowRow {
  id: string;
  bookId: string;
  userId: string;
  borrowedAt: Date;
  returnedAt: Date | null;
  dueAt: Date;
  currentPage: number;
  totalPages: number;
}

export interface BorrowWithBook {
  borrow: BorrowRow;
  book: BookRow;
}

export const BORROW_REPOSITORY = Symbol('BORROW_REPOSITORY');

export interface BorrowRepository {
  findActiveBorrow(
    bookId: string,
    userId: string,
    tx?: DatabaseOrTransaction,
  ): Promise<{ id: string } | null>;
  recordBorrow(
    bookId: string,
    userId: string,
    dueAt: Date,
    totalPages: number,
    tx?: DatabaseOrTransaction,
  ): Promise<BorrowRow>;
  markReturned(
    borrowId: string,
    tx?: DatabaseOrTransaction,
  ): Promise<BorrowRow | null>;
  listActiveByUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ borrowIds: string[]; total: number }>;
  findByIds(ids: string[]): Promise<BorrowRow[]>;
}
