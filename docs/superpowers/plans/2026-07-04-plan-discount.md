# Membership Plan Discount Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add membership-plan-based discount to purchase checkout, displayed in cart.

**Architecture:** Add `planDiscountPercent` parameter to existing `applyDiscounts()` pipeline (applied as final step). Backend `CheckoutService` looks up user's plan via `MembershipService.getOrCreate()` and passes the percent. Frontend `discount.ts` mirrors the logic, cart page shows breakdown.

**Tech Stack:** NestJS, Drizzle ORM, Stripe, Vue 3, Pinia

---

### Task 1: Add plan discount to backend pricing domain

**Files:**
- Modify: `backend/src/transactions/domain/pricing.ts`
- Test: `backend/tests/transactions/domain/pricing.spec.ts`

- [ ] **Step 1: Add plan discount constant and update types**

`backend/src/transactions/domain/pricing.ts`:

Add before `const EVERY_X_CENTS`:
```typescript
export const PLAN_DISCOUNT: Record<string, number> = {
  free: 5,
  curator: 15,
  archivist: 25,
};
```

Update `DiscountResult`:
```typescript
export interface DiscountResult {
  subtotal: number;
  tierPercent: number;
  tierDiscount: number;
  categoryBonus: number;
  every100Discount: number;
  planDiscount: number;
  total: number;
}
```

- [ ] **Step 2: Add planDiscountPercent parameter to applyDiscounts**

Replace the function signature and add the plan discount step. The section after `every100Discount`:

```typescript
export function applyDiscounts(
  books: DiscountInput[],
  planDiscountPercent: number = 0,
): DiscountResult {
  const subtotal = books.reduce(
    (sum, b) => sum + Math.round(Number(b.price) * 100),
    0,
  );

  const count = books.length;
  const tierPercent = count >= 4 ? 30 : count === 3 ? 20 : count === 2 ? 10 : 0;
  const tierDiscount = Math.round(subtotal * (tierPercent / 100));
  let runningTotal = subtotal - tierDiscount;

  const catSubtotals = new Map<string, { subtotal: number; count: number }>();
  for (const book of books) {
    const price = Math.round(Number(book.price) * 100);
    const existing = catSubtotals.get(book.category) ?? {
      subtotal: 0,
      count: 0,
    };
    existing.subtotal += price;
    existing.count += 1;
    catSubtotals.set(book.category, existing);
  }

  let categoryBonus = 0;
  for (const { subtotal: catSubtotal, count } of catSubtotals.values()) {
    if (count >= 2) {
      categoryBonus += Math.round(catSubtotal * 0.1);
    }
  }
  runningTotal -= categoryBonus;

  const every100Discount =
    Math.floor(runningTotal / EVERY_X_CENTS) * EVERY_X_DISCOUNT_CENTS;
  runningTotal -= every100Discount;

  const planDiscount = Math.round(runningTotal * (planDiscountPercent / 100));
  runningTotal -= planDiscount;

  const total = Math.max(0, runningTotal);

  return {
    subtotal,
    tierPercent,
    tierDiscount,
    categoryBonus,
    every100Discount,
    planDiscount,
    total,
  };
}
```

- [ ] **Step 3: Run existing tests**

Run: `npx jest tests/transactions/domain/pricing.spec.ts` from `backend/`
Expected: existing tests pass (planDiscount added to returned object but defaults to 0)

- [ ] **Step 4: Add tests for plan discount**

`backend/tests/transactions/domain/pricing.spec.ts` — add:

```typescript
describe('plan discount', () => {
  const oneBook: DiscountInput[] = [
    { price: '100.00', category: 'Fiction' },
  ];

  it('applies 0% when planDiscountPercent is 0', () => {
    const result = applyDiscounts(oneBook, 0);
    // subtotal 10000, tier 0, cat 0, every100 0, plan 0, total 10000
    expect(result.planDiscount).toBe(0);
    expect(result.total).toBe(10000);
  });

  it('applies 5% for free plan', () => {
    const result = applyDiscounts(oneBook, 5);
    // 10000 * 0.05 = 500
    expect(result.planDiscount).toBe(500);
    expect(result.total).toBe(9500);
  });

  it('applies 15% for curator plan', () => {
    const result = applyDiscounts(oneBook, 15);
    // 10000 * 0.15 = 1500
    expect(result.planDiscount).toBe(1500);
    expect(result.total).toBe(8500);
  });

  it('applies 25% for archivist plan', () => {
    const result = applyDiscounts(oneBook, 25);
    // 10000 * 0.25 = 2500
    expect(result.planDiscount).toBe(2500);
    expect(result.total).toBe(7500);
  });

  it('clamps total to 0 when discount exceeds remaining', () => {
    const cheapBook: DiscountInput[] = [
      { price: '1.00', category: 'Fiction' },
    ];
    const result = applyDiscounts(cheapBook, 25); // 25% of $1 = $0.25
    expect(result.planDiscount).toBe(25);
    expect(result.total).toBe(75);
  });
});
```

- [ ] **Step 5: Run tests**

Run: `npx jest tests/transactions/domain/pricing.spec.ts`
Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add backend/src/transactions/domain/pricing.ts backend/tests/transactions/domain/pricing.spec.ts
git commit -m "feat: add membership plan discount to pricing pipeline"
```

---

### Task 2: Integrate plan discount in CheckoutService

**Files:**
- Modify: `backend/src/transactions/application/checkout.service.ts`
- Modify: `backend/src/transactions/presentation/transactions.controller.ts`

- [ ] **Step 1: Add MembershipService injection**

Read `backend/src/transactions/application/checkout.service.ts`. Add import:
```typescript
import { MembershipService } from '../../membership/application/membership.service';
import { PLAN_DISCOUNT } from '../domain/pricing';
```

Add `MembershipService` to constructor:
```typescript
constructor(
  private readonly config: CoreConfigService,
  @Inject(BOOK_REPOSITORY) private readonly books: BookRepository,
  @Inject(STRIPE) private readonly stripe: StripeClient,
  private readonly membership: MembershipService,
) {}
```

- [ ] **Step 2: Update forCart to apply plan discount**

In `forCart()`, replace the discount calculation block (`const discount = applyDiscounts(...)`) with:

```typescript
const membershipRow = await this.membership.getOrCreate(userId);
const planPct = PLAN_DISCOUNT[membershipRow.plan] ?? 0;
const discount = applyDiscounts(
  books.map((b) => ({ price: b.price, category: b.category })),
  planPct,
);
```

- [ ] **Step 3: Update forBook to apply plan discount**

In `forBook()`, same pattern — add after fetching the book:

```typescript
const membershipRow = await this.membership.getOrCreate(userId);
const planPct = PLAN_DISCOUNT[membershipRow.plan] ?? 0;
// ... create session with applyDiscounts([book], planPct)
```

- [ ] **Step 4: Add computeDiscount public method**

Add to `CheckoutService`:
```typescript
async computeDiscount(
  bookIds: string[],
  userId: string,
): Promise<DiscountResult> {
  const books = await this.books.findPricingForPurchase(bookIds);
  const membershipRow = await this.membership.getOrCreate(userId);
  const planPct = PLAN_DISCOUNT[membershipRow.plan] ?? 0;
  return applyDiscounts(
    books.map((b) => ({ price: b.price, category: b.category })),
    planPct,
  );
}
```

- [ ] **Step 5: Add discount-preview endpoint**

In `backend/src/transactions/presentation/transactions.controller.ts`, add:

```typescript
@Post('api/cart/discount-preview')
@UseGuards(AuthGuard)
discountPreview(
  @Body() body: { bookIds: string[] },
  @CurrentUser() user: { id: string },
) {
  return this.checkout.computeDiscount(body.bookIds, user.id);
}
```

- [ ] **Step 6: Verify build and tests**

Run: `npm run build && npm run test` from `backend/`
Expected: build succeeds, all tests pass

- [ ] **Step 7: Commit**

```bash
git add backend/src/transactions/
git commit -m "feat: integrate plan discount in CheckoutService"
```

---

### Task 3: Update frontend discount utility

**Files:**
- Modify: `frontend/utils/discount.ts`

- [ ] **Step 1: Add planDiscountPercent parameter**

`frontend/utils/discount.ts` — add `planDiscountPercent` parameter and apply after every-$100:

```typescript
export interface DiscountBreakdown {
  subtotal: number;
  tierPercent: number;
  tierDiscount: number;
  categoryBonus: number;
  every100Discount: number;
  planDiscount: number;
  total: number;
}

export function computeDiscount(
  items: readonly CartItem[],
  planDiscountPercent: number = 0,
): DiscountBreakdown {
  const subtotal = items.reduce((sum, i) => sum + Math.round(i.price * 100), 0);

  const count = items.length;
  const tierPercent = count >= 4 ? 30 : count === 3 ? 20 : count === 2 ? 10 : 0;
  const tierDiscount = Math.round(subtotal * (tierPercent / 100));
  let runningTotal = subtotal - tierDiscount;

  const catSubtotals = getCategorySubtotals(items);
  const categoryBonus = catSubtotals.reduce((sum, cat) => {
    if (cat.count >= 2) {
      return sum + Math.round(cat.subtotal * 0.1);
    }
    return sum;
  }, 0);
  runningTotal -= categoryBonus;

  const every100Discount = Math.floor(runningTotal / 10000) * 100;
  runningTotal -= every100Discount;

  const planDiscount = Math.round(runningTotal * (planDiscountPercent / 100));
  runningTotal -= planDiscount;

  const total = Math.max(0, runningTotal);

  return {
    subtotal,
    tierPercent,
    tierDiscount,
    categoryBonus,
    every100Discount,
    planDiscount,
    total,
  };
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build` from `frontend/`
Expected: succeeds

- [ ] **Step 3: Commit**

```bash
git add frontend/utils/discount.ts
git commit -m "feat: add plan discount to frontend discount utility"
```

---

### Task 4: Show discount breakdown in cart page

**Files:**
- Modify: `frontend/pages/cart.vue`

- [ ] **Step 1: Rewrite cart page order summary**

`frontend/pages/cart.vue` — full file replacement:

```vue
<script setup lang="ts">
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-vue-next';
import { Button } from '~/components/ui/button';
import { buttonVariants } from '~/components/ui/button/variants';
import { storeToRefs } from 'pinia';
import { useCartStore } from '~/stores/cart';
import { useBookStatusStore } from '~/stores/bookStatus';
import { useMembershipStore } from '~/stores/membership';
import { computeDiscount } from '~/utils/discount';
import { plans } from '~/utils/plans';

definePageMeta({
  title: 'Your Cart — Read in Peace',
  description: 'Review the books in your cart.',
});

const cart = useCartStore();
const membershipStore = useMembershipStore();
const { purchasedCounts } = storeToRefs(useBookStatusStore());

const planDiscountPct = computed(() => {
  const plan = membershipStore.membership?.plan ?? 'free';
  const pct: Record<string, number> = { free: 5, curator: 15, archivist: 25 };
  return pct[plan] ?? 5;
});

const planName = computed(() => {
  const plan = membershipStore.membership?.plan;
  return plans.find((p) => p.id === plan)?.name ?? 'Free';
});

const discount = computed(() => computeDiscount(cart.items, planDiscountPct.value));
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <Nav mode="cart" />

    <main class="mx-auto max-w-6xl px-4 py-10 md:px-6 lg:py-14">
      <div class="border-b border-border pb-5">
        <p class="font-mono text-[10px] uppercase tracking-widest text-primary">The book bag</p>
        <h1 class="mt-2 font-serif text-4xl font-bold md:text-5xl">Your cart</h1>
        <p class="mt-2 text-sm text-muted-foreground">{{ cart.itemCount }} {{ cart.itemCount === 1 ? 'volume' : 'volumes' }} selected</p>
      </div>

      <div v-if="cart.isEmpty" class="flex flex-col items-center py-24 text-center">
        <ShoppingCart class="size-10 text-muted-foreground" />
        <h2 class="mt-5 font-serif text-2xl">Your book bag is empty.</h2>
        <p class="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Browse the stacks and keep a permanent copy of something worth returning to.</p>
        <NuxtLink to="/feed" :class="buttonVariants({ variant: 'archival', className: 'mt-6' })">Explore the library</NuxtLink>
      </div>

      <div v-else class="grid gap-12 py-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section class="divide-y divide-border">
          <article v-for="item in cart.items" :key="item.id" class="flex gap-5 py-6 first:pt-0">
            <CoverImage :crop="item.crop" :src="item.cover" :alt="`${item.title} book cover`" class="h-36 w-24 shrink-0 shadow-md" />
            <div class="flex min-w-0 flex-1 flex-col justify-between">
              <div>
                <h2 class="font-serif text-xl font-bold">{{ item.title }}</h2>
                <p class="mt-1 text-sm italic text-muted-foreground">by {{ item.author }}</p>
                <p class="mt-3 font-mono text-xs text-primary">${{ item.price.toFixed(2) }}</p>
                <p
                  v-if="(purchasedCounts.get(item.id) ?? 0) > 0"
                  class="mt-1 text-[10px] text-muted-foreground"
                >
                  You own {{ purchasedCounts.get(item.id) ?? 0 }} cop{{ (purchasedCounts.get(item.id) ?? 0) > 1 ? 'ies' : 'y' }}
                </p>
              </div>
              <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-center border border-border">
                  <Button size="icon" variant="archivalGhost" :aria-label="`Decrease ${item.title} quantity`" @click="cart.setQuantity(item.id, item.quantity - 1)"><Minus /></Button>
                  <span class="w-8 text-center font-mono text-xs">{{ item.quantity }}</span>
                  <Button size="icon" variant="archivalGhost" :aria-label="`Increase ${item.title} quantity`" @click="cart.setQuantity(item.id, item.quantity + 1)"><Plus /></Button>
                </div>
                <Button size="sm" variant="archivalGhost" @click="cart.removeItem(item.id)"><Trash2 /> Remove</Button>
              </div>
            </div>
          </article>
        </section>

        <aside class="h-fit border border-border bg-card p-6 lg:sticky lg:top-8">
          <p class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Order summary</p>

          <div class="mt-5 flex justify-between text-sm">
            <span>Subtotal</span>
            <strong>${{ (discount.subtotal / 100).toFixed(2) }}</strong>
          </div>

          <div v-if="discount.tierDiscount > 0" class="mt-2 flex justify-between text-sm text-muted-foreground">
            <span>Bundle ({{ cart.itemCount }} books, {{ discount.tierPercent }}%)</span>
            <span>-${{ (discount.tierDiscount / 100).toFixed(2) }}</span>
          </div>

          <div v-if="discount.categoryBonus > 0" class="mt-2 flex justify-between text-sm text-muted-foreground">
            <span>Multi-category bonus</span>
            <span>-${{ (discount.categoryBonus / 100).toFixed(2) }}</span>
          </div>

          <div v-if="discount.every100Discount > 0" class="mt-2 flex justify-between text-sm text-muted-foreground">
            <span>Every ${{ (cart.subtotal >= 100 ? 100 : 0) }} discount</span>
            <span>-${{ (discount.every100Discount / 100).toFixed(2) }}</span>
          </div>

          <div v-if="discount.planDiscount > 0" class="mt-2 flex justify-between text-sm text-primary">
            <span>{{ planName }} member ({{ planDiscountPct }}%)</span>
            <span>-${{ (discount.planDiscount / 100).toFixed(2) }}</span>
          </div>

          <div class="mt-5 flex items-end justify-between border-t border-border pt-5">
            <span class="font-serif text-lg">Estimated total</span>
            <strong class="font-serif text-3xl">${{ (discount.total / 100).toFixed(2) }}</strong>
          </div>

          <Button class="mt-6 w-full" variant="archival" @click="cart.checkout()">Proceed to checkout</Button>
          <p class="mt-3 text-center text-[11px] leading-5 text-muted-foreground">Secure checkout will be available when payments are enabled.</p>
        </aside>
      </div>
    </main>
  </div>
</template>
```

- [ ] **Step 2: Verify build**

Run: `npm run build` from `frontend/`
Expected: succeeds

- [ ] **Step 3: Commit**

```bash
git add frontend/pages/cart.vue
git commit -m "feat: show discount breakdown with plan discount in cart page"
```
