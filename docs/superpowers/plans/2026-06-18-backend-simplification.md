# Backend Codebase Simplification Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.

**Goal:** Reduce backend code by ~600 lines (~25%) by eliminating dead code, over-split services, and over-abstractions — while preserving exact behavior and NestJS clean architecture principles.

**Architecture:** Six independent tasks that remove unnecessary layers: (1) delete dead code, (2) merge thin likes/ratings services into BooksService, (3) inline LoggerPort abstraction, (4) merge BookReadModel into BookRepository, (5) remove repository interfaces, use concrete Drizzle classes directly, (6) consolidate Stripe provider.

**Tech Stack:** NestJS v11, TypeScript, Drizzle ORM, Jest

---

### Task 1: Delete dead code

**Files to modify:**
- Delete: `backend/src/repositories/interfaces/user.repository.ts` (7 lines, zero callers)
- Delete: `backend/src/repositories/drizzle/drizzle-user.repository.ts` (30 lines, zero callers)
- Delete: `backend/src/repositories/fakes/helpers.ts` (5 lines, zero imports)
- Delete barrel files: `backend/src/books/index.ts`, `backend/src/transactions/index.ts`, `backend/src/reading-goals/index.ts`, `backend/src/social/index.ts`, `backend/src/auth/index.ts` (zero imports using barrel paths)
- Modify: `backend/src/repositories/tokens.ts` — remove `USER_REPO` token
- Modify: `backend/src/repositories/repositories.module.ts` — remove `DrizzleUserRepository` and `userRepoProvider` from providers/exports
- Modify: `backend/src/repositories/interfaces/book.repository.ts` — remove unused `BookLockRow`, `acquireLockForBorrow`, and `setStockForBorrow`
- Modify: `backend/src/repositories/drizzle/drizzle-book.repository.ts` — remove `acquireLockForBorrow` and `setStockForBorrow` implementations (never called — borrows.service.ts does these inline)
- Modify: `backend/src/books/books.service.ts` — remove unused `decrementStock` method (never called by any controller)

- [ ] **Step 1: Delete `user.repository.ts` interface and `drizzle-user.repository.ts`**

Remove files. Then clean up references in `tokens.ts` (remove `USER_REPO` line) and `repositories.module.ts` (remove imports and provider/exports entries).

- [ ] **Step 2: Delete `fakes/helpers.ts`**

Simple file deletion. No imports to clean up.

- [ ] **Step 3: Delete all 5 barrel `index.ts` files**

Remove: `books/index.ts`, `transactions/index.ts`, `reading-goals/index.ts`, `social/index.ts`, `auth/index.ts`. No imports reference them.

- [ ] **Step 4: Remove unused methods from `BookRepository`**

In `interfaces/book.repository.ts`, remove:
```typescript
export interface BookLockRow { ... }  // unused struct
```
And from the `BookRepository` interface, remove:
```typescript
setStockForBorrow(bookId: string, remaining: number): Promise<BookRow | null>;
acquireLockForBorrow(bookId: string): Promise<BookLockRow | null>;
```

In `drizzle-book.repository.ts`, remove the corresponding method implementations.

- [ ] **Step 5: Remove unused `decrementStock` from `BooksService`**

`books.service.ts` line ~58-60 — never called by any controller endpoint.

- [ ] **Step 6: Build and test**

Run: `npx jest` from `backend/`
Expected: All tests pass. Fewer test suites since `in-memory-like.repository.spec.ts` may reference `helpers.ts`.

- [ ] **Step 7: Commit**

```bash
git add backend/src/
git rm backend/src/repositories/interfaces/user.repository.ts backend/src/repositories/drizzle/drizzle-user.repository.ts backend/src/repositories/fakes/helpers.ts
git rm backend/src/books/index.ts backend/src/transactions/index.ts backend/src/reading-goals/index.ts backend/src/social/index.ts backend/src/auth/index.ts
git commit -m "refactor: remove dead code — UserRepository, barrel files, unused methods"
```

---

### Task 2: Merge LikesService + RatingsService into BooksService

**Problem:** `LikesService` (17 lines) and `RatingsService` (26 lines) are pure pass-through wrappers. `LikesController` and `RatingsController` exist only to delegate one method each.

**Files:**
- Modify: `backend/src/books/books.service.ts` — absorb `LikesService` and `RatingsService` logic
- Modify: `backend/src/books/books.controller.ts` — absorb like/rate endpoints from `LikesController` and `RatingsController`
- Delete: `backend/src/books/likes.service.ts`
- Delete: `backend/src/books/likes.controller.ts`
- Delete: `backend/src/books/ratings.service.ts`
- Delete: `backend/src/books/ratings.controller.ts`
- Modify: `backend/src/books/books.module.ts` — remove deleted services/controllers

- [ ] **Step 1: Read current files**

Read `likes.service.ts`, `ratings.service.ts`, `likes.controller.ts`, `ratings.controller.ts`, `books.service.ts`, `books.controller.ts`, `books.module.ts`.

- [ ] **Step 2: Add like logic to `BooksService`**

Inject `LIKE_REPO` in `BooksService` constructor. Add these methods:
```typescript
constructor(
    @Inject(BOOK_REPO) private readonly books: BookRepository,
    @Inject(BOOK_READ_MODEL) private readonly readModel: BookReadModel,
    @Inject(LIKE_REPO) private readonly likes: LikeRepository,
    @Inject(RATING_REPO) private readonly ratings: RatingRepository,
) {}
```

```typescript
// From LikesService — unchanged logic
isLiked(bookId: string, userId: string) {
    return this.likes.isLikedBy(bookId, userId);
}

async toggleLike(bookId: string, userId: string) {
    const liked = await this.likes.toggle(bookId, userId);
    return { liked };
}
```

- [ ] **Step 3: Add rating logic to `BooksService`**

```typescript
// From RatingsService — unchanged logic
getUserRating(bookId: string, userId: string) {
    return this.ratings.findUserRating(bookId, userId);
}

async rateBook(bookId: string, userId: string, rating: number) {
    return this.ratings.upsert(bookId, userId, rating);
}
```

- [ ] **Step 4: Move like/rate controller routes into `BooksController`**

Inject `OptionalAuthGuard` (needed for `isLiked` which is optional auth). Add routes from `LikesController` and `RatingsController`:
```typescript
@Get(':id/like')
@UseGuards(OptionalAuthGuard)
isLiked(@Param('id') id: string, @OptionalUser() user?: { id: string }) {
    if (!user) return { liked: false };
    return this.booksService.isLiked(id, user.id);
}

@Post(':id/like')
@UseGuards(AuthGuard)
toggleLike(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.booksService.toggleLike(id, user.id);
}

@Get(':id/rate')
@UseGuards(OptionalAuthGuard)
getRating(@Param('id') id: string, @OptionalUser() user?: { id: string }) {
    if (!user) return null;
    return this.booksService.getUserRating(id, user.id);
}

@Post(':id/rate')
@UseGuards(AuthGuard)
rateBook(@Param('id') id: string, @Body() dto: RateBookDto, @CurrentUser() user: { id: string }) {
    return this.booksService.rateBook(id, user.id, dto.rating);
}
```

- [ ] **Step 5: Update `BooksModule`**

Remove `LikesService`, `LikesController`, `RatingsService`, `RatingsController` from providers/controllers arrays.

- [ ] **Step 6: Delete the 4 old files**

- [ ] **Step 7: Build and test**

Run: `npx jest` from `backend/`
Expected: All tests pass. No tests existed for LikesService/RatingsService directly.

- [ ] **Step 8: Commit**

```bash
git add backend/src/books/
git rm backend/src/books/likes.service.ts backend/src/books/likes.controller.ts backend/src/books/ratings.service.ts backend/src/books/ratings.controller.ts
git commit -m "refactor: merge LikesService and RatingsService into BooksService"
```

---

### Task 3: Inline LoggerPort abstraction

**Problem:** `LoggerPort` interface + `PinoLoggerAdapter` (48 lines total) wraps `PinoLogger` but only has one caller (`AllExceptionsFilter`). The adapter renames `info` to `log` and `trace` to `verbose`. This is over-engineering.

**Files:**
- Modify: `backend/src/shared/errors/all-exceptions.filter.ts` — inject `PinoLogger` directly
- Modify: `backend/src/shared/logger/logger.module.ts` — remove adapter/provider registration
- Delete: `backend/src/shared/logger/logger.port.ts`
- Delete: `backend/src/shared/logger/pino-logger.adapter.ts`
- Modify: `backend/src/shared/shared.module.ts` — update exports if needed

- [ ] **Step 1: Update `AllExceptionsFilter` to use `PinoLogger` directly**

```typescript
// Before
import { LOGGER_PORT, type LoggerPort } from '../logger/logger.port';
constructor(@Inject(LOGGER_PORT) private readonly logger: LoggerPort) {}

// After
import { PinoLogger } from 'nestjs-pino';
constructor(private readonly logger: PinoLogger) {}
```

Update method calls: `this.logger.error(...)` stays the same (Pino has `.error()`). If the adapter renamed anything, use Pino's native method names.

- [ ] **Step 2: Update `all-exceptions.filter.spec.ts`**

The test may create a mock `LoggerPort`. Replace with a mock `PinoLogger`:
```typescript
// Before
const mockLogger = { error: jest.fn(), warn: jest.fn() };

// After — same shape, PinoLogger also has .error() and .warn()
const mockLogger = { error: jest.fn(), warn: jest.fn() };
```

- [ ] **Step 3: Update `logger.module.ts`**

Remove `PinoLoggerAdapter` and `LOGGER_PORT` provider. Only keep the `nestjs-pino` `LoggerModule.forRoot()`.

- [ ] **Step 4: Delete `logger.port.ts` and `pino-logger.adapter.ts`**

- [ ] **Step 5: Fix `main.ts` if needed**

Read `main.ts` — if it uses `LOGGER_PORT` token to get the filter, switch to `PinoLogger`:
```typescript
// Before
app.useGlobalFilters(new AllExceptionsFilter(app.get(LOGGER_PORT)));
// After
app.useGlobalFilters(new AllExceptionsFilter(app.get(PinoLogger)));
```

- [ ] **Step 6: Build and test**

Run: `npx jest` from `backend/`
Expected: All tests pass, including `all-exceptions.filter.spec.ts`.

- [ ] **Step 7: Commit**

```bash
git add backend/src/shared/ backend/src/main.ts
git rm backend/src/shared/logger/logger.port.ts backend/src/shared/logger/pino-logger.adapter.ts
git commit -m "refactor: inline LoggerPort — inject PinoLogger directly"
```

---

### Task 4: Merge BookReadModel into BookRepository

**Problem:** `BookReadModel` is a separate interface (54 lines) + Drizzle implementation (133 lines) + DI token + provider. It's the SAME table as `BookRepository` but with subquery projections. The separation adds complexity for marginal benefit.

**Files:**
- Modify: `backend/src/repositories/interfaces/book.repository.ts` — add read model methods
- Modify: `backend/src/repositories/drizzle/drizzle-book.repository.ts` — add read model implementations
- Delete: `backend/src/repositories/drizzle/drizzle-book-read.model.ts`
- Modify: `backend/src/repositories/tokens.ts` — remove `BOOK_READ_MODEL`
- Modify: `backend/src/repositories/repositories.module.ts` — remove `DrizzleBookReadModel` + `bookReadModelProvider`
- Modify: `backend/src/books/books.service.ts` — remove `BOOK_READ_MODEL` injection, use `books` repo for all
- Modify: `backend/src/transactions/borrows.service.ts` — same
- Modify: `backend/src/transactions/purchase-confirmation.service.ts` — same

- [ ] **Step 1: Read both files**

Read `interfaces/book.repository.ts`, `drizzle-book.repository.ts`, and `drizzle-book-read.model.ts` to understand the full API surface.

- [ ] **Step 2: Add read model methods to `BookRepository` interface**

Copy these from the current `BookReadModel` interface:
```typescript
findFullById(id: string): Promise<BookRow | null>;
findFullByIdOrSlug(idOrSlug: string): Promise<BookRow | null>;
findFullPaginated(page: number, limit: number, category?: string): Promise<Paginated<BookRow>>;
findNewArrivals(limit: number): Promise<BookRow[]>;
getTrending(limit: number): Promise<BookRow[]>;
attachToBorrows(borrows: Array<{ bookId: string }>): Promise<Map<string, BookRow>>;
attachToPurchases(purchases: Array<{ bookId: string }>): Promise<Map<string, BookRow>>;
```

- [ ] **Step 3: Merge Drizzle implementations**

Copy the method bodies from `drizzle-book-read.model.ts` into `DrizzleBookRepository`. Remove the `@Injectable()` decorator and class wrapper from the read model (it's now part of the repo class).

Remove `BookReadModel` interface type. Rename method names if there's a collision (e.g. if `findByIdOrSlug` exists in both, keep the one with subquery projections and rename the bare one to `findBareByIdOrSlug` — but check first if the bare one is used anywhere).

- [ ] **Step 4: Update all callers**

In `books.service.ts`:
```typescript
// Before
@Inject(BOOK_REPO) private readonly books: BookRepository,
@Inject(BOOK_READ_MODEL) private readonly readModel: BookReadModel,

// After
@Inject(BOOK_REPO) private readonly books: BookRepository,
```
Replace all `this.readModel.findFullPaginated(...)` with `this.books.findFullPaginated(...)` etc.

Same in `borrows.service.ts` and `purchase-confirmation.service.ts`.

- [ ] **Step 5: Update module registrations**

Remove `DrizzleBookReadModel` and `bookReadModelProvider` from `repositories.module.ts`.
Remove `BOOK_READ_MODEL` from `tokens.ts`.

- [ ] **Step 6: Delete `drizzle-book-read.model.ts`**

- [ ] **Step 7: Build and test**

Run: `npx jest` from `backend/`

- [ ] **Step 8: Commit**

```bash
git add backend/src/
git commit -m "refactor: merge BookReadModel into BookRepository"
```

---

### Task 5: Remove repository interfaces, use concrete Drizzle classes

**Problem:** Every entity has an interface + Drizzle impl + Symbol token + provider adapter — 4 artifacts per entity. None of the interfaces are swap-tested (except `LikeRepository` via `InMemoryLikeRepository`). NestJS DI supports `@Injectable()` classes as tokens directly.

**Files:** Many, but mechanically straightforward — find/replace `@Inject(X_REPO)` with the concrete Drizzle class name.

- [ ] **Step 1: Make all Drizzle repositories `@Injectable()` and use them as their own tokens**

In each `drizzle/drizzle-xxx.repository.ts`, keep the `@Injectable()` decorator. The class itself becomes the DI token.

- [ ] **Step 2: Simplify `repositories.module.ts`**

Replace:
```typescript
providers: [
    DrizzleBookRepository,
    // ... all others
    bookRepoProvider,      // these adapter objects removed
    bookReadModelProvider,
    // ...
],
exports: [
    bookRepoProvider,
    // ...
],
```

With:
```typescript
providers: [
    DrizzleBookRepository,
    DrizzleCommentRepository,
    DrizzleRatingRepository,
    DrizzleLikeRepository,
    DrizzleBorrowRepository,
    DrizzlePurchaseRepository,
    DrizzlePostRepository,
    DrizzleGoalRepository,
],
exports: [
    DrizzleBookRepository,
    DrizzleCommentRepository,
    DrizzleRatingRepository,
    DrizzleLikeRepository,
    DrizzleBorrowRepository,
    DrizzlePurchaseRepository,
    DrizzlePostRepository,
    DrizzleGoalRepository,
],
```

Remove all `xxxProvider` import lines and factory objects.

- [ ] **Step 3: Update all `@Inject(X_REPO)` in services**

```typescript
// Before
import { BOOK_REPO, type BookRepository } from '../repositories/tokens';
@Inject(BOOK_REPO) private readonly books: BookRepository,

// After
import { DrizzleBookRepository } from '../repositories/drizzle/drizzle-book.repository';
private readonly books: DrizzleBookRepository,
```

When using the class as the token, NestJS auto-resolves by type — `@Inject()` is NOT needed when the type === the class. So this becomes:
```typescript
constructor(
    private readonly books: DrizzleBookRepository,
    private readonly comments: DrizzleCommentRepository,
    // ...
) {}
```

- [ ] **Step 4: Update `PolicyModule`**

`ownership.policy.ts` injects `BOOK_REPO` and `COMMENT_REPO`. Switch to `DrizzleBookRepository` and `DrizzleCommentRepository`.

```typescript
// Before
import { BOOK_REPO, COMMENT_REPO } from '../../repositories/tokens';
@Inject(BOOK_REPO) private readonly books: BookRepository,
@Inject(COMMENT_REPO) private readonly comments: CommentRepository,

// After
import { DrizzleBookRepository } from '../../repositories/drizzle/drizzle-book.repository';
import { DrizzleCommentRepository } from '../../repositories/drizzle/drizzle-comment.repository';
private readonly books: DrizzleBookRepository,
private readonly comments: DrizzleCommentRepository,
```

- [ ] **Step 5: Update tests**

Test mocks using `{ provide: BOOK_REPO, useValue: {...} }` become:
```typescript
{ provide: DrizzleBookRepository, useValue: {...} }
```

- [ ] **Step 6: Delete all interface files in `repositories/interfaces/`**

Delete: `book.repository.ts`, `comment.repository.ts`, `like.repository.ts`, `rating.repository.ts`, `borrow.repository.ts`, `purchase.repository.ts`, `post.repository.ts`, `goal.repository.ts`. (User repo already deleted.)

- [ ] **Step 7: Simplify `tokens.ts`**

Now only contains type re-exports (derive types from the Drizzle classes instead). Or delete `tokens.ts` entirely and import types directly from Drizzle schema.

- [ ] **Step 8: Clean up `InMemoryLikeRepository`**

If `LikeRepository` interface is deleted, change `InMemoryLikeRepository implements LikeRepository` to `InMemoryLikeRepository extends DrizzleLikeRepository` or just make it a standalone class that matches the same method signatures.

- [ ] **Step 9: Build and test**

Run: `npx jest` from `backend/`

- [ ] **Step 10: Commit**

```bash
git add backend/src/
git rm backend/src/repositories/interfaces/*.ts backend/src/repositories/tokens.ts
git commit -m "refactor: remove repository interfaces, use concrete Drizzle classes as DI tokens"
```

---

### Task 6: Consolidate Stripe provider and inline STRIPE token

**Problem:** `stripe.provider.ts` is 14 lines that create a `Stripe` client from config. Only `CheckoutService` and `PurchaseConfirmationService` use it. The `STRIPE` Symbol token is used in only 2 places.

**Files:**
- Modify: `backend/src/transactions/checkout.service.ts` — construct Stripe from ConfigService directly
- Modify: `backend/src/transactions/purchase-confirmation.service.ts` — same
- Delete: `backend/src/transactions/stripe.provider.ts`
- Modify: `backend/src/transactions/transactions.module.ts` — remove STRIPE provider

- [ ] **Step 1: Inline Stripe creation in both services**

```typescript
// In both CheckoutService and PurchaseConfirmationService
import { ConfigService } from '../config/config.provider';
import Stripe from 'stripe';

@Injectable()
export class CheckoutService {
    private readonly stripe: Stripe;
    
    constructor(
        config: ConfigService,
        // other injections...
    ) {
        this.stripe = new Stripe(config.stripe.secretKey);
    }
}
```

- [ ] **Step 2: Delete `stripe.provider.ts` and clean up module**

- [ ] **Step 3: Build and test**

Run: `npx jest`

- [ ] **Step 4: Commit**

```bash
git add backend/src/transactions/
git rm backend/src/transactions/stripe.provider.ts
git commit -m "refactor: inline Stripe creation into services, remove stripe.provider"
```

---

## Summary

| Task | Lines eliminated | Risk |
|---|---|---|
| 1. Dead code removal | ~120 | Low |
| 2. Merge likes/ratings → BooksService | ~70 | Low |
| 3. Inline LoggerPort | ~48 | Low |
| 4. Merge BookReadModel → BookRepository | ~140 | Medium |
| 5. Remove repository interfaces | ~270 | Medium |
| 6. Inline Stripe provider | ~14 | Low |
| **Total** | **~662 lines (~27%)** | |

All tasks are independent and can execute in any order. Tasks 4 and 5 touch the most files but are mechanically straightforward (find/replace patterns).
