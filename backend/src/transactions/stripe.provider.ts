// NestJS factory provider that creates a Stripe client from STRIPE_SECRET_KEY.
// Throws if the key is missing, preventing the app from starting without Stripe configured.
import { Provider, InternalServerErrorException } from '@nestjs/common';
import StripeConstructor from 'stripe';

export const STRIPE = 'STRIPE';

export const stripeProvider: Provider = {
  provide: STRIPE,
  useFactory() {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      throw new InternalServerErrorException('Stripe is not configured');
    }
    return new StripeConstructor(stripeKey);
  },
};
