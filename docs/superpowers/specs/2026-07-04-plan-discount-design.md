# Membership Plan Discount Design

**Date:** 2026-07-04

## Summary

Add a membership-plan-based discount to the purchase checkout pipeline. Each plan (free 5%, curator 15%, archivist 25%) gets a corresponding percentage off the final cart price, applied after the existing tier/category/every-$100 discounts. The discount is shown as a line item in the cart order summary.

## Scope

### Backend
- Add `PLAN_DISCOUNT` mapping to `domain/pricing.ts`
- Add `planDiscountPercent` parameter to `applyDiscounts()`, apply after every-$100
- `CheckoutService.forCart()` and `forBook()` look up user's plan via `MembershipService.getOrCreate()`, pass percent to `applyDiscounts()`
- New endpoint `POST /api/cart/discount-preview` → returns full `DiscountResult` for the frontend cart page

### Frontend
- Add `planDiscountPercent` parameter to `computeDiscount()` in `utils/discount.ts`
- Cart page calls discount-preview on load, displays breakdown in order summary
- Uses `useMembershipStore` to get plan name for labeling

---

## Backend Changes

### `domain/pricing.ts`

Add constant and parameter to `applyDiscounts()`:

```typescript
export const PLAN_DISCOUNT: Record<string, number> = {
  free: 5,
  curator: 15,
  archivist: 25,
};

export function applyDiscounts(
  books: DiscountInput[],
  planDiscountPercent: number = 0,
): DiscountResult {
  // ...existing subtotal, tier, category, every-$100 logic (unchanged)...

  const planDiscount = Math.round(runningTotal * (planDiscountPercent / 100));
  runningTotal -= planDiscount;

  const total = Math.max(0, runningTotal);

  return { subtotal, tierPercent, tierDiscount, categoryBonus, every100Discount, planDiscount, total };
}
```

`DiscountResult` adds `planDiscount: number`. The frontend `DiscountBreakdown` reflects the same shape.

### `application/checkout.service.ts`

Inject `MembershipService` (already available via module `forwardRef` chain). In both `forBook()` and `forCart()`, after fetching books:

```typescript
const membership = await this.membership.getOrCreate(userId);
const planPct = PLAN_DISCOUNT[membership.plan] ?? 0;
```

Pass `planPct` to `applyDiscounts()`.

### New endpoint: `POST /api/cart/discount-preview`

In `membership.controller.ts` or a new controller:

```typescript
@Post('api/cart/discount-preview')
@UseGuards(AuthGuard)
discountPreview(
  @Body() body: { bookIds: string[] },
  @CurrentUser() user: AuthUser,
): Promise<DiscountResult> {
  return this.checkout.computeDiscount(body.bookIds, user.id);
}
```

`CheckoutService` gets a new public method `computeDiscount(bookIds, userId)` that runs the pricing pipeline without creating a Stripe session:

```typescript
async computeDiscount(bookIds: string[], userId: string): Promise<DiscountResult> {
  const books = await this.books.findPricingForPurchase(bookIds);
  const membership = await this.membership.getOrCreate(userId);
  const planPct = PLAN_DISCOUNT[membership.plan] ?? 0;
  return applyDiscounts(
    books.map((b) => ({ price: b.price, category: b.category })),
    planPct,
  );
}
```

---

## Frontend Changes

### `utils/discount.ts`

Make `computeDiscount` accept `planDiscountPercent`:

```typescript
export function computeDiscount(
  items: readonly CartItem[],
  planDiscountPercent: number = 0,
): DiscountBreakdown {
  // ... existing logic ...
  const planDiscount = Math.round(runningTotal * (planDiscountPercent / 100));
  runningTotal -= planDiscount;
  return { subtotal, tierPercent, tierDiscount, categoryBonus, every100Discount, planDiscount, total };
}
```

And `DiscountBreakdown` adds `planDiscount: number`.

### `stores/cart.ts`

Add a computed `discountBreakdown` that calls `computeDiscount(items, planDiscountPct)`. The plan discount percent comes from `useMembershipStore()`.

### `pages/cart.vue`

Replace the static subtotal display in the order summary with a full breakdown:

```
Order Summary
─────────────
Subtotal                    $49.99
Curator member (15%)       -$7.50   ← red/green text
Bundle (3 books, 20%)      -$8.50
Multi-category bonus       -$2.00
Every $100 discount        -$1.00
─────────────
Estimated total             $30.99   ← large serif
```

Each discount line shows only when its value > 0. The plan discount label includes the plan name + percent (e.g., "Curator member (15%)").

---

## Pipeline

```
Subtotal  →  Tier  →  Category Bonus  →  Every $100  →  Plan Discount  →  Total
```

Each step receives the running total from the previous step. Final price clamped to ≥ 0.

### Example

Cart: 3 books totaling $150 (from a free-plan user = 5% discount)

| Step | Total In | Discount | Total Out |
|------|----------|----------|-----------|
| Subtotal | — | — | 150.00 |
| Tier (3 books, 20%) | 150.00 | -30.00 | 120.00 |
| Category bonus | 120.00 | 0.00 | 120.00 |
| Every $100 (floor(12000/10000)×100) | 120.00 | -1.00 | 119.00 |
| Plan Discount (5%) | 119.00 | -5.95 | 113.05 |
| **Final Price** | | | **113.05** |

## Edge Cases

| Case | Behavior |
|------|----------|
| Guest user (no membership row) | `getOrCreate` assigns free → 5% |
| Plan discount drives total below 0 | Clamped to 0 via `Math.max(0, ...)` |
| Single-book checkout (`forBook`) | Same plan discount applies |
| Membership not yet loaded | Cart page shows subtotal-only, then updates when membership resolves |
| Plan name not found | Fall back to generic "Member discount" label |

## Testing

- `pricing.spec.ts`: verify `planDiscountPercent` in pipeline — edge cases (0%, negative total clamp)
- `checkout.service.spec.ts`: mock `MembershipService.getOrCreate`, verify `applyDiscounts` called with correct percent
