// Transactions feature module. Imports BooksModule to receive the
// BookRepository, BookReadModel, and Database (the borrow flow needs
// to lock a book row + decrement stock atomically). Provides its own
// borrow/purchase repositories and the shared Stripe client.
import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { BooksModule } from '../books/books.module';
import { DrizzleBorrowRepository } from './infrastructure/drizzle-borrow.repository';
import { DrizzlePurchaseRepository } from './infrastructure/drizzle-purchase.repository';
import { stripeProvider } from './infrastructure/stripe.provider';
import { BORROW_REPOSITORY } from './domain/borrow';
import type { BorrowRepository } from './domain/borrow';
import { PURCHASE_REPOSITORY } from './domain/purchase';
import type { PurchaseRepository } from './domain/purchase';
import { BorrowsService } from './application/borrows.service';
import { CheckoutService } from './application/checkout.service';
import { PurchaseConfirmationService } from './application/purchase-confirmation.service';
import { TransactionsController } from './presentation/transactions.controller';

const alias = (token: symbol, impl: unknown) => ({
  provide: token,
  useExisting: impl,
});

@Module({
  imports: [IamModule, BooksModule],
  controllers: [TransactionsController],
  providers: [
    DrizzleBorrowRepository,
    DrizzlePurchaseRepository,
    stripeProvider,
    BorrowsService,
    CheckoutService,
    PurchaseConfirmationService,
    alias(BORROW_REPOSITORY, DrizzleBorrowRepository),
    alias(PURCHASE_REPOSITORY, DrizzlePurchaseRepository),
  ],
  exports: [
    BorrowsService,
    CheckoutService,
    PurchaseConfirmationService,
    BORROW_REPOSITORY,
    PURCHASE_REPOSITORY,
  ],
})
export class TransactionsModule {}

export type { BorrowRepository, PurchaseRepository };
