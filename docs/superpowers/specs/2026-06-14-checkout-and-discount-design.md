# Checkout Cart & Discount Pipeline — Read in Peace

## Overview

Replace the current single-item Stripe Checkout flow with a client-side shopping cart
and slide-over checkout drawer. Add a discount engine with three stacking stages:
quantity tier, category bonus, and every-$100 discount. All discounts are computed
client-side for display and re-verified server-side at checkout.

## Architecture

```
Frontend (Nuxt SSR)
  Cart Store (Pinia + localStorage persist)
    → items: CartItem[]
    → addItem(), removeItem(), clear(), checkout()
    → getters: itemCount, subtotal, isEmpty

  Discount Engine (useDiscount composable)
    → compute(cartItems) → { subtotal, tierPercent, tierDiscount,
      categoryBonus, every100Discount, total }
    → Pure function, no store dependency

  CheckoutDrawer (slide-over component)
    → Renders cart items + discount breakdown
    → "Proceed to Checkout" → Stripe redirect

  CartIcon (in Navbar)
    → Cart icon with itemCount badge

Backend (NestJS)
  POST /api/cart/checkout          (new)
    → Receives { bookIds: string[] }
    → Validates all books exist + in stock
    → Computes discounts server-side
    → Creates Stripe session with final total
    → Returns { url }

  POST /api/confirm-purchase       (modified)
    → Reads all books from Stripe metadata
    → Batch-inserts purchases
    → Batch-decrements stock (only where inStock > 1)
```

## Cart Store

**Persistence:** `@pinia-plugin-persistedstate/nuxt` for automatic localStorage sync.

**Interface:**
```typescript
interface CartItem {
  bookId: string;
  title: string;
  author: string;
  cover: string;
  price: number;
  category: string;
}
```

**Rules:**
- Max 1 copy of each book per cart (`addItem` silently ignores duplicates)
- Cart clears automatically after successful purchase
- Cart does NOT clear on Stripe cancellation

## Discount Pipeline

Fixed order, each stage receives the running total from the previous stage:

```
Subtotal → Quantity Tier → Category Bonus → Every $100 → Final Price
```

### Stage 1 — Quantity Tier

| Items | Discount |
|-------|----------|
| 1     | 0%       |
| 2     | 10% off subtotal |
| 3     | 20% off subtotal |
| 4+    | 30% off subtotal (max) |

Applies to the full cart subtotal.

### Stage 2 — Category Bonus

For every category that has ≥2 items in the cart:

`discount += sum of original prices of items in that category × 0.10`

Applied to the running total after Stage 1. The bonus amount is based on original
(undiscounted) category subtotals, not the post-tier total.

If no category has ≥2 items, this stage contributes $0.

### Stage 3 — Every $100

`discount = floor(runningTotal / 100) × 1`

Applies to the running total after Stage 2. If total < $100, no discount.

### Final Price

`finalPrice = max(0, runningTotal - totalDiscount)`

Prices never go below zero.

### Worked Example

Cart: Book A (Fiction, $20), Book B (Fiction, $15), Book C (Science, $30), Book D (Science, $25)

| Step | Calculation | Running Total |
|------|------------|---------------|
| Subtotal | 20 + 15 + 30 + 25 | $90.00 |
| Qty tier (4 items → 30%) | −$27.00 | $63.00 |
| Cat bonus: Fiction $35 × 10% | −$3.50 | $59.50 |
| Cat bonus: Science $55 × 10% | −$5.50 | $54.00 |
| Every $100: floor(54/100) × $1 | −$0.00 | **$54.00** |
| **Final** | | **$54.00** |

## Components

### New

**`frontend/stores/cart.ts`**
- Pinia store with `@pinia-plugin-persistedstate/nuxt`
- `shallowRef<CartItem[]>([])` for items
- Actions: `addItem(book)`, `removeItem(bookId)`, `clear()`, `checkout()`
- `checkout()` → POST `/api/cart/checkout` → `window.location.href = res.url`

**`frontend/composables/useDiscount.ts`**
- Pure function: `computeDiscount(items: CartItem[]): DiscountBreakdown`
- `DiscountBreakdown`: `{ subtotal, tierPercent, tierDiscount, categoryBonus, every100Discount, total }`
- Testable independently of any store

**`frontend/components/CheckoutDrawer.vue`**
- Fixed position, right-side slide-over (translate-x animation)
- Overlay backdrop (click to close)
- Sections:
  - Header: "Cart (N items)" + close button
  - Item list: cover thumbnail (48×64), title, author, price, remove button
  - Discount breakdown card: subtotal, quantity tier, category bonus, every-$100, total
  - "Proceed to Checkout" button (disabled when cart empty)
- Empty state: cart icon + "Your cart is empty" message
- Rendered in `layouts/default.vue`

**`frontend/components/CartIcon.vue`**
- Shopping bag icon from `lucide-vue-next`
- Red badge circle with item count
- Click toggles drawer open/closed
- Hidden on landing page (same as AdminFab)

### Modified

**`frontend/components/Navbar.vue`**
- Add `CartIcon` on the right side (before auth controls)

**`frontend/components/BookActions.vue`**
- Change `emit('buy')` → call `cartStore.addItem(book)`, then open drawer
- Keep "Buy Now — $XX.XX" label

**`frontend/components/BookCard.vue`**
- Change `dashboard.buyBook(book.id)` → `cartStore.addItem(book)`, then open drawer

**`frontend/composables/useBookDetail.ts`**
- Update `handleBuy()` to use cart store instead of `dashboard.buyBook()`

**`frontend/layouts/default.vue`**
- Import and render `CheckoutDrawer`
- Guard: `route.name !== 'index'` (hide on landing)

**`frontend/pages/dashboard.vue`**
- Confirm purchase flow already handles `session_id` → no major change
- Cart clears automatically on successful confirm

### Backend

**`backend/src/transactions/transactions.controller.ts`**
- Add `POST /api/cart/checkout` endpoint
- Accepts `{ bookIds: string[] }`, returns `{ url: string }`

**`backend/src/transactions/transactions.service.ts`**
- Add `createCartCheckoutSession(bookIds, userId)`:
  - Fetch all books from DB
  - Validate all exist and `inStock > 1` (last copy borrow-only)
  - Run `applyDiscounts(books)` to compute final price
  - Create Stripe Checkout Session:
    - `mode: 'payment'`
    - Single line item at computed total
    - Metadata: `{ bookIds: JSON.stringify(bookIds), userId }`
  - Return `{ url }`
- Add private `applyDiscounts(books)` method (mirrors frontend logic)
- Modify `confirmPurchase()`:
  - Read `bookIds` from Stripe session metadata
  - DB transaction: batch insert purchases + batch decrement stock
  - Idempotency guard exists (checks for existing purchase records)

## Error Handling

| Scenario | Response |
|----------|----------|
| Book out of stock at checkout | Backend returns 400 with book ID → frontend shows "X is no longer available. Remove from cart?" |
| Not authenticated | Backend returns 401 → frontend shows "Please sign in" toast |
| Stripe cancellation | User returned to book page, cart preserved |
| Stripe success | Backend records all purchases in transaction, cart clears on frontend |
| Partial stock failure during confirm | DB transaction rolls back all inserts/decrements |
| Empty cart checkout | Frontend disables button; backend returns 400 as safety net |
| Duplicate book add | `addItem` checks existing IDs, silently skips |
| Network failure on checkout | Toast "Failed to start checkout" — cart preserved |

## Testing

### Backend — Discount pipeline (`*.spec.ts`)
- 1 item → 0% tier, no category bonus, no every-$100
- 2 items same category → 10% tier + 10% category bonus
- 3 items mixed categories → 20% tier
- 4 items mixed categories → 30% tier + category bonuses (per qualifying category)
- Total < $100 → every-$100 is $0
- Total ≥ $100 → every-$100 applies correctly

### Backend — E2E (`test/`)
- Cart checkout endpoint with valid book IDs
- Cart checkout with invalid book ID
- Confirm purchase with batch books

### Frontend — Discount composable
- Same test matrix as backend `applyDiscounts`
- Separate discount display from component rendering

## Implementation Order

1. Install `@pinia-plugin-persistedstate/nuxt` in frontend
2. Create `cartStore` with add/remove/clear/checkout + localStorage persistence
3. Create `useDiscount` composable with full discount pipeline
4. Create `CheckoutDrawer` component (empty state, item list, discount breakdown)
5. Create `CartIcon` component
6. Add CartIcon to Navbar
7. Wire BookActions + BookCard + useBookDetail to use cart store (not direct buy)
8. Add `CheckoutDrawer` to default layout (hidden on landing page)
9. Create backend `POST /api/cart/checkout` endpoint + discount pipeline
10. Modify backend `confirmPurchase` for batch purchase recording
11. Verify: run backend tests, build frontend, manual E2E walkthrough

## Future Considerations (Out of Scope)

- Coupon codes (reference doc's "Coupon" stage is omitted)
- Points/loyalty system
- Server-side cart persistence (requires cart DB table)
- Guest carts (requires anonymous session tracking)
