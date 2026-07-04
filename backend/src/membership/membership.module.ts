// MembershipModule — subscription plans, Stripe subscription checkout, and
// borrow-limit enforcement. Imports:
//   IamModule — for AuthGuard and CurrentUser decorator
//   TransactionsModule (forwardRef) — for the shared Stripe client (STRIPE)
//     and PurchaseConfirmationService (used by the webhook for book purchases)
// Exposes MembershipService for cross-module use by BorrowsService.

import { Module, forwardRef } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { DrizzleMembershipRepository } from './infrastructure/drizzle-membership.repository';
import { MEMBERSHIP_REPOSITORY } from './domain/membership.repository';

import { MembershipService } from './application/membership.service';
import { StripeWebhookService } from './application/stripe-webhook.service';
import { MembershipController } from './presentation/membership.controller';
import { StripeWebhookController } from './presentation/stripe-webhook.controller';

const alias = (token: symbol, impl: unknown) => ({
  provide: token,
  useExisting: impl,
});

@Module({
  imports: [IamModule, forwardRef(() => TransactionsModule)],
  controllers: [MembershipController, StripeWebhookController],
  providers: [
    DrizzleMembershipRepository,
    MembershipService,
    StripeWebhookService,
    alias(MEMBERSHIP_REPOSITORY, DrizzleMembershipRepository),
  ],
  exports: [MembershipService],
})
export class MembershipModule {}
