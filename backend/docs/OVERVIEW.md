# Read in Peace — Backend Overview

NestJS v11 REST API (Express platform) serving the Read in Peace book marketplace.
PostgreSQL via Drizzle ORM, Better Auth for authentication, Stripe for payments.

The codebase follows the official [NestJS modular
architecture](https://docs.nestjs.com/modules) layered with the clean
architecture split (domain → application → infrastructure → presentation).
The repo enforces `@Global()` only where it is genuinely justified
(config, database) and uses explicit `imports` everywhere else.

## Directory structure

```
backend/src/
├── main.ts                        # Bootstrap: CORS, ValidationPipe, AllExceptionsFilter, /api/auth
├── app.module.ts                  # Root module — composes core/ + iam/ + every feature
├── app.controller.ts              # GET / health check
├── app.service.ts
│
├── core/                          # Cross-cutting platform (no business logic)
│   ├── config/                    #   CoreConfigService (Zod-validated env)
│   ├── database/                  #   Drizzle client + schema (DATABASE token)
│   ├── http/                      #   AllExceptionsFilter
│   ├── logger/                    #   nestjs-pino wiring
│   └── shared/                    #   CLS request context
│
├── iam/                           # Identity & access (no feature coupling)
│   ├── auth/                      #   AuthGuard / OptionalAuthGuard / CurrentUser
│   └── authorization/             #   Policy / @Policies / PoliciesGuard
│
├── books/                         # Feature: books + comments + likes + ratings
│   ├── domain/                    #   Book, Comment, Like/Rating/Paginated contracts
│   ├── application/               #   BooksService, CommentsService
│   ├── infrastructure/            #   Drizzle repos, in-memory fake
│   ├── authorization/             #   EditBookPolicy, DeleteBookPolicy, DeleteCommentPolicy
│   ├── presentation/              #   controllers, DTOs
│   └── books.module.ts
│
├── transactions/                  # Feature: borrow, cart checkout, purchase confirmation
│   ├── domain/                    #   pricing.ts (pure), Borrow/Purchase contracts
│   ├── application/               #   BorrowsService, CheckoutService, PurchaseConfirmationService
│   ├── infrastructure/            #   Drizzle repos, Stripe provider
│   ├── presentation/              #   TransactionsController
│   └── transactions.module.ts
│
├── social/                        # Feature: reader feed (posts, likes, replies)
│   ├── domain/ | application/ | infrastructure/ | presentation/ | social.module.ts
```

---

## Per-feature layout

Every feature module uses the same four-layer shape. The layers reflect the
clean architecture dependency rule: outer layers depend on inner; inner
layers know nothing about outer.

| Layer            | Responsibility                                                        | Depends on                             |
|------------------|-----------------------------------------------------------------------|----------------------------------------|
| `domain/`        | Entities, repository contracts, pure logic                           | nothing                                |
| `application/`   | Use cases (services) that orchestrate domain contracts                | `domain/`, `iam/` (for guards in controllers) |
| `infrastructure/`| Drizzle implementations of repository contracts                     | `domain/`, `core/database`             |
| `presentation/`  | HTTP boundary (controllers, DTOs)                                     | `application/`, `iam/`                |
| `authorization/` | Per-feature `Policy` implementations (where applicable)              | `domain/` (for repository contracts)   |

The module itself wires the layers:

```ts
// books/books.module.ts (sketch)
@Module({
  imports: [IamModule],
  controllers: [BooksController, CommentsController],
  providers: [
    DrizzleBookRepository,            // implementation
    BooksService,                     // application
    EditBookPolicy,                   // authorization
    alias(BOOK_REPOSITORY, DrizzleBookRepository),  // token → implementation
    alias(CAN_EDIT_BOOK, EditBookPolicy),
    ...
  ],
  exports: [BooksService, BOOK_REPOSITORY, ...],  // exposed to other features
})
```

---

## Core layer

### `core/config/` — Environment configuration
- `CoreConfigService` — Zod-validated env grouped into typed slices
  (`db`, `server`, `frontend`, `auth`, `stripe`).
- `CoreConfigModule` is `@Global()` because every feature needs the typed
  config; explicit `imports` everywhere would be pure noise.
- The auth/stripe slices here are typed views of env vars owned by the
  `iam/` and `transactions/` features. Features consume
  `config.auth.baseUrl` etc. through the same `CoreConfigService`.

### `core/database/` — Drizzle client + schema
- `Drizzle` provider wraps a `pg` Pool and a `drizzle()` client with the
  full schema registered. `DATABASE` token (a `Symbol`) is the
  injection key.
- Schema lives here in `schema.ts` (15 tables: Better Auth tables,
  `books`, `comments`, `comment_likes`, `likes`, `ratings`, `borrows`,
  `purchases`, `posts`, `post_likes`, `post_replies`).
- `@Global()` — every feature's infrastructure layer needs the DB client.

### `core/http/`, `core/logger/`, `core/shared/`
- `AllExceptionsFilter` produces the canonical error envelope
  (`{ statusCode, error, message, requestId, timestamp, path }`).
- `CoreLoggerModule` configures `nestjs-pino` from `CoreConfigService`
  (level, transport).
- `CoreRequestContextModule` wraps `nestjs-cls` to assign a `requestId`
  per request and stash `method`/`path` for log correlation.

---

## IAM layer

The `iam/` module is the **generic mechanism** for authentication and
authorization. It does not know what a "book" or a "comment" is.

### `iam/auth/`
- `AuthGuard` — requires a valid session, throws `UnauthorizedException`
  on failure, attaches the user to `request.user`.
- `OptionalAuthGuard` — same as `AuthGuard` with `{ required: false }`;
  never throws. Pair with `@CurrentUser() user?: AuthUser`.
- `CurrentUser` — param decorator that returns `request.user`.
- `AuthPort` (interface) + `BetterAuthAdapter` (implementation) — the
  guards depend on `AuthPort`, not Better Auth. This is the only
  port/adapter in the codebase.
- `better-auth.ts` exports the `AUTH` symbol, the Better Auth server
  instance. `main.ts` mounts it on `/api/auth` via
  `toNodeHandler(app.get(AUTH))`.

### `iam/authorization/`
- `Policy` interface (`check(ctx: PolicyContext): Promise<boolean>`)
  with `PolicyContext` carrying `user`, `params`, `body`.
- `@Policies(token, ...)` decorator attaches policy tokens to a route.
- `PoliciesGuard` resolves each token from the DI container and runs
  `check()`. Throws on the first failure.

---

## Feature modules

### `books/`
- **Controllers:** `BooksController` (`/api/books`), `CommentsController`
  (`/api/books/:id/comments`).
- **Use cases:** `BooksService` (CRUD, like toggle, rating upsert),
  `CommentsService` (tree assembly, like/unlike, comment+rating in a
  single Drizzle transaction).
- **Authorization:** `EditBookPolicy`, `DeleteBookPolicy`,
  `DeleteCommentPolicy` — each loads the resource via the repository
  contract and verifies the current user owns it. Bound to
  `CAN_EDIT_BOOK`, `CAN_DELETE_BOOK`, `CAN_DELETE_COMMENT` (tokens
  declared in `books/authorization/policy.tokens.ts`).
- **Exports:** `BooksService`, `CommentsService`, `BOOK_REPOSITORY`,
  `COMMENT_REPOSITORY`, `LIKE_REPOSITORY`, `RATING_REPOSITORY`,
  `BOOK_READ_MODEL` — exposed so `transactions/` can compose them.

### `transactions/`
- **Controller:** `TransactionsController`.
- **Use cases:**
  - `BorrowsService` — borrow with `SELECT ... FOR UPDATE` row lock
    (14-day due), return, paginated history.
  - `CheckoutService` — Stripe Checkout session creation for single
    book + cart. The cart path runs `applyDiscounts(items)` from
    `transactions/domain/pricing.ts` and packs the book IDs into
    Stripe metadata.
  - `PurchaseConfirmationService` — verifies the Stripe session
    (`payment_status === 'paid'` and `metadata.userId` matches),
    records purchases atomically (single + batch), decrements stock.
- **Domain:** `pricing.ts` is a pure function with zero framework
  dependencies — the only place business math is computed.
- **Infrastructure:** Drizzle borrow/purchase repos and the shared
  `stripeProvider` (one Stripe client per app, configured from
  `CoreConfigService`).
- **Imports:** `BooksModule` (for `BookRepository`, `BookReadModel`).

### `social/`
- **Controller:** `SocialController` (`/api/feed`).
- **Use case:** `SocialService` — feed, post CRUD, like toggle, replies.

---

## Architecture principles

### 1. Per-feature clean architecture
Each feature is a self-contained slice with `domain/`, `application/`,
`infrastructure/`, `presentation/`, and (where needed) `authorization/`.
The domain layer has zero Drizzle, Nest, or IO imports. Application
services depend on domain interfaces. Infrastructure implementations
import Drizzle. Controllers depend on application services.

### 2. `@Global()` is rare and justified
The Nest docs explicitly recommend against making everything global.
Only `CoreConfigModule` and `CoreDatabaseModule` are `@Global()` —
two cases where every consumer would otherwise re-import the same
module. Everything else uses explicit `imports`.

### 3. Repositories are interfaces, not concrete classes
Each feature declares its repository contracts in `domain/`
(e.g. `BookRepository`, `CommentRepository`). The Drizzle implementation
lives in `infrastructure/` and is bound to the interface token in the
module via `alias(TOKEN, Implementation)`. The application layer is
testable by passing any object that satisfies the interface
(`InMemoryLikeRepository` is an example test fake).

### 4. Policies are co-located with their resources
`EditBookPolicy` lives in `books/authorization/`, not in
`iam/authorization/`. The `iam` module provides the *mechanism*
(`Policy` interface, `PoliciesGuard`); each feature provides the
*rules* for its own resources. Adding a new ownership-gated action
means: new policy class + bind it to a `CAN_*` token in the feature
module.

### 5. Pure logic stays in `domain/`
`transactions/domain/pricing.ts` has no I/O, no Nest, no DB. It is
unit-tested in isolation and consumed by `CheckoutService`.

### 6. Request tracing
Every request gets a `requestId` via `nestjs-cls` (set up in
`core/shared/request-context.module.ts`). `AllExceptionsFilter`
includes it in every error response and log line for correlation.

---

## DI tokens

| Token                 | Kind         | Provided by                   | Consumed by                          |
|-----------------------|--------------|-------------------------------|--------------------------------------|
| `DATABASE`            | Symbol       | `core/database`               | every repo's infrastructure layer    |
| `BOOK_REPOSITORY`     | Symbol       | `books` module                | `BooksService`, `BorrowsService`, policies, `CheckoutService` |
| `BOOK_READ_MODEL`     | Symbol       | `books` module                | `BooksService`, `BorrowsService`, `PurchaseConfirmationService` |
| `COMMENT_REPOSITORY`  | Symbol       | `books` module                | `CommentsService`, `DeleteCommentPolicy` |
| `LIKE_REPOSITORY`     | Symbol       | `books` module                | `BooksService`                       |
| `RATING_REPOSITORY`   | Symbol       | `books` module                | `BooksService`, `CommentsService`    |
| `BORROW_REPOSITORY`   | Symbol       | `transactions` module         | `BorrowsService`                     |
| `PURCHASE_REPOSITORY` | Symbol       | `transactions` module         | `PurchaseConfirmationService`        |
| `POST_REPOSITORY`     | Symbol       | `social` module               | `SocialService`                      |
| `AUTH`                | Symbol       | `iam` module                  | `main.ts` (mounted as `/api/auth`)   |
| `AUTH_PORT`           | Symbol       | `iam` module                  | guards (`AuthGuard`, `OptionalAuthGuard`) |
| `CAN_EDIT_BOOK`       | string       | `books/authorization`         | `@Policies()` on PUT `/api/books/:id` |
| `CAN_DELETE_BOOK`     | string       | `books/authorization`         | `@Policies()` on DELETE `/api/books/:id` |
| `CAN_DELETE_COMMENT`  | string       | `books/authorization`         | `@Policies()` on DELETE comment      |

---

## Database

- **Engine:** PostgreSQL 17 (via `docker compose up -d`)
- **ORM:** Drizzle ORM with `node-postgres` driver
- **Migrations:** `drizzle-kit` (config at `drizzle.config.ts`),
  applied via `npm run db:migrate`
- **Setup:** `docker compose up -d && npm run db:migrate && npm run db:seed`
- **15 tables** including Better Auth tables (`user`, `session`,
  `account`, `verification`).

Key design points:
- `books.slug` is unique; controllers accept slug or id and the
  repository's `findByIdOrSlug` resolves either.
- `ratings`, `likes`, `comment_likes`, `post_likes` use composite
  primary keys on `(bookId, userId)` / `(commentId, userId)` etc.
- `comments.parentId` is self-referencing for replies.
- `borrows.returnedAt` is nullable — `IS NULL` filters active borrows.

---

## Commands

| Command               | Purpose                                |
|-----------------------|----------------------------------------|
| `npm run build`       | `nest build`                           |
| `npm run start:dev`   | Watch mode                             |
| `npm run lint`        | ESLint v9 flat config + Prettier (`--fix` baked in) |
| `npm run format`      | Prettier write                         |
| `npm run test`        | Jest unit tests                        |
| `npm run test:watch`  | Jest watch                             |
| `npm run test:cov`    | Jest with coverage                     |
| `npm run test:e2e`    | E2E tests                              |
| `npm run db:migrate`  | Apply Drizzle migrations              |
| `npm run db:seed`     | Seed demo data                         |
