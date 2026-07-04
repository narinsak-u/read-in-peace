# Purchase History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store Stripe receipt URLs on purchases and show a "View Receipt" button on the dashboard's "Purchased" tab instead of borrow/buy buttons.

**Architecture:** Add `stripe_session_id`, `receipt_url`, and `amount_total` columns to the `purchases` table. Extract receipt URL during checkout confirmation via `stripe.checkout.sessions.retrieve(sessionId, { expand: ['payment_intent'] })`. Modify `BookCard` to render a receipt link when `isPurchased` is true. Pass receipt data from dashboard into BookCard.

**Tech Stack:** NestJS, Drizzle ORM, Stripe SDK, Nuxt 3, Vue 3, shadcn-vue

---

## File Structure

| Task | Files | Change |
|------|-------|--------|
| 1 | `schema.ts`, `domain/purchase.ts` | Add columns + interface fields |
| 2 | `drizzle-purchase.repository.ts` | Read/write new columns |
| 3 | `purchase-confirmation.service.ts` | Extract + save receipt URL |
| 4 | — | Generate Drizzle migration |
| 5 | `BookCard.vue`, `dashboard.vue` | Receipt button in purchased tab |

---

### Task 1: Backend schema + domain interface changes

**Files:**
- Modify: `backend/src/core/database/schema.ts:198-209`
- Modify: `backend/src/transactions/domain/purchase.ts:3-8,12-26`

- [ ] **Step 1: Add columns to purchases schema**

In `backend/src/core/database/schema.ts`, extend the `purchases` table (lines 198-209):

```ts
export const purchases = pgTable('purchases', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  bookId: text('book_id')
    .notNull()
    .references(() => books.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  purchasedAt: timestamp('purchased_at').notNull().defaultNow(),
  stripeSessionId: text('stripe_session_id'),
  receiptUrl: text('receipt_url'),
  amountTotal: integer('amount_total'),
});
```

- [ ] **Step 2: Update PurchaseRow interface**

In `backend/src/transactions/domain/purchase.ts`, update the interface:

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

- [ ] **Step 3: Update repository interface**

In the same file, update `PurchaseRepository.record()` signature:

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

- [ ] **Step 4: Commit**

```bash
git add backend/src/core/database/schema.ts \
       backend/src/transactions/domain/purchase.ts
git commit -m "feat: add stripe session id, receipt url, and amount columns to purchases"
```

---

### Task 2: Backend repository implementation

**Files:**
- Modify: `backend/src/transactions/infrastructure/drizzle-purchase.repository.ts`

- [ ] **Step 1: Update record() to accept and save new fields**

```ts
async record(
  bookId: string,
  userId: string,
  stripeSessionId?: string,
  receiptUrl?: string,
  amountTotal?: number,
  tx?: DatabaseOrTransaction,
): Promise<PurchaseRow> {
  const db = tx ?? this.db;
  const [row] = await db
    .insert(schema.purchases)
    .values({ bookId, userId, stripeSessionId, receiptUrl, amountTotal })
    .returning();
  return row;
}
```

- [ ] **Step 2: Update listForUser() to select new columns**

```ts
async listForUser(
  userId: string,
): Promise<Array<{ row: PurchaseRow; bookId: string }>> {
  const rows = (await this.db
    .select({
      id: schema.purchases.id,
      bookId: schema.purchases.bookId,
      userId: schema.purchases.userId,
      purchasedAt: schema.purchases.purchasedAt,
      stripeSessionId: schema.purchases.stripeSessionId,
      receiptUrl: schema.purchases.receiptUrl,
      amountTotal: schema.purchases.amountTotal,
    })
    .from(schema.purchases)
    .where(eq(schema.purchases.userId, userId))
    .orderBy(
      sql`${schema.purchases.purchasedAt} DESC`,
    )) as unknown as PurchaseRow[];
  return rows.map((r) => ({ row: r, bookId: r.bookId }));
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/transactions/infrastructure/drizzle-purchase.repository.ts
git commit -m "feat: update purchase repository for receipt fields"
```

---

### Task 3: Backend confirmation service — extract receipt URL

**Files:**
- Modify: `backend/src/transactions/application/purchase-confirmation.service.ts:29-38`

- [ ] **Step 1: Expand Stripe session and extract receipt data**

In `purchase-confirmation.service.ts`, change the `confirm()` method to expand the session and extract receipt URL:

```ts
async confirm(sessionId: string, userId: string): Promise<unknown> {
  const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent'],
  });
  if (
    session.payment_status !== 'paid' ||
    session.metadata?.userId !== userId
  ) {
    throw new BadRequestException('Invalid purchase confirmation');
  }

  const receiptUrl =
    (session as any).payment_intent?.charges?.data?.[0]?.receipt_url ?? null;
  const amountTotal = session.amount_total ?? null;

  return this.recordFromSession(session, receiptUrl, amountTotal);
}
```

- [ ] **Step 2: Thread receipt data through recordFromSession**

Update `recordFromSession()` signature and pass values to `recordSinglePurchase()` and `recordBatchPurchases()`:

```ts
async recordFromSession(
  session: any,
  receiptUrl: string | null,
  amountTotal: number | null,
): Promise<unknown> {
  if (session.payment_status !== 'paid') {
    return { skipped: 'not paid' };
  }

  const userId: string | undefined = session.metadata?.userId;
  if (!userId) return { skipped: 'no userId' };
  const sessionId: string = session.id;

  const bookCount = Number(session.metadata?.bc);
  if (bookCount > 0) {
    const bookIds: string[] = [];
    for (let i = 0; i < bookCount; i++) {
      bookIds.push(session.metadata[`b${i}`]);
    }
    return this.recordBatchPurchases(bookIds, userId, sessionId, receiptUrl, amountTotal);
  }

  const bookId: string | undefined = session.metadata?.bookId;
  if (!bookId) {
    throw new BadRequestException('No book IDs found in session metadata');
  }
  return this.recordSinglePurchase(bookId, userId, sessionId, receiptUrl, amountTotal);
}
```

- [ ] **Step 3: Update recordSinglePurchase and recordBatchPurchases**

```ts
private async recordSinglePurchase(
  bookId: string,
  userId: string,
  stripeSessionId?: string,
  receiptUrl?: string,
  amountTotal?: number,
) {
  return this.db.transaction(async (tx) => {
    const existing = await this.purchases.findExisting(bookId, userId, tx);
    if (existing) return existing;

    const purchase = await this.purchases.record(
      bookId, userId, stripeSessionId, receiptUrl, amountTotal, tx,
    );
    await this.books.decrementStock(bookId, tx);
    return purchase;
  });
}

private async recordBatchPurchases(
  bookIds: string[],
  userId: string,
  stripeSessionId?: string,
  receiptUrl?: string,
  amountTotal?: number,
) {
  return this.db.transaction(async (tx) => {
    const inserted: string[] = [];
    for (const bookId of bookIds) {
      const existing = await this.purchases.findExisting(bookId, userId, tx);
      if (existing) continue;
      await this.purchases.record(
        bookId, userId, stripeSessionId, receiptUrl, amountTotal, tx,
      );
      inserted.push(bookId);
    }
    for (const bookId of inserted) {
      await this.books.decrementStock(bookId, tx);
    }
    return inserted;
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/transactions/application/purchase-confirmation.service.ts
git commit -m "feat: extract receipt URL from expanded Stripe session on purchase confirm"
```

---

### Task 4: Generate Drizzle migration

**Files:**
- Create: `backend/src/db/migrations/` (new migration file)

- [ ] **Step 1: Generate migration**

Run from `backend/`:

```bash
npm run db:migrate
```

If the migration command doesn't auto-generate, run:

```bash
npx drizzle-kit generate
```

Then apply:

```bash
npm run db:migrate
```

- [ ] **Step 2: Verify the migration SQL**

Read the generated migration file to confirm it contains:

```sql
ALTER TABLE "purchases" ADD COLUMN "stripe_session_id" text;
ALTER TABLE "purchases" ADD COLUMN "receipt_url" text;
ALTER TABLE "purchases" ADD COLUMN "amount_total" integer;
```

- [ ] **Step 3: Run tests**

Run: `npm run test` from `backend/`

Expected: All backend tests pass.

- [ ] **Step 4: Commit**

```bash
git add backend/src/db/migrations/
git commit -m "feat: add drizzle migration for purchase receipt columns"
```

---

### Task 5: Frontend — receipt button in dashboard purchased tab

**Files:**
- Modify: `frontend/components/book/BookCard.vue`
- Modify: `frontend/pages/dashboard.vue`

- [ ] **Step 1: Add receiptUrl prop to BookCard**

In `frontend/components/book/BookCard.vue`, add a new prop:

```ts
const props = defineProps<{
  book: Book;
  actions: StockActions;
  flash: (message: string) => void;
  purchasedAt?: string;
  receiptUrl?: string | null;  // NEW
}>();
```

- [ ] **Step 2: Update BookCard template — show receipt button when purchased**

Replace the action button section (lines 89-116 in the current file) with:

```vue
    <div class="mt-3 flex gap-1">
      <template v-if="actions.isPurchased && receiptUrl">
        <Button
          size="sm"
          variant="archival"
          as-child
        >
          <a :href="receiptUrl" target="_blank" rel="noopener noreferrer">
            <ExternalLink class="size-3" /> Receipt
          </a>
        </Button>
      </template>
      <template v-else-if="actions.isBorrowed">
        <Button size="sm" variant="archival" @click="onReturn">Return</Button>
      </template>
      <template v-else-if="actions.canBorrow">
        <Button size="sm" variant="archival" @click="onBorrow">Borrow</Button>
      </template>
      <template v-else>
        <Button size="sm" variant="archival" disabled>Unavailable</Button>
      </template>
      <Button
        v-if="!actions.isPurchased && actions.canBuy"
        size="icon"
        variant="archivalGhost"
        :aria-label="`Buy ${book.title}`"
        @click="onBuy"
      >
        <ShoppingBag />
      </Button>
    </div>
```

Also add the `ExternalLink` icon import at the top:

```ts
import { ShoppingBag, Star, ExternalLink } from "lucide-vue-next";
```

- [ ] **Step 3: Pass receiptUrl from dashboard**

In `frontend/pages/dashboard.vue`, update the purchased tab `BookCard` to pass the receipt URL:

```diff
           <BookCard
             v-for="entry in purchases"
             :key="entry.purchase?.id ?? entry.book?.id"
             :book="mapBookResponse(entry.book as Record<string, unknown>)"
             :purchased-at="entry.purchase?.purchasedAt"
+            :receipt-url="entry.purchase?.receiptUrl"
             :actions="{
               isBorrowed: false,
               canBuy: (entry.book?.inStock ?? 0) > 1,
```

- [ ] **Step 4: Run tests**

Run: `npm run test` from `frontend/`

Expected: All 82 tests pass.

- [ ] **Step 5: Build check**

Run: `npm run build` from `frontend/`

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add frontend/components/book/BookCard.vue \
       frontend/pages/dashboard.vue
git commit -m "feat: show View Receipt button on purchased books in dashboard"
```

---

## Self-Review

**1. Spec coverage:**
- Schema columns: Task 1 (stripe_session_id, receipt_url, amount_total)
- Domain/repo interface: Task 1 + Task 2
- Stripe receipt extraction: Task 3 (expand payment_intent, extract charges.receipt_url)
- Dashboard receipt button: Task 5 (BookCard + dashboard.vue)
- Migration: Task 4

**2. Placeholder scan:** No TBDs, TODOs, or placeholder patterns.

**3. Type consistency:** `stripeSessionId`/`receiptUrl`/`amountTotal` names consistent across schema → domain → repository → service → frontend prop.
