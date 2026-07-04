const mockStripeCreate = jest.fn();

jest.mock('stripe', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: mockStripeCreate,
      },
    },
  })),
}));

import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CoreConfigService } from '../../../src/core/config/config.provider';
import { CheckoutService } from '../../../src/transactions/application/checkout.service';
import {
  BOOK_REPOSITORY,
  type BookPricing,
  type BookRepository,
} from '../../../src/books/domain/book.repository';
import { STRIPE } from '../../../src/transactions/infrastructure/stripe.provider';
import { MembershipService } from '../../../src/membership/application/membership.service';

const fakeBook = (id: string, inStock: number, price: string): BookPricing => ({
  id,
  title: `Book ${id}`,
  price,
  category: 'Fiction',
  inStock,
  isAvailable: inStock > 1,
});

const makeBookRepo = (books: BookPricing[]): Partial<BookRepository> => ({
  findById: () => Promise.resolve(null),
  findByIdOrSlug: () => Promise.resolve(null),
  findOwner: () => Promise.resolve(null),
  findPricingForPurchase: (ids) =>
    Promise.resolve(books.filter((b) => ids.includes(b.id))),
  create: () => Promise.resolve({} as never),
  update: () => Promise.resolve(null),
  delete: () => Promise.resolve(false),
  incrementStock: () => Promise.resolve(undefined),
  decrementStock: () => Promise.resolve(null),
});

const buildService = (books: BookPricing[]) =>
  Test.createTestingModule({
    providers: [
      CheckoutService,
      {
        provide: CoreConfigService,
        useValue: {
          stripe: { secretKey: 'sk_test' },
          frontend: { url: 'https://rip.test' },
        },
      },
      {
        provide: BOOK_REPOSITORY,
        useValue: makeBookRepo(books),
      },
      {
        provide: STRIPE,
        useValue: {
          checkout: { sessions: { create: mockStripeCreate } },
        },
      },
      {
        provide: MembershipService,
        useValue: {
          getOrCreate: jest
            .fn()
            .mockResolvedValue({ plan: 'free' }),
          getMembershipWithBorrows: jest.fn(),
          createCheckoutSession: jest.fn(),
          cancel: jest.fn(),
          reactivate: jest.fn(),
          getLimit: jest.fn(),
          enforceBorrowLimit: jest.fn(),
        },
      },
    ],
  });

describe('CheckoutService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('forBook', () => {
    it('rejects a book with inStock <= 1 (borrow-only)', async () => {
      const svc = (
        await buildService([fakeBook('b1', 1, '25.00')]).compile()
      ).get<CheckoutService>(CheckoutService);
      await expect(svc.forBook('b1', 'u1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('throws NotFound when the book is missing', async () => {
      const svc = (await buildService([]).compile()).get<CheckoutService>(
        CheckoutService,
      );
      await expect(svc.forBook('b1', 'u1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('creates a single-book session with the configured URLs', async () => {
      const svc = (
        await buildService([fakeBook('b1', 3, '25.00')]).compile()
      ).get<CheckoutService>(CheckoutService);
      mockStripeCreate.mockResolvedValue({ url: 'https://stripe.test/cs_1' });
      const result = await svc.forBook('b1', 'u1');
      expect(result.url).toBe('https://stripe.test/cs_1');
      expect(mockStripeCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { bookId: 'b1', userId: 'u1' },
          success_url: expect.stringContaining('/dashboard?tab=purchased'),
          cancel_url: expect.stringContaining('/book/b1'),
        }),
      );
    });
  });

  describe('forCart', () => {
    it('rejects an empty cart', async () => {
      const svc = (await buildService([]).compile()).get<CheckoutService>(
        CheckoutService,
      );
      await expect(svc.forCart([], 'u1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('packs book IDs into bc/bN metadata', async () => {
      const svc = (
        await buildService([
          fakeBook('b1', 3, '20.00'),
          fakeBook('b2', 3, '30.00'),
        ]).compile()
      ).get<CheckoutService>(CheckoutService);
      mockStripeCreate.mockResolvedValue({
        url: 'https://stripe.test/cs_cart',
      });
      await svc.forCart(['b1', 'b2'], 'u1');
      expect(mockStripeCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            userId: 'u1',
            bc: '2',
            b0: 'b1',
            b1: 'b2',
          },
        }),
      );
    });

    it('applies discounts to the line item amount', async () => {
      const svc = (
        await buildService([
          fakeBook('b1', 5, '20.00'),
          fakeBook('b2', 5, '20.00'),
          fakeBook('b3', 5, '20.00'),
        ]).compile()
      ).get<CheckoutService>(CheckoutService);
      mockStripeCreate.mockResolvedValue({
        url: 'https://stripe.test/cs_cart',
      });

      // 3 books at $20 = $60.
      // Tier discount (3 books) = 20% = $12.
      // Category bonus (3 books in same cat) = 10% = $6.
      // Running total = $60 - $12 - $6 = $42.
      // Plan discount (free = 5%) = $2.10.
      // Total = $42 - $2.10 = $39.90 = 3990 cents.
      await svc.forCart(['b1', 'b2', 'b3'], 'u1');
      expect(mockStripeCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [
            expect.objectContaining({
              price_data: expect.objectContaining({
                unit_amount: 3990,
              }),
            }),
          ],
        }),
      );
    });
  });
});
