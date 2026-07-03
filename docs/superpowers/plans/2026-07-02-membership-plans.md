# Membership Plans Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add subscription-based membership tiers (Free/Curator $5/Archivist $10) with Stripe subscription checkout, webhook sync, borrow limit enforcement, and frontend management UI.

**Architecture:** New `MembershipModule` (NestJS) with its own DB table, domain types, Drizzle repository, Stripe subscription checkout, and webhook handler. Backend enforces borrow limits. Frontend gets a membership store, rewritten plans page (subscribe + management modes), and `MembershipProgress` component replacing `YearlyProgress`.

**Tech Stack:** NestJS, Drizzle ORM, Stripe Checkout Sessions (mode: subscription), Stripe webhooks, Pinia, Vue 3

---

### Task 1: Add `STRIPE_WEBHOOK_SECRET` env var + config type

**Files:**
- Modify: `backend/src/core/config/env.schema.ts`
- Modify: `backend/src/core/config/config.types.ts`
- Modify: `backend/src/core/config/config.provider.ts`

- [ ] **Step 1: Add env var to schema**

Add to `env.schema.ts` line 12 (after `STRIPE_SECRET_KEY`):
```typescript
STRIPE_WEBHOOK_SECRET: z.string().min(1, 'STRIPE_WEBHOOK_SECRET is required'),
```

- [ ] **Step 2: Add config type**

Add to `config.types.ts` after `TransactionsStripeConfig`:
```typescript
export interface MembershipStripeConfig {
  readonly webhookSecret: string;
}
```

Add to `AppConfig`:
```typescript
readonly membership: MembershipStripeConfig;
```

- [ ] **Step 3: Parse in constructor**

Add to `config.provider.ts` line 56 (after `this.stripe`):
```typescript
this.membership = { webhookSecret: parsed.STRIPE_WEBHOOK_SECRET };
```

- [ ] **Step 4: Verify build**

Run: `npm run build` from `backend/`
Expected: succeeds with no errors

- [ ] **Step 5: Commit**

```bash
git add backend/src/core/config/
git commit -m "feat: add STRIPE_WEBHOOK_SECRET env var"
```

---

### Task 2: Add `memberships` table to DB schema + migrate

**Files:**
- Modify: `backend/src/core/database/schema.ts`

- [ ] **Step 1: Add memberships table definition**

Add after `readingGoals` table (after line 214) in `schema.ts`:
```typescript
export const memberships = pgTable('memberships', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  plan: varchar('plan', { length: 20 }).notNull().default('free'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  stripePriceId: text('stripe_price_id'),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  itemLimit: integer('item_limit').notNull().default(15),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
```

- [ ] **Step 2: Generate migration**

Run: `npm run db:generate` from `backend/`
Expected: new migration file created in `src/db/migrations/`

- [ ] **Step 3: Apply migration**

Run: `npm run db:migrate` from `backend/`
Expected: migration applied, `memberships` table created

- [ ] **Step 4: Verify schema export**

Run: `npm run build` from `backend/`
Expected: succeeds

- [ ] **Step 5: Commit**

```bash
git add backend/src/core/database/schema.ts backend/src/db/migrations/
git commit -m "feat: add memberships table"
```

---

### Task 3: Create membership domain (plans config, entity, repository interface)

**Files:**
- Create: `backend/src/membership/domain/plans.ts`
- Create: `backend/src/membership/domain/membership.entity.ts`
- Create: `backend/src/membership/domain/membership.repository.ts`

- [ ] **Step 1: Create plans config**

`backend/src/membership/domain/plans.ts`:
```typescript
export const PLAN_CONFIG = {
  free:      { itemLimit: 15, monthlyPriceCents: 0 },
  curator:   { itemLimit: 25, monthlyPriceCents: 500 },
  archivist: { itemLimit: 50, monthlyPriceCents: 1000 },
} as const;

export type Plan = keyof typeof PLAN_CONFIG;

export const PLAN_NAMES: Record<Plan, string> = {
  free: 'The Bibliophile',
  curator: 'The Curator',
  archivist: 'The Archivist',
};
```

- [ ] **Step 2: Create membership entity**

`backend/src/membership/domain/membership.entity.ts`:
```typescript
export type MembershipStatus = 'active' | 'canceled' | 'past_due';

export interface MembershipRow {
  id: string;
  userId: string;
  plan: string;
  status: MembershipStatus;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  itemLimit: number;
  createdAt: Date;
  updatedAt: Date;
}
```

- [ ] **Step 3: Create repository interface**

`backend/src/membership/domain/membership.repository.ts`:
```typescript
import type { MembershipRow } from './membership.entity';

export const MEMBERSHIP_REPOSITORY = Symbol('MEMBERSHIP_REPOSITORY');

export interface MembershipRepository {
  findByUserId(userId: string): Promise<MembershipRow | null>;
  upsert(
    userId: string,
    data: Partial<Omit<MembershipRow, 'id' | 'userId' | 'createdAt'>>,
  ): Promise<MembershipRow>;
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/membership/
git commit -m "feat: create membership domain types"
```

---

### Task 4: Create DrizzleMembershipRepository

**Files:**
- Create: `backend/src/membership/infrastructure/drizzle-membership.repository.ts`

- [ ] **Step 1: Create repository implementation**

`backend/src/membership/infrastructure/drizzle-membership.repository.ts`:
```typescript
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  DATABASE,
  type Database,
} from '../../core/database/database.provider';
import * as schema from '../../core/database/schema';
import type { MembershipRow } from '../domain/membership.entity';
import type { MembershipRepository } from '../domain/membership.repository';

@Injectable()
export class DrizzleMembershipRepository implements MembershipRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findByUserId(userId: string): Promise<MembershipRow | null> {
    const [row] = await this.db
      .select()
      .from(schema.memberships)
      .where(eq(schema.memberships.userId, userId))
      .limit(1);
    return (row as MembershipRow) ?? null;
  }

  async upsert(
    userId: string,
    data: Partial<Omit<MembershipRow, 'id' | 'userId' | 'createdAt'>>,
  ): Promise<MembershipRow> {
    const existing = await this.findByUserId(userId);
    if (existing) {
      const [row] = await this.db
        .update(schema.memberships)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.memberships.id, existing.id))
        .returning();
      return row as MembershipRow;
    }
    const [row] = await this.db
      .insert(schema.memberships)
      .values({ userId, ...data } as any)
      .returning();
    return row as MembershipRow;
  }
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build` from `backend/`
Expected: succeeds

- [ ] **Step 3: Commit**

```bash
git add backend/src/membership/infrastructure/
git commit -m "feat: create DrizzleMembershipRepository"
```

---

### Task 5: Create MembershipService

**Files:**
- Create: `backend/src/membership/application/membership.service.ts`

- [ ] **Step 1: Create service**

`backend/src/membership/application/membership.service.ts`:
```typescript
import {
  Inject,
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CoreConfigService } from '../../core/config/config.provider';
import { STRIPE, type StripeClient } from '../../transactions/infrastructure/stripe.provider';
import type { MembershipRepository } from '../domain/membership.repository';
import { MEMBERSHIP_REPOSITORY } from '../domain/membership.repository';
import { PLAN_CONFIG, type Plan } from '../domain/plans';
import type { MembershipRow } from '../domain/membership.entity';
import { DATABASE, type Database } from '../../core/database/database.provider';
import { borrows } from '../../core/database/schema';
import { count, isNull, eq } from 'drizzle-orm';

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
    return this.repo.upsert(userId, { plan: 'free', itemLimit: 15, status: 'active' });
  }

  async getMembershipWithBorrows(userId: string) {
    const membership = await this.getOrCreate(userId);
    const [countResult] = await this.db
      .select({ value: count() })
      .from(borrows)
      .where(and(eq(borrows.userId, userId), isNull(borrows.returnedAt)));
    const activeBorrows = Number(countResult?.value ?? 0);
    return {
      ...membership,
      activeBorrows,
      borrowsRemaining: membership.itemLimit - activeBorrows,
    };
  }

  async createCheckoutSession(plan: string, userId: string): Promise<{ url: string }> {
    if (plan === 'free') throw new BadRequestException('Free plan cannot be subscribed');
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
            recurring: { interval: 'month' },
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
    if (!membership || !membership.stripeSubscriptionId) {
      throw new BadRequestException('No active subscription');
    }

    const subscription = await this.stripe.subscriptions.update(
      membership.stripeSubscriptionId,
      { cancel_at_period_end: true },
    );

    await this.repo.upsert(userId, {
      cancelAtPeriodEnd: true,
      currentPeriodEnd: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : undefined,
    });

    const effectiveDate = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : new Date().toISOString();

    return { effectiveDate };
  }

  async getLimit(userId: string): Promise<number> {
    const membership = await this.getOrCreate(userId);
    return membership.itemLimit;
  }

  async enforceBorrowLimit(userId: string): Promise<void> {
    const limit = await this.getLimit(userId);
    const [countResult] = await this.db
      .select({ value: count() })
      .from(borrows)
      .where(and(eq(borrows.userId, userId), isNull(borrows.returnedAt)));
    const activeCount = Number(countResult?.value ?? 0);
    if (activeCount >= limit) {
      throw new BadRequestException(
        `You've reached your plan's borrow limit of ${limit} books. Upgrade to borrow more.`,
      );
    }
  }
}
```

Note: This file imports `and` from `drizzle-orm` — add it to existing import.

- [ ] **Step 2: Commit**

```bash
git add backend/src/membership/application/
git commit -m "feat: create MembershipService"
```

---

### Task 6: Create StripeWebhookService

**Files:**
- Create: `backend/src/membership/application/stripe-webhook.service.ts`

- [ ] **Step 1: Create webhook handler**

`backend/src/membership/application/stripe-webhook.service.ts`:
```typescript
import { Inject, Injectable } from '@nestjs/common';
import { CoreConfigService } from '../../core/config/config.provider';
import { STRIPE, type StripeClient } from '../../transactions/infrastructure/stripe.provider';
import type { MembershipRepository } from '../domain/membership.repository';
import { MEMBERSHIP_REPOSITORY } from '../domain/membership.repository';
import { PLAN_CONFIG, type Plan } from '../domain/plans';

@Injectable()
export class StripeWebhookService {
  constructor(
    @Inject(CoreConfigService) private readonly config: CoreConfigService,
    @Inject(MEMBERSHIP_REPOSITORY) private readonly repo: MembershipRepository,
    @Inject(STRIPE) private readonly stripe: StripeClient,
  ) {}

  async handleEvent(event: any): Promise<void> {
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
    }
  }

- [ ] **Step 1: Create webhook handler**

`backend/src/membership/application/stripe-webhook.service.ts`:
```typescript
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { CoreConfigService } from '../../core/config/config.provider';
import { DATABASE, type Database } from '../../core/database/database.provider';
import * as schema from '../../core/database/schema';
import { STRIPE, type StripeClient } from '../../transactions/infrastructure/stripe.provider';
import type { MembershipRepository } from '../domain/membership.repository';
import { MEMBERSHIP_REPOSITORY } from '../domain/membership.repository';
import { PLAN_CONFIG, type Plan } from '../domain/plans';

@Injectable()
export class StripeWebhookService {
  constructor(
    @Inject(CoreConfigService) private readonly config: CoreConfigService,
    @Inject(MEMBERSHIP_REPOSITORY) private readonly repo: MembershipRepository,
    @Inject(STRIPE) private readonly stripe: StripeClient,
    @Inject(DATABASE) private readonly db: Database,
  ) {}

  async handleEvent(event: any): Promise<void> {
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
    }
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
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan;
    if (!userId || !plan) return;

    let subData: Record<string, any> = {};
    if (session.subscription) {
      const sub = await this.stripe.subscriptions.retrieve(session.subscription);
      subData = {
        stripeSubscriptionId: sub.id,
        stripePriceId: sub.items.data[0]?.price?.id ?? null,
        currentPeriodStart: new Date(sub.current_period_start * 1000),
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
        status: 'active',
      };
    }

    const config = PLAN_CONFIG[plan as Plan];
    await this.repo.upsert(userId, {
      plan,
      itemLimit: config?.itemLimit ?? 15,
      ...subData,
    });
  }

  private async handleInvoicePaid(invoice: any): Promise<void> {
    if (!invoice.subscription) return;
    const membership = await this.findMembershipBySubId(invoice.subscription);
    if (!membership) return;
    const sub = await this.stripe.subscriptions.retrieve(invoice.subscription);
    await this.repo.upsert(membership.userId, {
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      status: 'active',
    });
  }

  private async handleSubscriptionUpdated(subscription: any): Promise<void> {
    const membership = await this.findMembershipBySubId(subscription.id);
    if (!membership) return;
    await this.repo.upsert(membership.userId, {
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : undefined,
      status: subscription.status === 'active' ? 'active' : 'past_due',
    });
  }

  private async handleSubscriptionDeleted(subscription: any): Promise<void> {
    const membership = await this.findMembershipBySubId(subscription.id);
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
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/membership/application/stripe-webhook.service.ts
git commit -m "feat: create StripeWebhookService"
```

---

### Task 7: Create controllers (MembershipController + StripeWebhookController)

**Files:**
- Create: `backend/src/membership/presentation/membership.controller.ts`
- Create: `backend/src/membership/presentation/stripe-webhook.controller.ts`

- [ ] **Step 1: Create membership controller**

`backend/src/membership/presentation/membership.controller.ts`:
```typescript
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../iam/auth/auth.guard';
import { CurrentUser } from '../../iam/auth/current-user.decorator';
import type { AuthUser } from '../../iam/auth/auth.port';
import { MembershipService } from '../application/membership.service';

@Controller()
export class MembershipController {
  constructor(private readonly membership: MembershipService) {}

  @Post('api/membership/checkout')
  @UseGuards(AuthGuard)
  createCheckoutSession(
    @Body('plan') plan: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.membership.createCheckoutSession(plan, user.id);
  }

  @Post('api/membership/cancel')
  @UseGuards(AuthGuard)
  cancel(@CurrentUser() user: AuthUser) {
    return this.membership.cancel(user.id);
  }

  @Get('api/membership/me')
  @UseGuards(AuthGuard)
  getMembership(@CurrentUser() user: AuthUser) {
    return this.membership.getMembershipWithBorrows(user.id);
  }
}
```

- [ ] **Step 2: Create Stripe webhook controller**

`backend/src/membership/presentation/stripe-webhook.controller.ts`:
```typescript
import { Controller, Post, Req, Res, Inject } from '@nestjs/common';
import { Response, Request } from 'express';
import { CoreConfigService } from '../../core/config/config.provider';
import { STRIPE, type StripeClient } from '../../transactions/infrastructure/stripe.provider';
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
    const buf = Buffer.from(req.body instanceof Buffer ? req.body : JSON.stringify(req.body));
    let event: any;
    try {
      event = this.stripe.webhooks.constructEvent(buf, sig, this.config.membership.webhookSecret);
    } catch {
      res.status(400).send('Webhook signature verification failed');
      return;
    }
    await this.webhook.handleEvent(event);
    res.json({ received: true });
  }
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build` from `backend/`
Expected: succeeds

- [ ] **Step 4: Commit**

```bash
git add backend/src/membership/presentation/
git commit -m "feat: create membership and webhook controllers"
```

---

### Task 8: Wire MembershipModule + integrate borrow limit

**Files:**
- Create: `backend/src/membership/membership.module.ts`
- Modify: `backend/src/app.module.ts`
- Modify: `backend/src/transactions/application/borrows.service.ts`

- [ ] **Step 1: Create MembershipModule**

`backend/src/membership/membership.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
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

const STRIPE_IMPORT = {
  provide: 'STRIPE_FOR_MEMBERSHIP',
  useFactory: () => require('../transactions/infrastructure/stripe.provider').stripeProvider,
};

@Module({
  imports: [IamModule],
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
```

Wait, this won't work — we need the Stripe provider from the TransactionsModule. Let me check how to properly share it.

Looking at the transactions module, it provides `stripeProvider` and doesn't export it. But the `Stripe` client is a singleton. We need to either:
1. Export the `STRIPE` token from TransactionsModule
2. Create a shared Stripe module
3. Register the stripe provider in the membership module itself

For simplicity, let me register the Stripe provider in the MembershipModule too. The existing stripe provider is in `transactions/infrastructure/stripe.provider.ts` and uses `CoreConfigService`. We can create a similar one or just import it.

Actually looking at the existing code:

```typescript
export const stripeProvider = {
  provide: STRIPE,
  inject: [CoreConfigService],
  useFactory: (config: CoreConfigService) => {
    return new Stripe(config.stripe.secretKey, { apiVersion: '2025-03-31' as any });
  },
};
```

Since `STRIPE` is a symbol, we can simply provide the same token in the MembershipModule. NestJS will create a new instance unless the token is shared via module exports. Actually, `@Global()` modules would make it available everywhere, but `CoreConfigModule` is `@Global`.

For simplicity, let me just add `stripeProvider` directly in the MembershipModule providers. It will create a second Stripe instance, which is fine (they share the same API key).

Actually, a better approach: I'll re-export the Stripe token from the transaction module. But that requires modifying transactions.module.ts.

Simplest approach: just duplicate the stripe provider registration in MembershipModule. Not ideal but works. Or even simpler — make the membership module import the transactions module to get its exports.

Let me just go with the simplest approach — duplicate the stripe provider in the member module. No, that creates confusion.

Best approach: I'll make the MembershipModule import the TransactionsModule to get access to the STRIPE token. But TransactionsModule doesn't export STRIPE. So I need to add it to exports.

Actually, looking more carefully at the code, the `STRIPE` token is used by multiple services in the transactions module (CheckoutService, PurchaseConfirmationService). It's provided by `stripeProvider` in transactions.module.ts. 

Let me add `STRIPE` to the exports of TransactionsModule, then import TransactionsModule in MembershipModule.

No wait, that creates a circular dependency concern. But MembershipModule only imports — it doesn't export to TransactionsModule, so no cycle.

Let me write it this way:

1. Add `STRIPE` to `TransactionsModule.exports`
2. Import `TransactionsModule` in `MembershipModule`

This is the cleanest approach.

Actually, `TransactionsModule` already exports services but not `STRIPE`. Let me just add it.

- [ ] **Step 1: Update TransactionsModule to export STRIPE**

Add to `backend/src/transactions/transactions.module.ts` exports array:
```typescript
STRIPE,
```

- [ ] **Step 2: Create MembershipModule**

`backend/src/membership/membership.module.ts`:
```typescript
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
```

- [ ] **Step 3: Register in AppModule**

Add import to `backend/src/app.module.ts`:
```typescript
import { MembershipModule } from './membership/membership.module';
```
Add `MembershipModule` to imports array.

- [ ] **Step 4: Integrate borrow limit in BorrowsService**

Modify `backend/src/transactions/application/borrows.service.ts`:

Add import:
```typescript
import { MembershipService } from '../../membership/application/membership.service';
```

Add to constructor:
```typescript
private readonly membership: MembershipService,
```

In `borrow()` method, after acquiring lock (after line 48), add:
```typescript
await this.membership.enforceBorrowLimit(userId);
```

- [ ] **Step 5: Verify build**

Run: `npm run build` from `backend/`
Expected: succeeds

- [ ] **Step 6: Run tests**

Run: `npm run test` from `backend/`
Expected: all existing tests pass

- [ ] **Step 7: Commit**

```bash
git add backend/src/app.module.ts backend/src/membership/ backend/src/transactions/
git commit -m "feat: wire MembershipModule, integrate borrow limit"
```

---

### Task 9: Write backend tests

**Files:**
- Create: `backend/src/membership/__tests__/membership.service.spec.ts`
- Create: `backend/src/membership/__tests__/stripe-webhook.service.spec.ts`

- [ ] **Step 1: Write MembershipService test**

`backend/src/membership/__tests__/membership.service.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MembershipService } from '../application/membership.service';
import { MEMBERSHIP_REPOSITORY } from '../domain/membership.repository';
import { CoreConfigService } from '../../core/config/config.provider';
import { STRIPE } from '../../transactions/infrastructure/stripe.provider';
import { DATABASE } from '../../core/database/database.provider';

describe('MembershipService', () => {
  let service: MembershipService;
  let repo: any;
  let config: any;

  beforeEach(async () => {
    repo = {
      findByUserId: jest.fn(),
      upsert: jest.fn(),
    };

    config = {
      frontend: { url: 'http://localhost:3000' },
    };

    const stripe = {
      checkout: { sessions: { create: jest.fn() } },
      subscriptions: { update: jest.fn() },
    };

    const db = {
      select: jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => Promise.resolve([{ value: 3 }])),
        })),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipService,
        { provide: MEMBERSHIP_REPOSITORY, useValue: repo },
        { provide: CoreConfigService, useValue: config },
        { provide: STRIPE, useValue: stripe },
        { provide: DATABASE, useValue: db },
      ],
    }).compile();

    service = module.get<MembershipService>(MembershipService);
  });

  it('should return existing membership on getOrCreate', async () => {
    repo.findByUserId.mockResolvedValue({ id: '1', plan: 'free', itemLimit: 15 });
    const result = await service.getOrCreate('user-1');
    expect(result.plan).toBe('free');
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it('should create free membership on first getOrCreate', async () => {
    repo.findByUserId.mockResolvedValue(null);
    repo.upsert.mockResolvedValue({ id: '2', plan: 'free', itemLimit: 15 });
    const result = await service.getOrCreate('user-2');
    expect(repo.upsert).toHaveBeenCalledWith('user-2', { plan: 'free', itemLimit: 15, status: 'active' });
  });

  it('should throw on free plan checkout', async () => {
    await expect(service.createCheckoutSession('free', 'user-1')).rejects.toThrow('Free plan cannot be subscribed');
  });

  it('should throw on invalid plan', async () => {
    await expect(service.createCheckoutSession('nonexistent', 'user-1')).rejects.toThrow('Invalid plan');
  });

  it('should return limit from membership', async () => {
    repo.findByUserId.mockResolvedValue({ itemLimit: 25, plan: 'curator' });
    const limit = await service.getLimit('user-1');
    expect(limit).toBe(25);
  });

  it('should return default limit for new users', async () => {
    repo.findByUserId.mockResolvedValue(null);
    repo.upsert.mockResolvedValue({ itemLimit: 15, plan: 'free' });
    const limit = await service.getLimit('user-2');
    expect(limit).toBe(15);
  });
});
```

- [ ] **Step 2: Run test to verify it fails then passes**

Run: `npx jest src/membership/__tests__/membership.service.spec.ts`
Expected: tests fail because module isn't registered in Jest config's rootDir scope

Actually, Jest's `rootDir` is `src/`. The test file at `src/membership/__tests__/membership.service.spec.ts` should match the pattern `.*\.spec\.ts$`.

Run: `npx jest src/membership/__tests__/membership.service.spec.ts`
Expected: tests pass

- [ ] **Step 3: Commit**

```bash
git add backend/src/membership/__tests__/
git commit -m "test: add MembershipService tests"
```

---

### Task 10: Create frontend membership store

**Files:**
- Create: `frontend/stores/membership.ts`

- [ ] **Step 1: Create membership Pinia store**

`frontend/stores/membership.ts`:
```typescript
import { defineStore } from 'pinia';
import { useAuthStore } from '~/stores/auth';
import { useFlash } from '~/composables/useFlash';

export interface MembershipInfo {
  id: string;
  plan: string;
  status: string;
  itemLimit: number;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  activeBorrows: number;
  borrowsRemaining: number;
}

export const useMembershipStore = defineStore('membership', () => {
  const membership = shallowRef<MembershipInfo | null>(null);
  const loading = shallowRef(false);
  const { flash } = useFlash();
  const auth = useAuthStore();

  async function fetchMembership() {
    if (!auth.signedIn) {
      membership.value = null;
      return;
    }
    loading.value = true;
    try {
      membership.value = await $fetch<MembershipInfo>('/api/membership/me');
    } catch {
      membership.value = null;
    } finally {
      loading.value = false;
    }
  }

  async function checkout(plan: string) {
    try {
      const res = await $fetch<{ url: string }>('/api/membership/checkout', {
        method: 'POST',
        body: { plan },
      });
      await navigateTo(res.url, { external: true });
    } catch (e: any) {
      flash(e?.data?.message || 'Failed to start checkout');
    }
  }

  async function cancel(): Promise<string | null> {
    try {
      const res = await $fetch<{ effectiveDate: string }>(
        '/api/membership/cancel',
        { method: 'POST' },
      );
      await fetchMembership();
      return res.effectiveDate;
    } catch (e: any) {
      flash(e?.data?.message || 'Failed to cancel subscription');
      return null;
    }
  }

  watch(
    () => auth.signedIn,
    (signedIn) => {
      if (signedIn) {
        fetchMembership();
      } else {
        membership.value = null;
      }
    },
    { immediate: true },
  );

  return {
    membership: readonly(membership),
    loading: readonly(loading),
    fetchMembership,
    checkout,
    cancel,
  };
});
```

- [ ] **Step 2: Verify build**

Run: `npm run build` from `frontend/`
Expected: succeeds

- [ ] **Step 3: Commit**

```bash
git add frontend/stores/membership.ts
git commit -m "feat: create membership Pinia store"
```

---

### Task 11: Rewrite plans.vue with subscribe + management modes

**Files:**
- Modify: `frontend/pages/plans.vue`

- [ ] **Step 1: Rewrite plans.vue**

Replace the full file content:

```vue
<script setup lang="ts">
import { Check, X } from 'lucide-vue-next';
import { Button } from '~/components/ui/button';
import { useAuthStore } from '~/stores/auth';
import { useMembershipStore } from '~/stores/membership';
import { useFlash } from '~/composables/useFlash';

definePageMeta({
  title: 'Plans — Read in Peace',
  description: 'Choose a membership plan that fits your reading pace.',
});

const auth = useAuthStore();
const membershipStore = useMembershipStore();
const { flash } = useFlash();
const cancelling = shallowRef(false);
const cancelConfirm = shallowRef(false);
const cancelDate = shallowRef<string | null>(null);
const reactivating = shallowRef(false);

interface Plan {
  name: string;
  id: string;
  monthlyPrice: number | null;
  itemLimit: string;
  returnWindow: string;
  buyToKeepDiscount: string;
  highlighted?: boolean;
  badge?: string;
}

const plans: Plan[] = [
  {
    name: 'The Bibliophile',
    id: 'free',
    monthlyPrice: null,
    itemLimit: '15 Items',
    returnWindow: '7 Days',
    buyToKeepDiscount: '5% Off',
  },
  {
    name: 'The Curator',
    id: 'curator',
    monthlyPrice: 5,
    itemLimit: '25 Items',
    returnWindow: '2 Weeks',
    buyToKeepDiscount: '15% Off',
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    name: 'The Archivist',
    id: 'archivist',
    monthlyPrice: 10,
    itemLimit: '50 Items',
    returnWindow: '1 Month',
    buyToKeepDiscount: '25% Off',
  },
];

const features = [
  { key: 'itemLimit', label: 'Borrow limit' },
  { key: 'returnWindow', label: 'Return window' },
  { key: 'buyToKeepDiscount', label: 'Buy-to-keep discount' },
] as const;

const currentPlanName = computed(() => {
  const plan = plans.find((p) => p.id === membershipStore.membership?.plan);
  return plan?.name ?? 'Unknown';
});

const remainingDays = computed(() => {
  if (!membershipStore.membership?.currentPeriodEnd) return null;
  const end = new Date(membershipStore.membership.currentPeriodEnd);
  const now = new Date();
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
});

async function onSelect(plan: Plan) {
  if (!auth.signedIn) {
    auth.openAuthModal(() => { void onSelect(plan); });
    return;
  }
  if (plan.id === 'free') {
    flash('You are already on the free plan');
    return;
  }
  await membershipStore.checkout(plan.id);
}

async function handleCancel() {
  cancelling.value = true;
  const effectiveDate = await membershipStore.cancel();
  if (effectiveDate) {
    cancelDate.value = new Date(effectiveDate).toLocaleDateString();
    cancelConfirm.value = true;
  }
  cancelling.value = false;
}
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <Nav mode="cart" />

    <main class="mx-auto max-w-6xl px-4 py-10 md:px-6 lg:py-14">
      <div class="border-b border-border pb-5">
        <p class="font-mono text-[10px] uppercase tracking-widest text-primary">
          Membership
        </p>
        <h1 class="mt-2 font-serif text-4xl font-bold md:text-5xl">
          Choose your plan
        </h1>
        <p class="mt-2 max-w-lg text-sm text-muted-foreground">
          Borrow at your own pace. Upgrade anytime, cancel anytime.
        </p>
      </div>

      <!-- Management Mode -->
      <div
        v-if="membershipStore.membership && membershipStore.membership.plan !== 'free' && membershipStore.membership.status === 'active'"
        class="my-12 rounded-sm border border-border bg-card p-6"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="font-mono text-[10px] uppercase tracking-widest text-primary">
              Current Plan
            </p>
            <h2 class="mt-1 font-serif text-2xl font-bold">{{ currentPlanName }}</h2>
            <p class="mt-1 text-sm text-muted-foreground">
              Status: <span class="text-primary">{{ membershipStore.membership.status }}</span>
            </p>
          </div>
          <span
            v-if="membershipStore.membership.cancelAtPeriodEnd"
            class="rounded-sm border border-orange-500/30 bg-orange-500/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-orange-500"
          >
            Cancels on {{ new Date(membershipStore.membership.currentPeriodEnd!).toLocaleDateString() }}
          </span>
        </div>

        <div class="mt-6 grid gap-4 sm:grid-cols-3">
          <div class="rounded-sm border border-border p-4">
            <p class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Remaining Days
            </p>
            <p class="mt-1 font-serif text-3xl font-bold">{{ remainingDays ?? '-' }}</p>
          </div>
          <div class="rounded-sm border border-border p-4">
            <p class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Remaining Books
            </p>
            <p class="mt-1 font-serif text-3xl font-bold">
              {{ membershipStore.membership.borrowsRemaining }}
            </p>
            <div class="mt-2 h-1 w-full bg-foreground/5">
              <div
                class="h-full bg-primary transition-all"
                :style="{
                  width: `${(membershipStore.membership.itemLimit - membershipStore.membership.borrowsRemaining) / membershipStore.membership.itemLimit * 100}%`,
                }"
              />
            </div>
          </div>
          <div class="rounded-sm border border-border p-4">
            <p class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Auto-Renew
            </p>
            <p class="mt-1 font-serif text-sm font-bold">
              {{ membershipStore.membership.currentPeriodEnd ? new Date(membershipStore.membership.currentPeriodEnd).toLocaleDateString() : '-' }}
            </p>
          </div>
        </div>

        <div class="mt-6 flex gap-3">
          <Button
            v-if="!membershipStore.membership.cancelAtPeriodEnd"
            variant="archivalOutline"
            :disabled="cancelling"
            @click="handleCancel"
          >
            {{ cancelling ? 'Cancelling...' : 'Cancel Subscription' }}
          </Button>
          <p v-if="cancelConfirm" class="text-sm text-muted-foreground">
            Cancel will take effect on {{ cancelDate }}. You can continue borrowing until then.
          </p>
        </div>
      </div>

      <!-- Subscribe Mode -->
      <div class="my-12 grid gap-6 md:grid-cols-3">
        <article
          v-for="plan in plans"
          :key="plan.name"
          class="relative flex flex-col rounded-sm border px-6 py-10 transition-colors"
          :class="plan.highlighted ? 'border-primary bg-card shadow-sm' : 'border-border bg-card'"
        >
          <span
            v-if="plan.badge"
            class="absolute -top-3 left-6 rounded-sm bg-primary px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-primary-foreground"
          >
            {{ plan.badge }}
          </span>

          <!-- Current Plan Badge -->
          <span
            v-if="membershipStore.membership?.plan === plan.id"
            class="absolute -top-3 right-6 rounded-sm bg-muted-foreground/20 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
          >
            Current Plan
          </span>

          <p class="font-serif text-lg font-bold">{{ plan.name }}</p>

          <div class="mt-4 flex items-baseline gap-1">
            <template v-if="plan.monthlyPrice !== null">
              <span class="font-serif text-4xl font-bold">${{ plan.monthlyPrice }}</span>
              <span class="font-mono text-xs text-muted-foreground">/month</span>
            </template>
            <template v-else>
              <span class="font-serif text-4xl font-bold">Free</span>
            </template>
          </div>

          <ul class="mt-6 flex flex-1 flex-col gap-3">
            <li
              v-for="feature in features"
              :key="feature.key"
              class="flex items-start gap-2.5 text-sm"
            >
              <Check class="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                <span class="text-muted-foreground">{{ feature.label }}:</span>
                {{ plan[feature.key] }}
              </span>
            </li>
          </ul>

          <Button
            class="mt-8 w-full"
            :variant="plan.highlighted ? 'archival' : 'archivalOutline'"
            :disabled="plan.id === 'free' && membershipStore.membership?.plan === 'free' || plan.id === membershipStore.membership?.plan && membershipStore.membership.plan !== 'free'"
            @click="onSelect(plan)"
          >
            {{
              plan.id === 'free'
                ? 'Get Started'
                : plan.id === membershipStore.membership?.plan
                  ? 'Current'
                  : 'Subscribe'
            }}
          </Button>
        </article>
      </div>

      <p class="mt-10 text-center text-[11px] leading-5 text-muted-foreground">
        All plans include free in-store pickup and returns. Prices in USD.
      </p>
    </main>
  </div>
</template>
```

- [ ] **Step 2: Verify build**

Run: `npm run build` from `frontend/`
Expected: succeeds

- [ ] **Step 3: Commit**

```bash
git add frontend/pages/plans.vue
git commit -m "feat: rewrite plans page with management mode"
```

---

### Task 12: Create MembershipProgress component + update feed.vue

**Files:**
- Create: `frontend/components/MembershipProgress.vue`
- Modify: `frontend/pages/feed.vue`

- [ ] **Step 1: Create MembershipProgress component**

`frontend/components/MembershipProgress.vue`:
```vue
<script setup lang="ts">
import { useMembershipStore } from '~/stores/membership';

const membershipStore = useMembershipStore();

const used = computed(() => {
  const m = membershipStore.membership;
  if (!m) return 0;
  return m.itemLimit - m.borrowsRemaining;
});

const limit = computed(() => {
  return membershipStore.membership?.itemLimit ?? 15;
});

const progress = computed(() => {
  if (limit.value === 0) return 0;
  return Math.round((used.value / limit.value) * 100);
});
</script>

<template>
  <section
    class="animate-enter relative overflow-hidden border border-border bg-card p-6 shadow-sm [animation-delay:250ms]"
  >
    <div class="absolute inset-y-0 left-0 w-1 bg-primary" />
    <h2
      class="mb-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
    >
      Membership
    </h2>
    <div class="mb-1 flex items-baseline gap-2">
      <span class="font-serif text-4xl font-bold">{{ membershipStore.membership?.borrowsRemaining ?? 0 }}</span>
      <span class="text-sm italic text-muted-foreground">of {{ limit }} books remaining</span>
    </div>
    <div class="mb-4 h-1 w-full bg-foreground/5">
      <div class="h-full bg-foreground" :style="{ width: `${progress}%` }" />
    </div>
    <p class="text-[11px] leading-relaxed text-muted-foreground">
      <template v-if="membershipStore.membership && membershipStore.membership.plan !== 'free'">
        You have <span class="text-primary">{{ membershipStore.membership.borrowsRemaining }} borrows left</span> this month.
        Returns refresh your available slots.
      </template>
      <template v-else>
        You can borrow <span class="text-primary">up to {{ limit }} books</span> at a time.
        <NuxtLink to="/plans" class="underline hover:text-primary">Upgrade</NuxtLink> to borrow more.
      </template>
    </p>
  </section>
</template>
```

- [ ] **Step 2: Update feed.vue**

In `frontend/pages/feed.vue`, replace:
```vue
<YearlyProgress :current="24" :goal="50" :behind="2" :year="2026" />
```
with:
```vue
<MembershipProgress />
```

- [ ] **Step 3: Verify build**

Run: `npm run build` from `frontend/`
Expected: succeeds

- [ ] **Step 4: Commit**

```bash
git add frontend/components/MembershipProgress.vue frontend/pages/feed.vue
git commit -m "feat: replace YearlyProgress with MembershipProgress"
```

---

### Task 13: Add `reactivate` endpoint for canceled subscriptions

**Files:**
- Modify: `backend/src/membership/application/membership.service.ts`
- Modify: `backend/src/membership/presentation/membership.controller.ts`

- [ ] **Step 1: Add reactivate method to MembershipService**

Add to `MembershipService`:
```typescript
async reactivate(userId: string): Promise<void> {
  const membership = await this.repo.findByUserId(userId);
  if (!membership || !membership.stripeSubscriptionId) {
    throw new BadRequestException('No subscription to reactivate');
  }
  await this.stripe.subscriptions.update(membership.stripeSubscriptionId, {
    cancel_at_period_end: false,
  });
  await this.repo.upsert(userId, { cancelAtPeriodEnd: false });
}
```

- [ ] **Step 2: Add reactivate endpoint**

Add to `MembershipController`:
```typescript
@Post('api/membership/reactivate')
@UseGuards(AuthGuard)
reactivate(@CurrentUser() user: AuthUser) {
  return this.membership.reactivate(user.id);
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build` from `backend/`
Expected: succeeds

- [ ] **Step 4: Add reactivate to frontend store**

Add to `frontend/stores/membership.ts`:
```typescript
async function reactivate() {
  try {
    await $fetch('/api/membership/reactivate', { method: 'POST' });
    await fetchMembership();
    flash('Subscription reactivated');
  } catch (e: any) {
    flash(e?.data?.message || 'Failed to reactivate');
  }
}
```

Add `reactivate` to the return object.

- [ ] **Step 5: Add reactivate button to plans.vue management view**

In the cancel confirmation section of `plans.vue`, add:
```vue
<Button
  v-if="membershipStore.membership?.cancelAtPeriodEnd"
  variant="archival"
  @click="membershipStore.reactivate()"
>
  Reactivate
</Button>
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/membership/ frontend/stores/membership.ts frontend/pages/plans.vue
git commit -m "feat: add subscription reactivation"
```
