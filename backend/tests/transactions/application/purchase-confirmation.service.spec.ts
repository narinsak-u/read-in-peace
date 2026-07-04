import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PurchaseConfirmationService } from '../../../src/transactions/application/purchase-confirmation.service';
import {
  BOOK_REPOSITORY,
  BOOK_READ_MODEL,
  type BookRepository,
  type BookReadModel,
} from '../../../src/books/domain/book.repository';
import {
  PURCHASE_REPOSITORY,
  type PurchaseRepository,
  type PurchaseRow,
} from '../../../src/transactions/domain/purchase';
import {
  STRIPE,
  type StripeClient,
} from '../../../src/transactions/infrastructure/stripe.provider';
import {
  DATABASE,
  type Database,
} from '../../../src/core/database/database.provider';

const fakePurchase = (
  id: string,
  bookId: string,
  userId: string,
): PurchaseRow => ({
  id,
  bookId,
  userId,
  purchasedAt: new Date(),
});

describe('PurchaseConfirmationService', () => {
  let svc: PurchaseConfirmationService;
  let books: jest.Mocked<BookRepository>;
  let purchases: jest.Mocked<PurchaseRepository>;
  let readModel: jest.Mocked<BookReadModel>;
  let stripe: jest.Mocked<StripeClient>;
  let db: { transaction: jest.Mock };

  const mockTx = {};
  const baseSession = {
    id: 'cs_1',
    amount_total: null,
    payment_status: 'paid' as const,
    metadata: { userId: 'u1', bookId: 'b1' },
  };
  const baseBatchSession = {
    id: 'cs_cart',
    amount_total: null,
    payment_status: 'paid' as const,
    metadata: { userId: 'u1', bc: '2', b0: 'b1', b1: 'b2' },
  };

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

    purchases = {
      findExisting: jest.fn(),
      record: jest.fn(),
      listForUser: jest.fn(),
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

    stripe = {
      checkout: {
        sessions: {
          retrieve: jest.fn(),
        },
      },
    } as unknown as jest.Mocked<StripeClient>;

    db = {
      transaction: jest.fn().mockImplementation((cb) => cb(mockTx)),
    };

    const mod = await Test.createTestingModule({
      providers: [
        PurchaseConfirmationService,
        { provide: DATABASE, useValue: db },
        { provide: BOOK_REPOSITORY, useValue: books },
        { provide: PURCHASE_REPOSITORY, useValue: purchases },
        { provide: BOOK_READ_MODEL, useValue: readModel },
        { provide: STRIPE, useValue: stripe },
      ],
    }).compile();

    svc = mod.get<PurchaseConfirmationService>(PurchaseConfirmationService);
  });

  describe('confirm', () => {
    it('confirms a single-book purchase', async () => {
      stripe.checkout.sessions.retrieve.mockResolvedValue(baseSession);
      purchases.findExisting.mockResolvedValue(null);
      purchases.record.mockResolvedValue(fakePurchase('p1', 'b1', 'u1'));

      const result = await svc.confirm('cs_1', 'u1');

      expect(stripe.checkout.sessions.retrieve).toHaveBeenCalledWith('cs_1', { expand: ['payment_intent'] });
      expect(db.transaction).toHaveBeenCalled();
      expect(purchases.record).toHaveBeenCalledWith('b1', 'u1', 'cs_1', null, null, mockTx);
      expect(books.decrementStock).toHaveBeenCalledWith('b1', mockTx);
      expect(result).toMatchObject({ bookId: 'b1', userId: 'u1' });
    });

    it('rejects when payment is not paid', async () => {
      stripe.checkout.sessions.retrieve.mockResolvedValue({
        payment_status: 'unpaid',
        metadata: { userId: 'u1', bookId: 'b1' },
      });

      await expect(svc.confirm('cs_1', 'u1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects when userId does not match', async () => {
      stripe.checkout.sessions.retrieve.mockResolvedValue(baseSession);

      await expect(svc.confirm('cs_1', 'u2')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('confirms a batch purchase from cart', async () => {
      stripe.checkout.sessions.retrieve.mockResolvedValue(baseBatchSession);
      purchases.findExisting.mockResolvedValue(null);
      purchases.record.mockResolvedValue(fakePurchase('p1', 'b1', 'u1'));

      const result = await svc.confirm('cs_cart', 'u1');

      expect(result).toEqual(['b1', 'b2']);
      expect(purchases.record).toHaveBeenCalledTimes(2);
      expect(books.decrementStock).toHaveBeenCalledTimes(2);
    });

    it('skips already-purchased books in a batch', async () => {
      stripe.checkout.sessions.retrieve.mockResolvedValue(baseBatchSession);
      purchases.findExisting.mockResolvedValueOnce({ id: 'existing' });
      purchases.findExisting.mockResolvedValueOnce(null);
      purchases.record.mockResolvedValue(fakePurchase('p2', 'b2', 'u1'));

      const result = await svc.confirm('cs_cart', 'u1');

      expect(result).toEqual(['b2']);
      expect(purchases.record).toHaveBeenCalledTimes(1);
      expect(books.decrementStock).toHaveBeenCalledTimes(1);
    });

    it('throws when no book IDs in metadata', async () => {
      stripe.checkout.sessions.retrieve.mockResolvedValue({
        payment_status: 'paid',
        metadata: { userId: 'u1' },
      });

      await expect(svc.confirm('cs_empty', 'u1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('listForUser', () => {
    it('returns purchases with book details', async () => {
      const row = fakePurchase('p1', 'b1', 'u1');
      purchases.listForUser.mockResolvedValue([{ row, bookId: 'b1' }]);
      readModel.attachToPurchases.mockResolvedValue(
        new Map([['b1', { id: 'b1' } as never]]),
      );

      const result = await svc.listForUser('u1');

      expect(result).toHaveLength(1);
      expect(result[0].purchase.id).toBe('p1');
      expect(result[0].book.id).toBe('b1');
    });

    it('filters out purchases with missing books', async () => {
      const row = fakePurchase('p1', 'b1', 'u1');
      purchases.listForUser.mockResolvedValue([{ row, bookId: 'b1' }]);
      readModel.attachToPurchases.mockResolvedValue(new Map());

      const result = await svc.listForUser('u1');

      expect(result).toHaveLength(0);
    });
  });
});
