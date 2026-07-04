# Purchase History Design

**Goal:** Allow users to view past purchases with Stripe receipt links on a standalone `/history` page.

**Architecture:** Add `stripe_session_id`, `receipt_url`, and `amount_total` columns to the existing `purchases` table. Extract the receipt URL during purchase confirmation by expanding the Stripe session's payment intent. Serve via the existing `GET /api/user/purchases` endpoint (extended with new fields). New `/history` page lists purchases chronologically with book metadata and a receipt link.

---

## Data Model

### Schema changes (`core/database/schema.ts`)

Add three columns to the `purchases` table:

```ts
export const purchases = pgTable('purchases', {
  // ... existing: id, bookId, userId, purchasedAt
  stripeSessionId: text('stripe_session_id'),
  receiptUrl: text('receipt_url'),
  amountTotal: integer('amount_total'),  // cents
});
```

### Domain changes (`transactions/domain/purchase.ts`)

```ts
export interface PurchaseRow {
  id: string;
  bookId: string;
  userId: string;
  purchasedAt: Date;
  stripeSessionId: string | null;
  receiptUrl: string | null;
  amountTotal: number | null;
}
```

### API response (`GET /api/user/purchases`)

```json
{
  "purchase": {
    "id": "uuid",
    "bookId": "uuid",
    "userId": "uuid",
    "purchasedAt": "2026-07-04T12:00:00Z",
    "stripeSessionId": "cs_test_abc123",
    "receiptUrl": "https://receipts.stripe.com/test/...",
    "amountTotal": 2500
  },
  "book": { ... }
}
```

---

## Backend changes

### 1. Purchase confirmation (`purchase-confirmation.service.ts`)

When confirming a purchase (`confirm()` method), expand the Stripe session to include payment intent and charges:

```ts
const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
  expand: ['payment_intent'],
});
const receiptUrl =
  (session as any).payment_intent?.charges?.data?.[0]?.receipt_url ?? null;
const amountTotal = session.amount_total ?? null;
```

Pass `receiptUrl`, `amountTotal`, and `sessionId` down through the recording methods:

```ts
async recordSinglePurchase(bookId, userId, sessionId, receiptUrl, amountTotal) {
  // INSERT into purchases with new columns
}
```

### 2. Repository (`drizzle-purchase.repository.ts`)

Update `record()` and `listForUser()` to read/write the three new columns. `record()` signature becomes:

```ts
record(
  bookId: string,
  userId: string,
  stripeSessionId?: string,
  receiptUrl?: string,
  amountTotal?: number,
  tx?: DatabaseOrTransaction,
): Promise<PurchaseRow>;
```

### 3. Checkout session creation (`checkout.service.ts`)

No changes needed — the session is already created with the correct metadata. Stripe automatically generates the receipt URL after payment.

---

## Frontend changes

### 1. New page: `pages/history.vue`

```
/history
  ├── Header: "Purchase History (N)"
  └── List of purchases (newest first)
       └── Each row:
            ├── Book cover thumbnail
            ├── Title + author
            ├── Purchase date
            ├── Amount paid ($25.00)
            └── Receipt link (external, opens in new tab)
```

Empty state: illustration + "No purchases yet" + link to `/feed`.

Uses the existing `usePurchases` composable, calling `fetchPurchases()` on mount. The composable already returns `purchases` as `readonly(...)` — just needs its types updated to include the new fields.

### 2. New component: `PurchaseHistoryItem.vue`

Prop type:
```ts
{
  purchase: {
    id: string;
    bookId: string;
    purchasedAt: string;
    stripeSessionId: string | null;
    receiptUrl: string | null;
    amountTotal: number | null;
  };
  book: Book;
}
```

Renders a row with cover, title/author, date, price, and receipt link button. Links to Stripe receipt in a new tab with `target="_blank" rel="noopener noreferrer"`. Uses `ExternalLink` icon from `lucide-vue-next`.

### 3. Navigation

Add `/history` to `BottomDock.vue` and the dashboard's nav section. The dashboard "Purchased" tab gets a "View full history" link at the bottom.

### 4. Query params

After Stripe redirects to `/dashboard?tab=purchased&session_id=cs_test_...`, the purchase confirmation trigger remains unchanged. The user would need to navigate to `/history` manually or via a link.

---

## Error handling

- Stripe receipt URL may be `null` if the charge hasn't finalized yet — hide the receipt link button in that case
- Failed Stripe session expansion: fall back to `receiptUrl = null`, don't block the purchase recording
- Empty purchase history: show empty state rather than an error

---

## Migration

A new Drizzle migration adds the three columns. Existing rows get `null` for all three — their receipt links won't be available retroactively (can be manually populated from Stripe dashboard if needed).

---

## Testing

### Backend
- Unit test: `confirm()` extracts receipt URL from expanded Stripe session
- Unit test: `record()` saves `stripeSessionId`, `receiptUrl`, `amountTotal`
- Unit test: `listForUser()` returns new fields

### Frontend
- Unit test: `usePurchases` fetch returns new fields
- Unit test: `PurchaseHistoryItem` renders receipt link when present, hides when null
- Unit test: empty history shows empty state
