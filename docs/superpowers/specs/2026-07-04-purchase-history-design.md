# Purchase History Design

**Goal:** Allow users to view past purchases with Stripe receipt links on the dashboard's "Purchased" tab.

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

### 1. Dashboard "Purchased" tab: `pages/dashboard.vue`

For each purchased book, replace the existing borrow button + purchase icon button with a single "View Receipt" button that opens the Stripe receipt URL in a new tab.

The dashboard already receives purchase data with the book entries. The existing `BookCard` or purchase listing component needs to detect that a book is purchased (rather than borrowed) and render a receipt link instead of borrow/buy actions.

### 2. Component update: `PurchaseHistoryItem.vue` (modify existing purchase card)

The current dashboard likely maps over purchased books and renders a card with:
- Book cover, title, author
- Purchase date
- Borrow button (disabled / irrelevant for purchased books)
- Buy icon button (already purchased — redundant)

Replace those action buttons with:

```vue
<Button
  variant="archival"
  size="sm"
  :disabled="!receiptUrl"
  @click="openReceipt"
>
  <ExternalLink /> View Receipt
</Button>
```

`openReceipt()` calls `window.open(receiptUrl, '_blank', 'noopener,noreferrer')` or uses `<a href target="_blank">`.

If `receiptUrl` is null (legacy purchase before this feature), disable the button with title "Receipt not available".

### 3. Data flow

The `usePurchases` composable is already called in `pages/dashboard.vue` (via `dashboard.fetchPurchases()`). The existing `GET /api/user/purchases` endpoint now returns the new fields (`stripeSessionId`, `receiptUrl`, `amountTotal`). The dashboard's purchase data will automatically include them after the backend migration — no additional fetch needed.

The dashboard already has query param handling: `session_id` in the URL triggers `confirmPurchase()`. After confirmation, `fetchPurchases()` refetches and the receipt URL will be present.

### 4. Dashboard layout

```
Purchased tab:
  ┌─────────────────────────────────┐
  │ Cover  Title              View  │
  │        Author             Receipt│
  │        Purchased Jul 4    ───── │
  │        $25.00            [Link] │
  ├─────────────────────────────────┤
  │ Cover  ...                    │
  └─────────────────────────────────┘
```

### 5. Remove `/history` page (not needed)

No new page. No new nav entries. No BottomDock changes.

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
- Unit test: receipt link button renders when `receiptUrl` is present, disabled when null
- Integration: dashboard "Purchased" tab renders receipt button for each purchased book
