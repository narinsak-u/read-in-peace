import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BorrowsService } from '../../../src/transactions/application/borrows.service';
import {
  BOOK_REPOSITORY,
  BOOK_READ_MODEL,
  type BookRepository,
  type BookReadModel,
} from '../../../src/books/domain/book.repository';
import {
  BORROW_REPOSITORY,
  type BorrowRepository,
  type BorrowRow,
} from '../../../src/transactions/domain/borrow';
import { DATABASE } from '../../../src/core/database/database.provider';
import type { BookRow } from '../../../src/books/domain/book';
import { MembershipService } from '../../../src/membership/application/membership.service';

const baseBook = (id: string, inStock = 3): BookRow => ({
  id,
  slug: `book-${id}`,
  title: `Book ${id}`,
  author: 'A',
  price: '10.00',
  cover: '',
  synopsis: '',
  category: 'Fiction',
  crop: null,
  shelf: 'A1',
  year: 2025,
  trending: false,
  inStock,
  isAvailable: inStock >= 1,
  totalPages: 300,
  createdBy: 'u1',
  createdAt: new Date(),
  updatedAt: new Date(),
});

const baseBorrow = (id: string, bookId: string, userId: string): BorrowRow => ({
  id,
  bookId,
  userId,
  borrowedAt: new Date(),
  returnedAt: null,
  dueAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  currentPage: 0,
  totalPages: 300,
});

describe('BorrowsService', () => {
  let svc: BorrowsService;
  let books: jest.Mocked<BookRepository>;
  let borrows: jest.Mocked<BorrowRepository>;
  let readModel: jest.Mocked<BookReadModel>;
  let membership: jest.Mocked<Pick<MembershipService, 'enforceBorrowLimit'>>;

  const mockTx = {};

  beforeEach(async () => {
    books = {
      findById: jest.fn(),
      findByIdOrSlug: jest.fn(),
      findOwner: jest.fn(),
      findPricingForPurchase: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      incrementStock: jest.fn(),
      decrementStock: jest.fn(),
      acquireLockForBorrow: jest.fn(),
    };

    borrows = {
      findActiveBorrow: jest.fn(),
      recordBorrow: jest.fn(),
      markReturned: jest.fn(),
      listActiveByUser: jest.fn(),
      findByIds: jest.fn(),
    };

    readModel = {
      findFullById: jest.fn(),
      findFullByIdOrSlug: jest.fn(),
      findFullPaginated: jest.fn(),
      findNewArrivals: jest.fn(),
      getTrending: jest.fn(),
      attachToBorrows: jest.fn(),
      attachToPurchases: jest.fn(),
    };

    db = {
      transaction: jest.fn().mockImplementation((cb) => cb(mockTx)),
    };

    membership = {
      enforceBorrowLimit: jest.fn().mockResolvedValue(undefined),
    };

    const mod = await Test.createTestingModule({
      providers: [
        BorrowsService,
        { provide: DATABASE, useValue: db },
        { provide: BOOK_REPOSITORY, useValue: books },
        { provide: BORROW_REPOSITORY, useValue: borrows },
        { provide: BOOK_READ_MODEL, useValue: readModel },
        { provide: MembershipService, useValue: membership },
      ],
    }).compile();

    svc = mod.get<BorrowsService>(BorrowsService);
  });

  describe('borrow', () => {
    it('borrows a book with stock lock and records the borrow', async () => {
      books.acquireLockForBorrow.mockResolvedValue(baseBook('b1', 3));
      borrows.findActiveBorrow.mockResolvedValue(null);
      borrows.recordBorrow.mockResolvedValue(baseBorrow('br1', 'b1', 'u1'));

      const result = await svc.borrow('b1', 'u1');

      expect(db.transaction).toHaveBeenCalled();
      expect(books.acquireLockForBorrow).toHaveBeenCalledWith('b1', mockTx);
      expect(borrows.findActiveBorrow).toHaveBeenCalledWith('b1', 'u1', mockTx);
      expect(books.update).toHaveBeenCalledWith(
        'b1',
        { inStock: 2, isAvailable: true },
        mockTx,
      );
      expect(borrows.recordBorrow).toHaveBeenCalledWith(
        'b1',
        'u1',
        expect.any(Date),
        300,
        mockTx,
      );
      expect(result.id).toBe('br1');
    });

    it('throws NotFoundException when book does not exist', async () => {
      books.acquireLockForBorrow.mockResolvedValue(null);
      await expect(svc.borrow('missing', 'u1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws BadRequestException when book is not available', async () => {
      books.acquireLockForBorrow.mockResolvedValue(baseBook('b1', 0));
      await expect(svc.borrow('b1', 'u1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('throws BadRequestException when already borrowed', async () => {
      books.acquireLockForBorrow.mockResolvedValue(baseBook('b1', 3));
      borrows.findActiveBorrow.mockResolvedValue({ id: 'br1' });
      await expect(svc.borrow('b1', 'u1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('sets isAvailable to false when stock drops to 1', async () => {
      books.acquireLockForBorrow.mockResolvedValue(baseBook('b1', 2));
      borrows.findActiveBorrow.mockResolvedValue(null);
      borrows.recordBorrow.mockResolvedValue(baseBorrow('br1', 'b1', 'u1'));

      await svc.borrow('b1', 'u1');

      expect(books.update).toHaveBeenCalledWith(
        'b1',
        { inStock: 1, isAvailable: false },
        mockTx,
      );
    });
  });

  describe('returnBook', () => {
    it('returns an active borrow', async () => {
      borrows.findActiveBorrow.mockResolvedValue({ id: 'br1' });
      borrows.markReturned.mockResolvedValue({
        ...baseBorrow('br1', 'b1', 'u1'),
        returnedAt: new Date(),
      });

      const result = await svc.returnBook('b1', 'u1');

      expect(borrows.findActiveBorrow).toHaveBeenCalledWith('b1', 'u1');
      expect(books.incrementStock).toHaveBeenCalledWith('b1');
      expect(borrows.markReturned).toHaveBeenCalledWith('br1');
      expect(result).not.toBeNull();
      expect(result!.returnedAt).not.toBeNull();
    });

    it('throws BadRequestException when no active borrow', async () => {
      borrows.findActiveBorrow.mockResolvedValue(null);
      await expect(svc.returnBook('b1', 'u1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('listForUser', () => {
    it('returns paginated borrows with book data', async () => {
      const br1 = baseBorrow('br1', 'b1', 'u1');
      const br2 = baseBorrow('br2', 'b2', 'u1');

      borrows.listActiveByUser.mockResolvedValue({
        borrowIds: ['br1', 'br2'],
        total: 2,
      });
      borrows.findByIds.mockResolvedValue([br1, br2]);

      const proj1 = {
        ...baseBook('b1'),
        likeCount: 0,
        commentCount: 0,
        avgRating: 0,
        ratingsCount: 0,
      };
      const proj2 = {
        ...baseBook('b2'),
        likeCount: 0,
        commentCount: 0,
        avgRating: 0,
        ratingsCount: 0,
      };
      readModel.attachToBorrows.mockResolvedValue(
        new Map([
          ['b1', proj1],
          ['b2', proj2],
        ]),
      );

      const result = await svc.listForUser('u1', 1, 10);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].borrow.id).toBe('br1');
      expect(result.data[0].book.id).toBe('b1');
      expect(result.data[1].borrow.id).toBe('br2');
      expect(result.data[1].book.id).toBe('b2');
      expect(result.meta.total).toBe(2);
    });

    it('returns empty list when user has no borrows', async () => {
      borrows.listActiveByUser.mockResolvedValue({ borrowIds: [], total: 0 });
      const result = await svc.listForUser('u1', 1, 10);
      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    it('skips borrows whose book is missing from the read model', async () => {
      const br1 = baseBorrow('br1', 'b1', 'u1');

      borrows.listActiveByUser.mockResolvedValue({
        borrowIds: ['br1'],
        total: 1,
      });
      borrows.findByIds.mockResolvedValue([br1]);
      readModel.attachToBorrows.mockResolvedValue(new Map());

      const result = await svc.listForUser('u1', 1, 10);
      expect(result.data).toHaveLength(0);
    });
  });
});
