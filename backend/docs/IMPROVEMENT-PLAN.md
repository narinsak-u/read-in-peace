# Backend Improvement Plan

Generated from a multi-axis code review (correctness, readability, architecture, security, performance) and codebase architecture analysis.

## Table of Contents

1. [Phase 1: Critical Fixes](#phase-1-critical-fixes)
2. [Phase 2: Architecture Cleanup](#phase-2-architecture-cleanup)
3. [Phase 3: Code Quality](#phase-3-code-quality)
4. [Phase 4: Testing & Performance](#phase-4-testing--performance)
5. [Dependency Graph](#dependency-graph)

---

## Phase 1: Critical Fixes

### 1A. Fix stock decrement silent failure

**File:** `src/books/infrastructure/drizzle-book.repository.ts:111-122`
**Severity:** Critical — data inconsistency risk

**Problem:**
`decrementStock()` uses `gt(schema.books.inStock, 1)` as a WHERE condition. When stock is exactly 1, the UPDATE matches zero rows and returns null. However, `PurchaseConfirmationService` may have already recorded the purchase. This means a purchase can be charged without inventory being decremented.

**Current code:**
```typescript
async decrementStock(bookId: string, tx?: DatabaseOrTransaction): Promise<BookRow | null> {
  const db = tx ?? this.db;
  const [row] = await db
    .update(schema.books)
    .set({ inStock: sql`${schema.books.inStock} - 1` })
    .where(and(eq(schema.books.id, bookId), gt(schema.books.inStock, 1)))
    .returning();
  return row ?? null;
}
```

**Fix:**
- Remove the `gt(schema.books.inStock, 1)` guard from the WHERE clause
- Add a post-decrement check: if `inStock <= 0` after decrement, set `isAvailable = false`
- The checkout service already guards `inStock <= 1` before creating a session, so this is a race-condition safety net, not a primary gate

**Alternative (safer):** Keep the guard but throw in the calling service when `decrementStock` returns null after a confirmed purchase. This requires changes to `PurchaseConfirmationService.recordFromSession()`.

---

### 1B. Fix E2E test path

**File:** `package.json:20`
**Severity:** High — broken script

**Problem:**
`"test:e2e": "jest --config ./test/jest-e2e.json"` references `./test/` but the actual file is at `./tests/jest-e2e.json`.

**Fix:**
```json
"test:e2e": "jest --config ./tests/jest-e2e.json"
```

---

### 1C. Fix ChatGateway hardcoded CORS

**File:** `src/chat/presentation/chat.gateway.ts:14-19`
**Severity:** High — production breakage

**Problem:**
CORS origin is hardcoded to `['http://localhost:3000']`. This will block WebSocket connections in production and any non-localhost deployment.

**Current code:**
```typescript
@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: ['http://localhost:3000'],
    credentials: true,
  },
})
```

**Fix:**
- Inject `CoreConfigService` via constructor
- Read `config.frontend.url` for the origin
- Note: Decorators are evaluated at module load time, so the dynamic value must come from the config service. Use a factory provider or move CORS config to the gateway's `afterInit()` hook.

---

## Phase 2: Architecture Cleanup

### 2A. Extract `alias()` helper to `core/shared/`

**Files affected:** 6 modules
**Severity:** Medium — DRY violation

**Problem:**
The same `alias()` function is defined identically in:
- `src/books/books.module.ts:29-32`
- `src/transactions/transactions.module.ts:21-24`
- `src/social/social.module.ts`
- `src/membership/membership.module.ts`
- `src/profiles/profiles.module.ts`
- `src/chat/chat.module.ts`

**Current (repeated in each module):**
```typescript
const alias = (token: string | symbol, impl: unknown) => ({
  provide: token,
  useExisting: impl,
});
```

**Fix:**
1. Create `src/core/shared/alias.ts`:
   ```typescript
   export const alias = (token: string | symbol, impl: unknown) => ({
     provide: token,
     useExisting: impl,
   });
   ```
2. Update all 6 modules to `import { alias } from '../../core/shared/alias'`
3. Remove the local `alias` definitions

---

### 2B. Promote `Paginated<T>` to `core/shared/`

**Files affected:** `src/books/domain/paginated.ts`, imports in `books/` and `transactions/`
**Severity:** Medium — cross-module import of a "local" type

**Problem:**
`Paginated<T>` and `buildPaginated()` live in `books/domain/paginated.ts` but are imported by `transactions/application/borrows.service.ts`. The comment in the file acknowledges this should be promoted when a second feature needs it.

**Fix:**
1. Move `src/books/domain/paginated.ts` → `src/core/shared/paginated.ts`
2. Update imports:
   - `src/books/application/books.service.ts`
   - `src/books/infrastructure/drizzle-book-read.model.ts`
   - `src/transactions/application/borrows.service.ts`
   - `src/books/domain/paginated.spec.ts` (test)
3. Delete `src/books/domain/paginated.ts`

---

### 2C. Fix `MembershipService` layering violation

**Files affected:** `src/membership/application/membership.service.ts`, `src/transactions/domain/borrow.ts`, `src/transactions/infrastructure/drizzle-borrow.repository.ts`, `src/transactions/transactions.module.ts`, `src/membership/membership.module.ts`
**Severity:** Medium — breaks domain isolation

**Problem:**
`MembershipService.countActiveBorrows()` (line 212-227) injects `DATABASE` and queries `schema.borrows` directly. This couples the membership module to the borrow table schema, violating the clean architecture rule that application services depend only on domain interfaces.

**Current code:**
```typescript
private async countActiveBorrows(userId: string, tx?: DatabaseOrTransaction): Promise<number> {
  const db = tx ?? this.db;
  const [result] = await db
    .select({ value: count() })
    .from(schema.borrows)
    .where(and(eq(schema.borrows.userId, userId), isNull(schema.borrows.returnedAt)));
  return Number(result?.value ?? 0);
}
```

**Fix:**
1. Add `countActiveBorrows(userId: string, tx?: DatabaseOrTransaction): Promise<number>` to `BorrowRepository` interface in `src/transactions/domain/borrow.ts`
2. Implement in `DrizzleBorrowRepository`
3. Export `BORROW_REPOSITORY` from `TransactionsModule` (already exported)
4. `MembershipModule` already imports `TransactionsModule` via `forwardRef` — inject `BORROW_REPOSITORY` into `MembershipService`
5. Remove `DATABASE` injection and `schema` import from `MembershipService`

---

## Phase 3: Code Quality

### 3A. Add DTOs for social and chat controllers

**Files affected:** New DTOs + controller updates
**Severity:** Medium — missing input validation

**Problem:**
`SocialController.createPost()` reads `@Body('text') text: string` directly without a DTO class with `class-validator` decorators. Same for `ChatController.send()` which reads `@Body() body: { receiverId: string; text: string }` without validation. Other controllers (books) use proper DTOs.

**Fix:**

Create `src/social/presentation/dto/create-post.dto.ts`:
```typescript
import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  text!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;
}
```

Create `src/social/presentation/dto/create-reply.dto.ts`:
```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateReplyDto {
  @IsString()
  @IsNotEmpty()
  text!: string;
}
```

Create `src/chat/presentation/dto/send-message.dto.ts`:
```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  receiverId!: string;

  @IsString()
  @IsNotEmpty()
  text!: string;
}
```

Update controllers to use `@Body() dto: CreatePostDto` instead of individual `@Body('text')` parameters.

---

### 3B. Standardize `@CurrentUser()` type

**Files affected:** `social.controller.ts`, `chat.controller.ts`, `chat.gateway.ts`
**Severity:** Low — inconsistency

**Problem:**
Some controllers type the user as `{ id: string }` (e.g., `SocialController`, `ChatController`, `ChatGateway`), while others use `AuthUser` from `iam/auth/auth.port.ts`. The `{ id: string }` pattern is less type-safe and won't pick up future fields added to `AuthUser`.

**Fix:**
- Import `AuthUser` from `../../iam/auth/auth.port` in affected files
- Replace all `{ id: string }` annotations with `AuthUser`
- In `ChatGateway`, type `(socket as any).userId` to use a typed extension or a `Map<socketId, userId>` instead of `(socket as any).userId`

---

### 3C. Add health check endpoint

**Files affected:** `src/app.controller.ts`
**Severity:** Medium — deployment requirement

**Problem:**
No `/health` or `/healthz` endpoint exists for container orchestration (Docker HEALTHCHECK, Kubernetes liveness probe, ALB target group).

**Fix:**
Add to `AppController`:
```typescript
@Get('health')
health() {
  return { status: 'ok' };
}
```

Optionally inject `DATABASE` and run `SELECT 1` for a deep health check.

---

### 3D. Fix Dockerfile to exclude dev dependencies

**File:** `Dockerfile:14-15`
**Severity:** Medium — image size

**Problem:**
The production stage copies the entire `node_modules` from the builder, including all devDependencies (TypeScript, Jest, ESLint, etc.). This significantly increases the production image size.

**Current:**
```dockerfile
COPY --from=builder /app/node_modules ./node_modules
```

**Fix:**
Replace the copy with a production-only install:
```dockerfile
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
```

Or alternatively, add `RUN npm prune --omit=dev` after the copy to remove dev dependencies.

---

## Phase 4: Testing & Performance

### 4A. Add missing database indexes

**Files affected:** `src/core/database/schema.ts` + new migration
**Severity:** Medium — query performance

**Problem:**
Several frequently queried columns lack indexes:
- `books.category` — filtered in `findAll` paginated queries
- `books.createdBy` — user's books query
- `comments.bookId` — book detail page loads all comments
- `posts.userId` — user's posts query (social feed)

**Fix:**
Add to schema:
```typescript
export const books = pgTable('books', {
  // ... existing columns
}, (table) => ({
  categoryIdx: index('books_category_idx').on(table.category),
  createdByIdx: index('books_created_by_idx').on(table.createdBy),
}));

export const comments = pgTable('comments', {
  // ... existing columns
}, (table) => ({
  bookIdIdx: index('comments_book_id_idx').on(table.bookId),
}));

export const posts = pgTable('posts', {
  // ... existing columns
}, (table) => ({
  userIdIdx: index('posts_user_id_idx').on(table.userId),
}));
```

Generate migration: `npm run db:migrate`

---

### 4B. Add `StripeWebhookService` tests

**File:** New `tests/membership/application/stripe-webhook.service.spec.ts`
**Severity:** High — untested complex service

**Problem:**
`StripeWebhookService` handles 4 Stripe event types with idempotency, cross-module delegation, and error handling — but has zero test coverage.

**Test cases to cover:**
1. `handleEvent` dispatches to correct handler based on event type
2. `handleMembershipCheckout` — sets plan, itemLimit, status=active
3. `handleInvoicePaid` — extends currentPeriodEnd
4. `handleSubscriptionUpdated` — syncs cancelAtPeriodEnd, status
5. `handleSubscriptionDeleted` — downgrades to free plan
6. Idempotency — duplicate event IDs are skipped
7. Unknown event types are ignored
8. Stripe errors are handled gracefully

**Mock pattern:**
```typescript
const mockStripe = {
  webhooks: { constructEvent: jest.fn() },
  subscriptions: { retrieve: jest.fn() },
};
```

---

### 4C. Add controller unit tests (optional)

**Severity:** Low — lightweight wrapper tests

**Problem:**
Only `AppController` has a test. All 8 feature controllers lack tests.

**Approach:**
For each controller, verify that:
- Correct service method is called with expected arguments
- Decorators (`@UseGuards`, `@Policies`) are applied
- Response shape matches expectations

These are thin wrapper tests — focus on the social and chat controllers since they're the ones missing DTOs.

---

## Dependency Graph

```
Phase 1A (stock decrement) ─────────────────────────────────────┐
Phase 1B (E2E test path) ──────────────────────────────────────┤
Phase 1C (ChatGateway CORS) ───────────────────────────────────┤
Phase 2A (alias helper) ───────────────────────────────────────┤
Phase 2B (Paginated promotion) ────────────────────────────────┤──→ Verify: npm run lint && npm run test && npm run build
Phase 2C (Membership layering) ─── depends on TransactionsModule┤
Phase 3A (DTOs) ───────────────────────────────────────────────┤
Phase 3B (CurrentUser types) ──────────────────────────────────┤
Phase 3C (Health check) ───────────────────────────────────────┤
Phase 3D (Dockerfile) ─────────────────────────────────────────┤
Phase 4A (Indexes) ────────────────────────────────────────────┤
Phase 4B (Webhook tests) ──────────────────────────────────────┘
```

Phases 1-3 are independent and can be executed in parallel. Phase 4 depends on Phase 1A (stock decrement fix) being complete before adding tests for that flow.

---

## Verification Checklist

After each phase, run:
```bash
npm run lint        # ESLint + Prettier
npm run test        # Jest unit tests
npm run build       # NestJS build
```

After all phases:
```bash
npm run test:e2e    # E2E tests (once path is fixed in 1B)
```
