// CheckoutService — Stripe single-book and cart checkout session creation.
// Hides the borrow-only rule (inStock<=1), the discount pipeline, and the
// success/cancel URL construction.
import {
  Inject,
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CoreConfigService } from '../../core/config/config.provider';
import { BOOK_REPOSITORY } from '../../books/domain/book.repository';
import type { BookRepository } from '../../books/domain/book.repository';
import { applyDiscounts } from '../domain/pricing';
import { STRIPE, type StripeClient } from '../infrastructure/stripe.provider';

const SUCCESS_PATH =
  '/dashboard?tab=purchased&session_id={CHECKOUT_SESSION_ID}';

@Injectable()
export class CheckoutService {
  constructor(
    private readonly config: CoreConfigService,
    @Inject(BOOK_REPOSITORY) private readonly books: BookRepository,
    @Inject(STRIPE) private readonly stripe: StripeClient,
  ) {}

  async forBook(bookId: string, userId: string): Promise<{ url: string }> {
    const [book] = await this.books.findPricingForPurchase([bookId]);
    if (!book) throw new NotFoundException('Book not found');
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
      success_url: `${this.config.frontend.url}${SUCCESS_PATH}`,
      cancel_url: `${this.config.frontend.url}/book/${bookId}`,
    });

    return { url: session.url ?? '' };
  }

  async forCart(bookIds: string[], userId: string): Promise<{ url: string }> {
    if (!bookIds || bookIds.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const books = await this.books.findPricingForPurchase(bookIds);
    if (books.length !== bookIds.length) {
      throw new NotFoundException('One or more books not found');
    }

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
              name: `Read in Peace — ${bookIds.length} book${bookIds.length > 1 ? 's' : ''}`,
            },
            unit_amount: discount.total,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        bc: String(bookIds.length),
        ...Object.fromEntries(bookIds.map((id, i) => [`b${i}`, id])),
      },
      success_url: `${this.config.frontend.url}${SUCCESS_PATH}`,
      cancel_url: `${this.config.frontend.url}/feed`,
    });

    return { url: session.url ?? '' };
  }
}
