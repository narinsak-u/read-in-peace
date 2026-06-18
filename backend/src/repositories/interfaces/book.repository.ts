import type { Paginated } from '../paginated';
import type * as schema from '../../db/schema';

export type BookRow = typeof schema.books.$inferSelect;
export type NewBook = typeof schema.books.$inferInsert;
export type UpdateBook = Partial<NewBook>;

export interface BookPricing {
  id: string;
  title: string;
  price: string;
  category: string;
  inStock: number;
  isAvailable: boolean;
}

export interface BookRepository {
  findById(id: string): Promise<BookRow | null>;
  findByIdOrSlug(idOrSlug: string): Promise<BookRow | null>;
  findOwner(bookId: string): Promise<string | null>;
  findPricingForPurchase(bookIds: string[]): Promise<BookPricing[]>;
  create(data: NewBook, userId: string): Promise<BookRow>;
  update(id: string, data: UpdateBook): Promise<BookRow | null>;
  delete(id: string): Promise<boolean>;
  incrementStock(bookId: string): Promise<void>;
  decrementStock(bookId: string): Promise<BookRow | null>;
}

export interface BookReadModel {
  findFullById(id: string): Promise<BookRow | null>;
  findFullByIdOrSlug(idOrSlug: string): Promise<BookRow | null>;
  findFullPaginated(
    page: number,
    limit: number,
    category?: string,
  ): Promise<Paginated<BookRow>>;
  findNewArrivals(limit: number): Promise<BookRow[]>;
  getTrending(limit: number): Promise<BookRow[]>;
  attachToBorrows(
    borrows: Array<{ bookId: string }>,
  ): Promise<Map<string, BookRow>>;
  attachToPurchases(
    purchases: Array<{ bookId: string }>,
  ): Promise<Map<string, BookRow>>;
}
