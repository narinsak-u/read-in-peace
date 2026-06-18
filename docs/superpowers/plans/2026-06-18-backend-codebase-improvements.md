# Backend Codebase Improvements Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address architectural and type-safety issues identified during backend code review, making the codebase more maintainable and type-safe.

**Architecture:** Seven independent tasks that can be executed in any order: (1) enable strict TypeScript, (2) replace string DI tokens with Symbols, (3) remove redundant ownership checks in service layer, (4) remove unused `userId` parameter from repository interface, (5) add barrel files, (6) remove unnecessary global module re-imports, (7) document architectural decisions.

**Tech Stack:** NestJS v11, TypeScript, Drizzle ORM, Jest

---

### Task 1: Enable strict TypeScript

**Files:**
- Modify: `backend/tsconfig.json:21`
- Potentially many `.ts` files across `backend/src/`

- [ ] **Step 1: Flip `noImplicitAny` and add `strict` in tsconfig**

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictBindCallApply": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

Replace lines 19-23 in `tsconfig.json`:
```
-    "strictNullChecks": true,
-    "forceConsistentCasingInFileNames": true,
-    "noImplicitAny": false,
-    "strictBindCallApply": false,
-    "noFallthroughCasesInSwitch": false
+    "strict": true,
+    "forceConsistentCasingInFileNames": true
```

`strict: true` enables `strictNullChecks`, `strictBindCallApply`, `noImplicitAny`, `strictFunctionTypes`, `strictPropertyInitialization` in one flag. Remove the redundant individual flags.

- [ ] **Step 2: Run the build and record all errors**

Run: `npx nest build`
Expected: TypeScript compiler errors for any implicit `any` types.

- [ ] **Step 3: Fix implicit `any` errors across the codebase**

Common patterns to fix:

**a) Catch clauses — add `unknown` type:**
```typescript
// Before
try { ... } catch (error) { ... }

// After
try { ... } catch (error: unknown) { ... }
```

**b) Function parameters without types — add explicit type annotations:**
```typescript
// Before
setup: (cls, req) => { ... }

// After
setup: (
  cls: ClsService,
  req: { method?: string; originalUrl?: string; url?: string },
) => { ... }
```

**c) Middleware/Express request handlers — add explicit types:**
```typescript
// Before
app.use('/api/auth', (req, res, next) => { ... });

// After
app.use('/api/auth', (req: Request, res: Response, next: NextFunction) => { ... });
```

**d) Generic type parameters for Map/Array/Set — add type args:**
```typescript
// Before
const map = new Map();
const arr = [];

// After
const map = new Map<string, BookRow>();
const arr: string[] = [];
```

- [ ] **Step 4: Build again to confirm zero errors**

Run: `npx nest build`
Expected: Build succeeds, no errors.

- [ ] **Step 5: Run tests to confirm no regressions**

Run: `npx jest`
Expected: All existing tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/tsconfig.json backend/src/
git commit -m "refactor: enable strict TypeScript and fix all implicit any errors"
```

---

### Task 2: Replace string DI tokens with Symbols

**Files:**
- Modify: `backend/src/repositories/tokens.ts`
- Modify: `backend/src/auth/better-auth.ts`
- Modify: `backend/src/auth/auth.port.ts`
- Modify: `backend/src/db/db.module.ts` (shared token exports)
- Modify: `backend/src/transactions/stripe.provider.ts`
- Potentially modify: all files using `@Inject('STRING_TOKEN')`

- [ ] **Step 1: Convert repository tokens from strings to Symbols**

In `backend/src/repositories/tokens.ts`, change:
```typescript
export const BOOK_REPO = 'BOOK_REPO';
export const COMMENT_REPO = 'COMMENT_REPO';
export const RATING_REPO = 'RATING_REPO';
export const LIKE_REPO = 'LIKE_REPO';
export const BORROW_REPO = 'BORROW_REPO';
export const PURCHASE_REPO = 'PURCHASE_REPO';
export const POST_REPO = 'POST_REPO';
export const GOAL_REPO = 'GOAL_REPO';
export const USER_REPO = 'USER_REPO';
export const BOOK_READ_MODEL = 'BOOK_READ_MODEL';
```

To:
```typescript
export const BOOK_REPO = Symbol('BOOK_REPO');
export const COMMENT_REPO = Symbol('COMMENT_REPO');
export const RATING_REPO = Symbol('RATING_REPO');
export const LIKE_REPO = Symbol('LIKE_REPO');
export const BORROW_REPO = Symbol('BORROW_REPO');
export const PURCHASE_REPO = Symbol('PURCHASE_REPO');
export const POST_REPO = Symbol('POST_REPO');
export const GOAL_REPO = Symbol('GOAL_REPO');
export const USER_REPO = Symbol('USER_REPO');
export const BOOK_READ_MODEL = Symbol('BOOK_READ_MODEL');
```

No `@Inject()` call sites need changing — `@Inject(Symbol('BOOK_REPO'))` works the same as `@Inject('BOOK_REPO')` because TypeScript resolves the const reference at compile time. However, verify by running the build.

- [ ] **Step 2: Convert AUTH token from string to Symbol**

In `backend/src/auth/better-auth.ts`:
```typescript
// Before
export const AUTH = 'AUTH';

// After
export const AUTH = Symbol('AUTH');
```

- [ ] **Step 3: Convert AUTH_PORT token from string to Symbol if needed**

In `backend/src/auth/auth.port.ts`, verify it's already a Symbol (line 10):
```typescript
export const AUTH_PORT = Symbol('AUTH_PORT');
```
It is — no change needed.

- [ ] **Step 4: Convert DRIZZLE token from string to Symbol**

Read `backend/src/db/db.provider.ts` to check the token type. If it uses a string, convert to Symbol. Update the re-export in `db.module.ts` accordingly.

```typescript
// In db.provider.ts
export const DRIZZLE = Symbol('DRIZZLE');
```

- [ ] **Step 5: Convert STRIPE token from string to Symbol**

In `backend/src/transactions/stripe.provider.ts`:
```typescript
// Before
export const STRIPE = 'STRIPE';

// After
export const STRIPE = Symbol('STRIPE');
```

- [ ] **Step 6: Convert CONFIG_RAW token from string to Symbol**

In `backend/src/config/config.module.ts`:
```typescript
// Add a Symbol export
export const CONFIG_RAW = Symbol('CONFIG_RAW');
```

Then in `backend/src/config/config.provider.ts`:
```typescript
// Update @Inject
constructor(@Inject(CONFIG_RAW) raw: NodeJS.ProcessEnv) {
```

And in `backend/src/config/config.module.ts`, update the useFactory reference. However, since `ConfigModule` uses `useFactory: () => new ConfigService(process.env)`, it directly calls the constructor. The `CONFIG_RAW` injection token is only needed if using NestJS DI. Let's remove it entirely — just have `ConfigService` accept `process.env` directly in the factory.

Actually, the simpler approach: since `ConfigModule` already creates `ConfigService` via `useFactory: () => new ConfigService(process.env)`, the `@Inject('CONFIG_RAW')` decorator in `ConfigService` is unused (the instance is constructed manually, not via DI).

Remove `@Inject('CONFIG_RAW')` from `backend/src/config/config.provider.ts`:
```typescript
// Before
constructor(@Inject('CONFIG_RAW') raw: NodeJS.ProcessEnv) {

// After
constructor(raw: NodeJS.ProcessEnv) {
```

- [ ] **Step 7: Convert LOGGER_PORT token from string to Symbol**

Check `backend/src/shared/logger/logger.port.ts` — if it uses a string token, convert:
```typescript
export const LOGGER_PORT = Symbol('LOGGER_PORT');
```

- [ ] **Step 8: Build and test**

Run: `npx nest build && npx jest`
Expected: Build succeeds, all tests pass.

- [ ] **Step 9: Commit**

```bash
git add backend/src/
git commit -m "refactor: replace string DI tokens with Symbols for compile-time safety"
```

---

### Task 3: Remove redundant ownership checks in service layer

**Background:** Both `BooksController` (via `@Policies(CAN_EDIT_BOOK/CAN_DELETE_BOOK)`) and `BooksService` (`update()` and `remove()`) independently verify book ownership. The guard-level check is sufficient for HTTP contexts. Remove the service-level redundancy.

**Files:**
- Modify: `backend/src/books/books.service.ts:48-66`
- Modify: `backend/src/books/books.controller.ts:70-71,77-78`
- Test: `backend/src/app.controller.spec.ts` (verify basic flow still works)

- [ ] **Step 1: Remove ownership checks from `BooksService.update()` and `remove()`**

In `backend/src/books/books.service.ts`, remove `ForbiddenException` import and simplify methods:

```typescript
// Near top — remove ForbiddenException import
import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

// Replace update method
async update(id: string, data: UpdateBookDto, userId: string) {
  const updated = await this.books.update(id, data, userId);
  if (!updated) throw new NotFoundException('Book not found');
  return updated;
}

// Replace remove method
async remove(id: string, userId: string) {
  const deleted = await this.books.delete(id, userId);
  if (!deleted) throw new NotFoundException('Book not found');
}
```

- [ ] **Step 2: Remove `userId` parameter from controller calls since service no longer needs it (delegates to repo directly)**

Actually, the repository `update()` and `delete()` still accept `userId` — that's addressed in Task 4. For now, the service still passes `userId` through to the repository. Keep the controller passing `user.id` to the service.

Note: The `userId` parameter in `BooksService.update(id, data, userId)` is still forwarded to `this.books.update(id, data, userId)`. After Task 4 removes `userId` from the repository interface, this method signature can also drop `userId`.

- [ ] **Step 3: Run tests**

Run: `npx jest`
Expected: All tests pass. The ownership policy tests in `ownership.policy.spec.ts` still cover the guard-level check.

- [ ] **Step 4: Commit**

```bash
git add backend/src/books/books.service.ts
git commit -m "refactor: remove redundant ownership checks from BooksService (already covered by PoliciesGuard)"
```

---

### Task 4: Remove unused `userId` parameter from BookRepository interface

**Background:** `DrizzleBookRepository.update()` and `delete()` accept `_userId` but ignore it (the `void _userId` pattern). Ownership is enforced by the `PoliciesGuard` and/or `BooksService`. Remove this unused parameter from the interface and all implementations/callers.

**Files:**
- Modify: `backend/src/repositories/interfaces/book.repository.ts:30-31`
- Modify: `backend/src/repositories/drizzle/drizzle-book.repository.ts:78-99`
- Modify: `backend/src/books/books.service.ts:48-66`

- [ ] **Step 1: Update the repository interface**

In `backend/src/repositories/interfaces/book.repository.ts`:
```typescript
// Change
update(id: string, data: UpdateBook, userId: string): Promise<BookRow | null>;
delete(id: string, userId: string): Promise<boolean>;

// To
update(id: string, data: UpdateBook): Promise<BookRow | null>;
delete(id: string): Promise<boolean>;
```

- [ ] **Step 2: Update the Drizzle implementation**

In `backend/src/repositories/drizzle/drizzle-book.repository.ts`:
```typescript
// Replace update method
async update(id: string, data: UpdateBook): Promise<BookRow | null> {
  const [row] = await this.db
    .update(schema.books)
    .set(data)
    .where(eq(schema.books.id, id))
    .returning();
  return row ?? null;
}

// Replace delete method
async delete(id: string): Promise<boolean> {
  const result = await this.db
    .delete(schema.books)
    .where(eq(schema.books.id, id))
    .returning({ id: schema.books.id });
  return result.length > 0;
}
```

- [ ] **Step 3: Update the service callers**

In `backend/src/books/books.service.ts`:
```typescript
// In update method
const updated = await this.books.update(id, data);

// In remove method
const deleted = await this.books.delete(id);
```

- [ ] **Step 4: Build and test**

Run: `npx nest build && npx jest`
Expected: Build succeeds, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/repositories/interfaces/book.repository.ts backend/src/repositories/drizzle/drizzle-book.repository.ts backend/src/books/books.service.ts
git commit -m "refactor: remove unused userId param from BookRepository.update and delete"
```

---

### Task 5: Add barrel files for module public API

**Files:**
- Create: `backend/src/books/index.ts`
- Create: `backend/src/transactions/index.ts`
- Create: `backend/src/reading-goals/index.ts`
- Create: `backend/src/social/index.ts`
- Create: `backend/src/auth/index.ts`
- Modify: `backend/src/app.module.ts` (update imports to use barrel paths)

- [ ] **Step 1: Verify current imports in `app.module.ts`**

Read `backend/src/app.module.ts` to see current import paths.

- [ ] **Step 2: Create barrel for books module**

Create `backend/src/books/index.ts`:
```typescript
export { BooksModule } from './books.module';
export { BooksController } from './books.controller';
export { BooksService } from './books.service';
export { LikesController } from './likes.controller';
export { LikesService } from './likes.service';
export { CommentsController } from './comments.controller';
export { CommentsService } from './comments.service';
export { RatingsController } from './ratings.controller';
export { RatingsService } from './ratings.service';
export { CreateBookDto } from './dto/create-book.dto';
export { UpdateBookDto } from './dto/update-book.dto';
export { CreateCommentDto } from './dto/create-comment.dto';
export { RateBookDto } from './dto/rate-book.dto';
```

- [ ] **Step 3: Create barrel for transactions module**

Create `backend/src/transactions/index.ts`:
```typescript
export { TransactionsModule } from './transactions.module';
export { TransactionsController } from './transactions.controller';
export { BorrowsService } from './borrows.service';
export { CheckoutService } from './checkout.service';
export { PurchaseConfirmationService } from './purchase-confirmation.service';
```

- [ ] **Step 4: Create barrel for reading-goals module**

Create `backend/src/reading-goals/index.ts`:
```typescript
export { ReadingGoalsModule } from './reading-goals.module';
export { ReadingGoalsController } from './reading-goals.controller';
export { ReadingGoalsService } from './reading-goals.service';
```

- [ ] **Step 5: Create barrel for social module**

Create `backend/src/social/index.ts`:
```typescript
export { SocialModule } from './social.module';
export { SocialController } from './social.controller';
export { SocialService } from './social.service';
```

- [ ] **Step 6: Create barrel for auth module**

Create `backend/src/auth/index.ts`:
```typescript
export { AuthModule } from './auth.module';
export { AuthGuard } from './auth.guard';
export { OptionalAuthGuard } from './optional-auth.guard';
export { CurrentUser } from './current-user.decorator';
export { OptionalUser } from './optional-user.decorator';
export { PoliciesGuard } from './policies/policies.guard';
export { Policies } from './policies/policies.decorator';
export { CAN_EDIT_BOOK, CAN_DELETE_BOOK, CAN_DELETE_COMMENT } from './policies/policy.types';
```

- [ ] **Step 7: Build and test**

Run: `npx nest build && npx jest`
Expected: Build succeeds (barrel files are passive — existing imports using direct paths still work).

- [ ] **Step 8: Commit**

```bash
git add backend/src/books/index.ts backend/src/transactions/index.ts backend/src/reading-goals/index.ts backend/src/social/index.ts backend/src/auth/index.ts
git commit -m "feat: add barrel files for module public API"
```

---

### Task 6: Remove unnecessary global module re-imports

**Background:** `DbModule`, `ConfigModule`, and `SharedModule` are all `@Global()`. Their providers are available everywhere without explicit importing. `ReadingGoalsModule` and `SocialModule` both import `DbModule` unnecessarily.

**Files:**
- Modify: `backend/src/reading-goals/reading-goals.module.ts`
- Modify: `backend/src/social/social.module.ts`

- [ ] **Step 1: Remove `DbModule` import from `ReadingGoalsModule`**

```typescript
// Before
import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { ReadingGoalsController } from './reading-goals.controller';
import { ReadingGoalsService } from './reading-goals.service';

@Module({
  imports: [DbModule],
  controllers: [ReadingGoalsController],
  providers: [ReadingGoalsService],
})
export class ReadingGoalsModule {}

// After
import { Module } from '@nestjs/common';
import { ReadingGoalsController } from './reading-goals.controller';
import { ReadingGoalsService } from './reading-goals.service';

@Module({
  controllers: [ReadingGoalsController],
  providers: [ReadingGoalsService],
})
export class ReadingGoalsModule {}
```

- [ ] **Step 2: Remove `DbModule` import from `SocialModule`**

```typescript
// Before
import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';

@Module({
  imports: [DbModule],
  controllers: [SocialController],
  providers: [SocialService],
})
export class SocialModule {}

// After
import { Module } from '@nestjs/common';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';

@Module({
  controllers: [SocialController],
  providers: [SocialService],
})
export class SocialModule {}
```

- [ ] **Step 3: Build and test**

Run: `npx nest build && npx jest`
Expected: Build succeeds, all tests pass. Removing global module imports has no runtime effect since the providers are still available globally.

- [ ] **Step 4: Commit**

```bash
git add backend/src/reading-goals/reading-goals.module.ts backend/src/social/social.module.ts
git commit -m "refactor: remove unnecessary global module re-imports in ReadingGoalsModule and SocialModule"
```

---

### Task 7: Document architectural decisions

**Files:**
- Create: `backend/docs/adr/001-handrolled-config.md`
- Create: `backend/docs/adr/002-string-vs-symbol-tokens.md`
- Create: `backend/docs/adr/003-repository-boundary.md`

- [ ] **Step 1: Check if `backend/docs/adr/` directory exists**

Run: `ls backend/docs/`

If it doesn't exist:
```bash
mkdir backend/docs/adr
```

- [ ] **Step 2: Create ADR for hand-rolled config decision**

Create `backend/docs/adr/001-handrolled-config.md`:
```markdown
# ADR 001: Hand-rolled ConfigService vs @nestjs/config

**Date:** 2026-06-18

## Context
The backend needs typed, validated configuration from environment variables.
Options: use `@nestjs/config` (the official NestJS package) or a custom provider.

## Decision
We use a hand-rolled `ConfigService` with Zod schema validation.

## Rationale
- Zero external dependency beyond Zod (which we already use)
- Full control over defaults, parsing, and typed config groups
- `@nestjs/config` adds complexity (partial registration, namespace support) we don't need
- The entire config layer is ~80 lines — not worth a framework dependency

## Consequences
- No automatic `.env` loading (we use `dotenv/config` import in `main.ts` instead)
- No hot-reload for config (acceptable — config changes require restart anyway)
- Future plugins that rely on `@nestjs/config`'s `ConfigService` token won't work directly
```

- [ ] **Step 3: Create ADR for Symbol-based DI tokens**

Create `backend/docs/adr/002-symbol-di-tokens.md`:
```markdown
# ADR 002: Symbol-based DI tokens

**Date:** 2026-06-18

## Context
NestJS supports both string and Symbol values as injection tokens.
Our codebase uses string tokens like `'BOOK_REPO'`.

## Decision
Use `Symbol('BOOK_REPO')` instead of `'BOOK_REPO'`.

## Rationale
- Symbols are unique — no risk of collision with other tokens (including third-party packages)
- A typo in a string token (`'BOOK_REPO'` vs `'BOOK_REPO'`) fails at runtime
- A typo in a Symbol import fails at compile time
- `@Inject()` accepts Symbol values identically to strings

## Consequences
- All DI tokens must be imported (not inlined as strings)
- Module boundaries remain explicit
```

- [ ] **Step 4: Create ADR for repository interface scope**

Create `backend/docs/adr/003-repository-boundary.md`:
```markdown
# ADR 003: Repository interface boundary

**Date:** 2026-06-18

## Context
Repository interfaces define the contract between business logic (services) and
data access (Drizzle implementations). What belongs in the interface vs what
should be handled at the service/guard level?

## Decision
Repository interfaces define data access operations only — no business logic.
Ownership verification, authorization, and validation live in services or guards.

## Implications
- `BookRepository.update(id, data)` does NOT accept `userId` — ownership is the
  caller's responsibility
- `decrementStock()` and `incrementStock()` are valid in the repository because
  they are atomic data operations, not business rules
- Cross-table projections (e.g., `BookReadModel`) are separate interfaces to keep
  single-table repositories focused

## Consequences
- Repository interfaces are thinner and focused
- Callers must compose authorization + data access (via guards or service methods)
- Testing: repositories test data logic, guards test authorization, services test orchestration
```

- [ ] **Step 5: Commit**

```bash
git add backend/docs/
git commit -m "docs: add ADRs for config, DI tokens, and repository boundary decisions"
```

---

## Self-Review Checklist

| Spec requirement | Task covering it |
|---|---|
| Enable strict TypeScript | Task 1 |
| Replace string DI tokens with Symbols | Task 2 |
| Remove redundant ownership checks | Task 3 |
| Remove unused `userId` from repository | Task 4 |
| Add barrel files | Task 5 |
| Remove unnecessary global module imports | Task 6 |
| Document architectural decisions | Task 7 |

No placeholders, no TBDs, no incomplete code samples — each task has complete, actionable steps.
