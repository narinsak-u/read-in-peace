import { Controller, Post, Req, Res, Inject } from '@nestjs/common';
import type { Response, Request } from 'express';
import { CoreConfigService } from '../../core/config/config.provider';
import {
  STRIPE,
  type StripeClient,
} from '../../transactions/infrastructure/stripe.provider';
import { StripeWebhookService } from '../application/stripe-webhook.service';

@Controller()
export class StripeWebhookController {
  constructor(
    private readonly config: CoreConfigService,
    @Inject(STRIPE) private readonly stripe: StripeClient,
    private readonly webhook: StripeWebhookService,
  ) {}

  @Post('api/stripe/webhook')
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    const sig = req.headers['stripe-signature'] as string;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const raw: unknown = (req as any).rawBody;
    const buf =
      raw instanceof Buffer ? raw : Buffer.from(JSON.stringify(req.body));
    let event: any;
    try {
      event = this.stripe.webhooks.constructEvent(
        buf,
        sig,
        this.config.membership.webhookSecret,
      );
    } catch {
      res.status(400).send('Webhook signature verification failed');
      return;
    }

    await this.webhook.handleEvent(event);
    res.json({ received: true });
  }
}
