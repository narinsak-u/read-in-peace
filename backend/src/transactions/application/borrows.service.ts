// BorrowsService — borrow and return workflows, plus the user's borrow list.
// Owns the 14-day due-date constant. Composes BookRepository (for stock
// + locking) and BorrowRepository (for borrow rows).
import {
  Inject,
  Injectable,
  forwardRef,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DATABASE, type Database } from '../../core/database/database.provider';
import { Paginated, buildPaginated } from '../../books/domain/paginated';
import {
  BOOK_READ_MODEL,
  BOOK_REPOSITORY,
} from '../../books/domain/book.repository';
import type {
  BookReadModel,
  BookRepository,
} from '../../books/domain/book.repository';
import {
  BORROW_REPOSITORY,
  type BorrowRepository,
  type BorrowRow,
  type BorrowWithBook,
} from '../domain/borrow';
import { MembershipService } from '../../membership/application/membership.service';

const BORROW_PERIOD_DAYS = 14;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class BorrowsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(BOOK_REPOSITORY) private readonly books: BookRepository,
    @Inject(BORROW_REPOSITORY) private readonly borrows: BorrowRepository,
    @Inject(BOOK_READ_MODEL) private readonly readModel: BookReadModel,
    @Inject(forwardRef(() => MembershipService))
    private readonly membership: MembershipService,
  ) {}

  async borrow(bookId: string, userId: string): Promise<BorrowRow> {
    return this.db.transaction(async (tx) => {
      const book = await this.books.acquireLockForBorrow(bookId, tx);

      if (!book) throw new NotFoundException('Book not found');
      if (!book.isAvailable) {
        throw new BadRequestException(
          'Book is currently not available for borrowing',
        );
      }

      const active = await this.borrows.findActiveBorrow(bookId, userId, tx);
      if (active) {
        throw new BadRequestException('Book already borrowed');
      }

      await this.membership.enforceBorrowLimit(userId, tx);

      const remaining = book.inStock - 1;
      await this.books.update(
        bookId,
        {
          inStock: remaining,
          isAvailable: remaining > 1,
        },
        tx,
      );

      const borrow = await this.borrows.recordBorrow(
        bookId,
        userId,
        new Date(Date.now() + BORROW_PERIOD_DAYS * MS_PER_DAY),
        book.totalPages,
        tx,
      );

      return borrow;
    });
  }

  async returnBook(bookId: string, userId: string): Promise<BorrowRow | null> {
    const active = await this.borrows.findActiveBorrow(bookId, userId);
    if (!active) {
      throw new BadRequestException('No active borrow to return');
    }
    await this.books.incrementStock(bookId);
    return this.borrows.markReturned(active.id);
  }

  async listForUser(
    userId: string,
    page: number,
    limit: number,
    sort?: string,
  ): Promise<Paginated<BorrowWithBook>> {
    const { borrowIds, total } = await this.borrows.listActiveByUser(
      userId,
      page,
      limit,
      sort,
    );

    if (borrowIds.length === 0) {
      return buildPaginated([], total, page, limit);
    }

    const rows = await this.borrows.findByIds(borrowIds);
    const borrowMap = new Map(rows.map((r) => [r.id, r]));

    const bookMap = await this.readModel.attachToBorrows(
      [...borrowMap.values()].map((b) => ({ bookId: b.bookId })),
    );

    const data: BorrowWithBook[] = borrowIds.flatMap((id) => {
      const borrow = borrowMap.get(id);
      const book = borrow ? bookMap.get(borrow.bookId) : undefined;
      if (!borrow || !book) return [];
      return [{ borrow, book }];
    });

    return buildPaginated(data, total, page, limit);
  }
}
