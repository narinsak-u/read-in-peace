// MembershipService — domain logic for membership lifecycle.
// Responsibilities:
//   - getOrCreate: lazy-assign a free plan on first access
//   - getMembershipWithBorrows: return membership + active borrow count
//   - createCheckoutSession: create Stripe subscription, return redirect URL
//   - cancel: mark Stripe sub as cancel_at_period_end, persist effective date
//   - reactivate: unset cancel_at_period_end on Stripe
//   - getLimit / enforceBorrowLimit: gate the borrow flow by plan limits
import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { and, count, eq, isNull } from 'drizzle-orm';
import { CoreConfigService } from '../../core/config/config.provider';
import {
  DATABASE,
  type Database,
  type DatabaseOrTransaction,
} from '../../core/database/database.provider';
import * as schema from '../../core/database/schema';
import {
  STRIPE,
  type StripeClient,
} from '../../transactions/infrastructure/stripe.provider';
import type { MembershipRepository } from '../domain/membership.repository';
import { MEMBERSHIP_REPOSITORY } from '../domain/membership.repository';
import { PLAN_CONFIG, type Plan } from '../domain/plans';
import type { MembershipRow } from '../domain/membership.entity';

export interface MembershipWithBorrows extends MembershipRow {
  activeBorrows: number;
  borrowsRemaining: number;
}

const SUCCESS_PATH = '/dashboard?membership=success';
const CANCEL_PATH = '/plans';

@Injectable()
export class MembershipService {
  constructor(
    @Inject(CoreConfigService) private readonly config: CoreConfigService,
    @Inject(MEMBERSHIP_REPOSITORY) private readonly repo: MembershipRepository,
    @Inject(STRIPE) private readonly stripe: StripeClient,
    @Inject(DATABASE) private readonly db: Database,
  ) {}

  async getOrCreate(userId: string): Promise<MembershipRow> {
    const existing = await this.repo.findByUserId(userId);
    if (existing) return existing;
    return this.repo.upsert(userId, {
      plan: 'free',
      itemLimit: 15,
      status: 'active',
    });
  }

  async getMembershipWithBorrows(
    userId: string,
  ): Promise<MembershipWithBorrows> {
    const membership = await this.getOrCreate(userId);
    const activeBorrows = await this.countActiveBorrows(userId);
    return {
      ...membership,
      activeBorrows,
      borrowsRemaining: membership.itemLimit - activeBorrows,
    };
  }

  async createCheckoutSession(
    plan: string,
    userId: string,
  ): Promise<{ url: string }> {
    if (plan === 'free')
      throw new BadRequestException('Free plan cannot be subscribed');
    const config = PLAN_CONFIG[plan as Plan];
    if (!config || config.monthlyPriceCents === 0) {
      throw new BadRequestException('Invalid plan');
    }

    const membership = await this.getOrCreate(userId);
    const isActive =
      membership.status === 'active' &&
      !membership.cancelAtPeriodEnd &&
      (!membership.currentPeriodEnd ||
        membership.currentPeriodEnd > new Date());
    if (membership.plan !== 'free' && isActive) {
      throw new BadRequestException('Already subscribed to a plan');
    }

    let session;
    try {
      session = await this.stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: { name: `Read in Peace — ${plan}` },
              unit_amount: config.monthlyPriceCents,
              recurring: { interval: 'month' as const },
            },
            quantity: 1,
          },
        ],
        metadata: { userId, plan },
        success_url: `${this.config.frontend.url}${SUCCESS_PATH}`,
        cancel_url: `${this.config.frontend.url}${CANCEL_PATH}`,
      });
    } catch {
      throw new BadRequestException(
        'Could not create checkout session. Please try again.',
      );
    }

    if (!session.url) {
      throw new BadRequestException('Checkout session has no URL');
    }
    return { url: session.url };
  }

  async cancel(userId: string): Promise<{ effectiveDate: string }> {
    const membership = await this.repo.findByUserId(userId);
    const effectiveDate = new Date().toISOString();

    if (!membership?.stripeSubscriptionId) {
      await this.repo.upsert(userId, {
        cancelAtPeriodEnd: true,
        currentPeriodEnd: new Date(),
      });
      return { effectiveDate };
    }

    interface StripeSubSnapshot {
      current_period_end: number | null;
      current_period_start: number | null;
    }
    let subscription;
    try {
      subscription = await this.stripe.subscriptions.update(
        membership.stripeSubscriptionId,
        { cancel_at_period_end: true },
      );
    } catch (err: any) {
      if (
        err?.code === 'resource_missing' ||
        /No such subscription/i.test(err?.message ?? '')
      ) {
        await this.repo.upsert(userId, {
          cancelAtPeriodEnd: true,
          stripeSubscriptionId: null,
          status: 'canceled',
        });
        return { effectiveDate: new Date().toISOString() };
      }
      throw new BadRequestException('Failed to cancel subscription');
    }
    const sub = subscription as unknown as StripeSubSnapshot;
    const periodEnd = sub.current_period_end;

    const effectiveDateFormatted =
      periodEnd != null && isFinite(periodEnd)
        ? new Date(periodEnd * 1000).toISOString()
        : effectiveDate;

    await this.repo.upsert(userId, {
      cancelAtPeriodEnd: true,
      currentPeriodEnd:
        periodEnd != null && isFinite(periodEnd)
          ? new Date(periodEnd * 1000)
          : undefined,
    });

    return { effectiveDate: effectiveDateFormatted };
  }

  async reactivate(userId: string): Promise<void> {
    const membership = await this.repo.findByUserId(userId);
    if (!membership?.cancelAtPeriodEnd) {
      throw new BadRequestException(
        'Subscription is not scheduled for cancellation',
      );
    }
    if (!membership?.stripeSubscriptionId) {
      await this.repo.upsert(userId, { cancelAtPeriodEnd: false });
      return;
    }
    try {
      await this.stripe.subscriptions.update(membership.stripeSubscriptionId, {
        cancel_at_period_end: false,
      });
      await this.repo.upsert(userId, { cancelAtPeriodEnd: false });
    } catch {
      throw new BadRequestException('Failed to reactivate subscription');
    }
  }

  async getLimit(userId: string): Promise<number> {
    const membership = await this.getOrCreate(userId);
    return membership.itemLimit;
  }

  async enforceBorrowLimit(
    userId: string,
    tx?: DatabaseOrTransaction,
  ): Promise<void> {
    const limit = await this.getLimit(userId);
    const activeCount = await this.countActiveBorrows(userId, tx);
    if (activeCount >= limit) {
      throw new BadRequestException(
        `You've reached your plan's borrow limit of ${limit} books. Upgrade to borrow more.`,
      );
    }
  }

  private async countActiveBorrows(
    userId: string,
    tx?: DatabaseOrTransaction,
  ): Promise<number> {
    const db = tx ?? this.db;
    const [result] = await db
      .select({ value: count() })
      .from(schema.borrows)
      .where(
        and(
          eq(schema.borrows.userId, userId),
          isNull(schema.borrows.returnedAt),
        ),
      );
    return Number(result?.value ?? 0);
  }
}
