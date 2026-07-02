import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { DrizzleMembershipRepository } from './infrastructure/drizzle-membership.repository';
import { MEMBERSHIP_REPOSITORY } from './domain/membership.repository';
import type { MembershipRepository } from './domain/membership.repository';
import { MembershipService } from './application/membership.service';
import { StripeWebhookService } from './application/stripe-webhook.service';
import { MembershipController } from './presentation/membership.controller';
import { StripeWebhookController } from './presentation/stripe-webhook.controller';

const alias = (token: symbol, impl: unknown) => ({
  provide: token,
  useExisting: impl,
});

@Module({
  imports: [IamModule, TransactionsModule],
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
