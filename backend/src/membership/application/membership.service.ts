import {
  Inject,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { and, count, eq, isNull } from 'drizzle-orm';
import { CoreConfigService } from '../../core/config/config.provider';
import { DATABASE, type Database } from '../../core/database/database.provider';
import * as schema from '../../core/database/schema';
import { STRIPE, type StripeClient } from '../../transactions/infrastructure/stripe.provider';
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
      (!membership.currentPeriodEnd || membership.currentPeriodEnd > new Date());
    if (membership.plan !== 'free' && isActive) {
      throw new BadRequestException('Already subscribed to a plan');
    }

    const session = await this.stripe.checkout.sessions.create({
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

    return { url: session.url ?? '' };
  }

  async cancel(userId: string): Promise<{ effectiveDate: string }> {
    const membership = await this.repo.findByUserId(userId);
    if (!membership?.stripeSubscriptionId) {
      throw new BadRequestException('No active subscription');
    }

    interface StripeSubSnapshot {
      current_period_end: number | null;
      current_period_start: number | null;
    }
    const subscription = await this.stripe.subscriptions.update(
      membership.stripeSubscriptionId,
      { cancel_at_period_end: true },
    );
    const sub = subscription as unknown as StripeSubSnapshot;
    const periodEnd = sub.current_period_end;

    const effectiveDate =
      periodEnd != null && isFinite(periodEnd)
        ? new Date(periodEnd * 1000).toISOString()
        : new Date().toISOString();

    await this.repo.upsert(userId, {
      cancelAtPeriodEnd: true,
      currentPeriodEnd:
        periodEnd != null && isFinite(periodEnd)
          ? new Date(periodEnd * 1000)
          : undefined,
    });

    return { effectiveDate };
  }

  async reactivate(userId: string): Promise<void> {
    const membership = await this.repo.findByUserId(userId);
    if (!membership?.stripeSubscriptionId) {
      throw new BadRequestException('No subscription to reactivate');
    }
    if (!membership.cancelAtPeriodEnd) {
      throw new BadRequestException(
        'Subscription is not scheduled for cancellation',
      );
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

  async enforceBorrowLimit(userId: string): Promise<void> {
    const limit = await this.getLimit(userId);
    const activeCount = await this.countActiveBorrows(userId);
    if (activeCount >= limit) {
      throw new BadRequestException(
        `You've reached your plan's borrow limit of ${limit} books. Upgrade to borrow more.`,
      );
    }
  }

  private async countActiveBorrows(userId: string): Promise<number> {
    const [result] = await this.db
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
