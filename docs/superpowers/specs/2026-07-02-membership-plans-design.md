# Membership Plans Design

**Date:** 2026-07-02

## Summary

Add a subscription-based membership system with three tiers (Free, Curator $5/mo, Archivist $10/mo). Free plan is assigned by default on signup. Users subscribe via Stripe Checkout Sessions with `mode: 'subscription'`. A Stripe webhook keeps membership state in sync. Borrow limits are enforced on the backend. Cancelation takes effect at period end.

## Scope

### Backend
- New `memberships` table + `MembershipModule`
- Stripe subscription checkout + webhook handler
- Borrow limit integration (backend rejection + frontend toast)
- Lazy assignment of free plan on first access

### Frontend
- Rewrite `plans.vue` — subscription checkout + membership management view
- New `membership` Pinia store
- `YearlyProgress.vue` → `MembershipProgress.vue` showing remaining books
- `feed.vue` updates to pass membership data instead of hardcoded props

---

## Database Schema

### `memberships` table (new)

```typescript
export const memberships = pgTable('memberships', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(cuid),
  userId: varchar('userId', { length: 36 }).notNull().references(() => user.id),
  plan: varchar('plan', { length: 20 }).notNull().$default(() => 'free'),
  status: varchar('status', { length: 20 }).notNull().$default(() => 'active'),
  stripeSubscriptionId: varchar('stripeSubscriptionId', { length: 255 }),
  stripePriceId: varchar('stripePriceId', { length: 255 }),
  currentPeriodStart: timestamp('currentPeriodStart'),
  currentPeriodEnd: timestamp('currentPeriodEnd'),
  cancelAtPeriodEnd: boolean('cancelAtPeriodEnd').notNull().default(false),
  itemLimit: integer('itemLimit').notNull().default(15),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});
```

## Plan Configuration

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

## Backend Architecture

### Module Structure

```
membership/
├── domain/
│   ├── membership.repository.ts   — findByUserId, upsert, list
│   ├── membership.entity.ts       — MembershipRow type, MembershipStatus
│   └── plans.ts                   — PLAN_CONFIG, Plan type
├── application/
│   ├── membership.service.ts      — createCheckoutSession, cancel, getOrCreate, getLimit
│   └── stripe-webhook.service.ts  — handleEvent dispatcher
├── infrastructure/
│   ├── drizzle-membership.repository.ts
│   └── membership-stripe.provider.ts  — STRIPE token from existing provider
├── presentation/
│   ├── membership.controller.ts   — /api/membership/checkout, /cancel, /me
│   └── stripe-webhook.controller.ts — POST /api/stripe/webhook (raw body, no auth)
└── membership.module.ts
```

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/membership/checkout` | AuthGuard | Create Stripe subscription session, returns `{ url }` |
| `POST` | `/api/membership/cancel` | AuthGuard | Set `cancelAtPeriodEnd = true`, returns `{ effectiveDate }` |
| `GET` | `/api/membership/me` | AuthGuard | Return current membership + active borrow count |
| `POST` | `/api/stripe/webhook` | None (sig) | Stripe event handler |

### Stripe Subscription Flow

1. Frontend calls `POST /api/membership/checkout { plan: 'curator' }`
2. Backend creates Checkout Session: `mode: 'subscription'`, `line_items[0].price_data.recurring.interval: 'month'`, `unit_amount: 500`, `metadata: { userId }`
3. Success URL: `{frontend}/dashboard?membership=success`
4. Cancel URL: `{frontend}/plans`
5. After payment, Stripe redirects browser → frontend dashboard
6. Stripe sends `checkout.session.completed` webhook → backend creates/updates membership row
7. Subsequent webhooks: `invoice.paid` (renew period), `customer.subscription.updated` (cancel sync), `customer.subscription.deleted` (downgrade to free)

### Webhook Security

- Endpoint receives raw body (required for Stripe signature verification)
- Uses `stripe.webhooks.constructEvent(body, signature, webhookSecret)` from env `STRIPE_WEBHOOK_SECRET`
- Ignores events with unknown user IDs
- Idempotent: checks event ID before processing

### Cancelation Logic

- `POST /api/membership/cancel` calls `stripe.subscriptions.update(subId, { cancel_at_period_end: true })` and returns `{ effectiveDate: currentPeriodEnd }`
- Webhook `customer.subscription.updated` syncs `cancelAtPeriodEnd` to DB
- When `currentPeriodEnd` passes and subscription is `cancel_at_period_end: true`, Stripe fires `customer.subscription.deleted` → backend downgrades to free

### Borrow Limit Enforcement

In `BorrowsService.borrow()`:
```typescript
// After acquiring lock on book, before allowing borrow:
const limit = await this.membershipService.getLimit(userId);
const activeCount = await this.borrows.countActive(userId);
if (activeCount >= limit) {
  throw new BadRequestException(
    `You've reached your plan's borrow limit of ${limit} books. Upgrade to borrow more.`,
  );
}
```

The frontend catches the 400 error and shows a flash toast. It can also preemptively check via `membership.borrowsRemaining`.

### Free Plan Assignment

`getOrCreate(userId)` is called lazily:
- In `GET /api/membership/me` — if no row exists, creates one with `plan: 'free'`
- In `BorrowsService.borrow()` enforcement check
- This avoids needing a signup hook and handles users who existed before the feature

## Frontend Architecture

### Membership Store (`frontend/stores/membership.ts`)

```typescript
export const useMembershipStore = defineStore('membership', () => {
  const membership = ref<{
    plan: string;
    status: string;
    itemLimit: number;
    currentPeriodEnd: string | null;
    currentPeriodStart: string | null;
    cancelAtPeriodEnd: boolean;
    borrowsRemaining: number;
  } | null>(null);
  const loading = shallowRef(false);

  async function fetchMembership() { /* GET /api/membership/me */ }
  async function checkout(plan: string) { /* POST → navigateTo(url) */ }
  async function cancel(): Promise<string | null> { /* POST → return effectiveDate */ }

  // Watch auth.signedIn: fetch on login, clear on logout
  return { membership, loading, fetchMembership, checkout, cancel };
});
```

### Plans Page (`frontend/pages/plans.vue`)

Two modes based on `membership.plan`:

**Subscribe mode** (free plan user or no membership): Existing card layout, but `onSelect` calls `membership.checkout(plan)` and navigates to Stripe. Free plan card shows "Current Plan" badge.

**Management mode** (paid plan user):
- Shows current plan name with "Active" badge
- Metadata section: remaining days, remaining books (with progress bar), auto-renew date
- Cancel button → confirmation dialog → shows "Cancel will take effect on X date"
- After cancel: shows "Cancels on X" with reactivate option (calls Stripe to unset `cancel_at_period_end`)

### MembershipProgress (`frontend/components/MembershipProgress.vue`)

Replaces `YearlyProgress.vue`. Props change from `{ current, goal, behind, year }` to being driven by the membership store.

```typescript
const membershipStore = useMembershipStore();
const used = computed(() => membershipStore.membership?.itemLimit ?? 15 - membershipStore.membership?.borrowsRemaining ?? 0);
const limit = computed(() => membershipStore.membership?.itemLimit ?? 15);
```

Display: "24 of 25 books" with progress bar. Description: "You have X borrows remaining this month."

If user is on free plan, also shows "Upgrade to borrow more" link.

`feed.vue` replaces `<YearlyProgress>` with `<MembershipProgress />` and removes hardcoded prop passing.

### Error Handling

| Scenario | Backend | Frontend |
|----------|---------|----------|
| Borrow at limit | 400 `BadRequestException` | Flash toast with plan upgrade prompt |
| Stripe checkout failure | 502 from proxy | Flash "Checkout unavailable" |
| Webhook signature invalid | 400, ignored | N/A |
| Cancel already canceled sub | 400 | Flash "Already canceled" |
| Network error on fetch | N/A | Flash with retry option |

### Edge Cases

| Case | Behavior |
|------|----------|
| User existed before feature | Free plan assigned on first `GET /me` or borrow |
| User tries to subscribe while already subscribed | 400 — must cancel first, or redirect to management |
| Stripe payment fails | Webhook fires `invoice.payment_failed` → status = `past_due` |
| User reactivates after cancel | `POST /api/membership/reactivate` → unsets cancel_at_period_end |
| Downgrade at period end | Webhook `customer.subscription.deleted` → plan = free, itemLimit = 15 |
| User has 20 borrowed books, downgrades to free (limit 15) | Cannot borrow new books until they return to ≤ 15 |
| Session expires during Stripe checkout | Stripe handles redirect; logged-out user sees login gate at success URL |
