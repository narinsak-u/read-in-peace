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

  async getMembershipWithBorrows(userId: string) {
    const membership = await this.getOrCreate(userId);
    const [countResult] = await this.db
      .select({ value: count() })
      .from(schema.borrows)
      .where(
        and(
          eq(schema.borrows.userId, userId),
          isNull(schema.borrows.returnedAt),
        ),
      );
    const activeBorrows = Number(countResult?.value ?? 0);
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
    if (membership.plan !== 'free' && membership.status === 'active') {
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

    const subscription = await this.stripe.subscriptions.update(
      membership.stripeSubscriptionId,
      { cancel_at_period_end: true },
    );

    const periodEnd = (subscription as any).current_period_end as
      | number
      | null
      | undefined;

    await this.repo.upsert(userId, {
      cancelAtPeriodEnd: true,
      currentPeriodEnd: periodEnd
        ? new Date(periodEnd * 1000)
        : undefined,
    });

    const effectiveDate = periodEnd
      ? new Date(periodEnd * 1000).toISOString()
      : new Date().toISOString();

    return { effectiveDate };
  }

  async reactivate(userId: string): Promise<void> {
    const membership = await this.repo.findByUserId(userId);
    if (!membership?.stripeSubscriptionId) {
      throw new BadRequestException('No subscription to reactivate');
    }
    await this.stripe.subscriptions.update(membership.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });
    await this.repo.upsert(userId, { cancelAtPeriodEnd: false });
  }

  async getLimit(userId: string): Promise<number> {
    const membership = await this.getOrCreate(userId);
    return membership.itemLimit;
  }

  async enforceBorrowLimit(userId: string): Promise<void> {
    const limit = await this.getLimit(userId);
    const [countResult] = await this.db
      .select({ value: count() })
      .from(schema.borrows)
      .where(
        and(
          eq(schema.borrows.userId, userId),
          isNull(schema.borrows.returnedAt),
        ),
      );
    const activeCount = Number(countResult?.value ?? 0);
    if (activeCount >= limit) {
      throw new BadRequestException(
        `You've reached your plan's borrow limit of ${limit} books. Upgrade to borrow more.`,
      );
    }
  }
}
