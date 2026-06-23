// Shared Stripe client. One instance per app, configured from typed
// CoreConfigService. Both CheckoutService and PurchaseConfirmationService
// inject it.
import { Provider } from '@nestjs/common';
import StripeConstructor from 'stripe';
import { CoreConfigService } from '../../core/config/config.provider';

export type StripeClient = ReturnType<typeof StripeConstructor>;

export const STRIPE = Symbol('STRIPE');

export const stripeProvider: Provider = {
  provide: STRIPE,
  inject: [CoreConfigService],
  useFactory: (config: CoreConfigService): StripeClient =>
    new StripeConstructor(config.stripe.secretKey),
};
