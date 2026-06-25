// Repository contracts for the books feature. The application layer depends
// only on these interfaces; the Drizzle implementation lives in
// infrastructure/ and is wired in books.module.ts.
//
// Methods that take an optional `tx` argument accept either the singleton
// database client or an open transaction. This lets application services run
// multi-table writes atomically without leaking Drizzle's transaction type
// into the domain — DatabaseOrTransaction is the minimal contract they need.
import type { DatabaseOrTransaction } from '../../core/database/database.provider';
import type {
  BookProjection,
  BookRow,
  BookPricing,
  NewBook,
  UpdateBook,
} from './book';

export type { BookProjection, BookRow, BookPricing, NewBook, UpdateBook };

export const BOOK_REPOSITORY = Symbol('BOOK_REPOSITORY');
export const BOOK_READ_MODEL = Symbol('BOOK_READ_MODEL');

export interface BookRepository {
  findById(id: string): Promise<BookRow | null>;
  findByIdOrSlug(idOrSlug: string): Promise<BookRow | null>;
  findOwner(bookId: string): Promise<string | null>;
  findPricingForPurchase(bookIds: string[]): Promise<BookPricing[]>;
  create(
    data: NewBook,
    userId: string,
    tx?: DatabaseOrTransaction,
  ): Promise<BookRow>;
  update(
    id: string,
    data: UpdateBook,
    tx?: DatabaseOrTransaction,
  ): Promise<BookRow | null>;
  delete(id: string, tx?: DatabaseOrTransaction): Promise<boolean>;
  incrementStock(bookId: string, tx?: DatabaseOrTransaction): Promise<void>;
  decrementStock(
    bookId: string,
    tx?: DatabaseOrTransaction,
  ): Promise<BookRow | null>;
  acquireLockForBorrow(
    id: string,
    tx: DatabaseOrTransaction,
  ): Promise<BookRow | null>;
}

export interface BookReadModel {
  findFullById(id: string): Promise<BookProjection | null>;
  findFullByIdOrSlug(idOrSlug: string): Promise<BookProjection | null>;
  findFullPaginated(
    page: number,
    limit: number,
    category?: string,
  ): Promise<{
    data: BookProjection[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }>;
  search(q: string, limit: number): Promise<BookProjection[]>;
  findNewArrivals(limit: number): Promise<BookProjection[]>;
  getTrending(limit: number): Promise<BookProjection[]>;
  attachToBorrows(
    borrows: Array<{ bookId: string }>,
  ): Promise<Map<string, BookProjection>>;
  attachToPurchases(
    purchases: Array<{ bookId: string }>,
  ): Promise<Map<string, BookProjection>>;
}
