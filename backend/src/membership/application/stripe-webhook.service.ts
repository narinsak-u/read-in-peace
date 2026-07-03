// StripeWebhookService — process incoming Stripe webhook events for both
// membership subscriptions and book purchase checkouts.
// Events handled:
//   checkout.session.completed → route to membership (plan metadata) or
//     purchase (bookId/bc metadata) via PurchaseConfirmationService
//   invoice.paid → extend current subscription period
//   customer.subscription.updated → sync cancelAtPeriodEnd / status
//   customer.subscription.deleted → downgrade to free plan
// Idempotency: tracks processed event IDs in memory to guard against
// duplicate deliveries.
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../core/database/database.provider';
import * as schema from '../../core/database/schema';
import {
  STRIPE,
  type StripeClient,
} from '../../transactions/infrastructure/stripe.provider';
import type { MembershipRepository } from '../domain/membership.repository';
import { MEMBERSHIP_REPOSITORY } from '../domain/membership.repository';
import { PLAN_CONFIG, type Plan } from '../domain/plans';
import { PurchaseConfirmationService } from '../../transactions/application/purchase-confirmation.service';

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */

@Injectable()
export class StripeWebhookService {
  private readonly processedEventIds = new Set<string>();

  constructor(
    @Inject(MEMBERSHIP_REPOSITORY) private readonly repo: MembershipRepository,
    @Inject(STRIPE) private readonly stripe: StripeClient,
    @Inject(DATABASE) private readonly db: Database,
    private readonly purchaseConfirmation: PurchaseConfirmationService,
  ) {}

  async handleEvent(event: any): Promise<void> {
    const eventId: string | undefined = event.id;
    if (eventId && this.processedEventIds.has(eventId)) return;

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object);
        break;
      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object);
        break;
      default:
        break;
    }

    if (eventId) this.processedEventIds.add(eventId);
  }

  private async findMembershipBySubId(subId: string) {
    const [row] = await this.db
      .select()
      .from(schema.memberships)
      .where(eq(schema.memberships.stripeSubscriptionId, subId))
      .limit(1);
    return row ?? null;
  }

  private async handleCheckoutCompleted(session: any): Promise<void> {
    if (session.metadata?.plan) {
      await this.handleMembershipCheckout(session);
      return;
    }
    if (session.metadata?.bookId || session.metadata?.bc) {
      await this.purchaseConfirmation.recordFromSession(session);
    }
  }

  private async handleMembershipCheckout(session: any): Promise<void> {
    const userId: string | undefined = session.metadata?.userId;
    const plan: string | undefined = session.metadata?.plan;
    if (!userId || !plan) return;

    const config = PLAN_CONFIG[plan as Plan];
    const upsertData: Record<string, unknown> = {
      plan,
      itemLimit: config?.itemLimit ?? 15,
      status: 'active',
    };

    if (session.subscription) {
      const sub: any = await this.stripe.subscriptions.retrieve(
        session.subscription as string,
      );
      upsertData.stripeSubscriptionId = sub.id as string;
      upsertData.stripePriceId =
        (sub.items?.data?.[0]?.price?.id as string) ?? null;
      if (sub.current_period_start) {
        upsertData.currentPeriodStart = new Date(
          (sub.current_period_start as number) * 1000,
        );
      }
      if (sub.current_period_end) {
        upsertData.currentPeriodEnd = new Date(
          (sub.current_period_end as number) * 1000,
        );
      }
    }

    await this.repo.upsert(userId, upsertData);
  }

  private async handleInvoicePaid(invoice: any): Promise<void> {
    if (!invoice.subscription) return;
    const membership = await this.findMembershipBySubId(
      invoice.subscription as string,
    );
    if (!membership) return;
    const sub: any = await this.stripe.subscriptions.retrieve(
      invoice.subscription as string,
    );
    await this.repo.upsert(membership.userId, {
      currentPeriodStart: sub.current_period_start
        ? new Date((sub.current_period_start as number) * 1000)
        : undefined,
      currentPeriodEnd: sub.current_period_end
        ? new Date((sub.current_period_end as number) * 1000)
        : undefined,
      status: 'active',
    });
  }

  private async handleSubscriptionUpdated(subscription: any): Promise<void> {
    const membership = await this.findMembershipBySubId(
      subscription.id as string,
    );
    if (!membership) return;
    await this.repo.upsert(membership.userId, {
      cancelAtPeriodEnd:
        (subscription.cancel_at_period_end as boolean) ?? false,
      currentPeriodEnd: subscription.current_period_end
        ? new Date((subscription.current_period_end as number) * 1000)
        : undefined,
      status: subscription.status === 'active' ? 'active' : 'past_due',
    });
  }

  private async handleSubscriptionDeleted(subscription: any): Promise<void> {
    const membership = await this.findMembershipBySubId(
      subscription.id as string,
    );
    if (!membership) return;
    await this.repo.upsert(membership.userId, {
      plan: 'free',
      itemLimit: 15,
      status: 'canceled',
      stripeSubscriptionId: null,
      stripePriceId: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    });
  }
}
