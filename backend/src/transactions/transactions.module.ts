// Module for borrow/purchase transactions. Registers the Stripe provider alongside the service and controller.
import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { stripeProvider } from './stripe.provider';

@Module({
  controllers: [TransactionsController],
  providers: [TransactionsService, stripeProvider],
})
export class TransactionsModule {}
