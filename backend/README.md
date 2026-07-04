# Read in Peace — Backend

NestJS v11 REST API with Better Auth, Drizzle ORM, and PostgreSQL, organized as
per-feature modules with a clean-architecture layer split (domain /
application / infrastructure / presentation).

## Tech stack

- **Framework:** NestJS v11 (Express platform)
- **Auth:** Better Auth (email/password, scrypt hashing), mounted as Express
  middleware at `/api/auth`
- **Database:** PostgreSQL + Drizzle ORM (`drizzle-kit` for migrations)
- **Payments:** Stripe Checkout Sessions (single book + cart)
- **Discounts:** 3-stage pipeline (quantity tier, category bonus, every $100) —
  pure function in `transactions/domain/pricing.ts`
- **Authorization:** Policy interface + `@Policies()` decorator +
  `PoliciesGuard` (co-located with each feature's resources)
- **Testing:** Jest with `src/` as the rootDir (`*.spec.ts`)

## Commands

```bash
# Run from backend/
npm run build          # nest build
npm run start:dev      # Watch mode (port 4000)
npm run lint           # ESLint + Prettier (--fix is baked in)
npm run format         # Prettier write on src/**/*.ts and test/**/*.ts

# Tests
npm run test           # Jest unit tests
npm run test:watch     # Jest watch
npm run test:cov       # Jest with coverage
npm run test:e2e       # E2E tests (test/, jest-e2e.json)

# Database
npm run db:migrate     # Apply Drizzle migrations
npm run db:seed        # Seed demo data (2 users, 15 books, comments, ratings)
```

### Running a single test
Jest's `rootDir` is `src/`, so paths are relative to it. From `backend/`:

```bash
npx jest app.controller.spec.ts                    # one file
npx jest --testPathPattern=auth/policies            # by directory
npx jest --testPathPattern=checkout                 # by name fragment
npx jest -t "should apply 10% tier"                # by test name
```

## Project structure

```
backend/src/
├── main.ts                       # Bootstrap: CORS, ValidationPipe, AllExceptionsFilter, /api/auth
├── app.module.ts                 # Root module — composes core/ + iam/ + every feature
├── app.controller.ts             # GET / health check
│
├── core/                         # Cross-cutting platform (no business logic)
│   ├── config/                   #   CoreConfigService (Zod-validated env)
│   ├── database/                 #   Drizzle client + schema + DRIZZLE token
│   ├── http/                     #   AllExceptionsFilter
│   ├── logger/                   #   nestjs-pino wiring
│   └── shared/                   #   CLS request context (requestId/method/path)
│
├── iam/                          # Identity & access (no feature coupling)
│   ├── auth/                     #   AuthGuard, OptionalAuthGuard, CurrentUser, Better Auth wiring
│   └── authorization/            #   Policy interface, @Policies(), PoliciesGuard
│
├── books/                        # Feature: books, comments, likes, ratings
│   ├── domain/                   #   Book, Comment, Like/Rating/Paginated contracts
│   ├── application/              #   BooksService, CommentsService (use cases)
│   ├── infrastructure/           #   Drizzle repos, in-memory fake
│   ├── authorization/            #   EditBookPolicy, DeleteBookPolicy, DeleteCommentPolicy
│   ├── presentation/             #   Controllers + DTOs
│   └── books.module.ts
│
├── transactions/                 # Feature: borrow, cart checkout, purchase confirmation
│   ├── domain/                   #   pricing.ts (pure), Borrow/Purchase contracts
│   ├── application/              #   BorrowsService, CheckoutService, PurchaseConfirmationService
│   ├── infrastructure/           #   Drizzle repos, Stripe provider
│   ├── presentation/             #   TransactionsController
│   └── transactions.module.ts
│
└── social/                       # Feature: reader feed (posts, likes, replies)
    ├── domain/ | application/ | infrastructure/ | presentation/ | social.module.ts
```

Each feature follows the same four-layer pattern:
- **`domain/`** — pure TypeScript: entities (e.g. `Book`), repository contracts
  (interfaces), and pure logic (`pricing.ts`). No Drizzle, no Nest, no IO.
- **`application/`** — use cases: services that orchestrate domain contracts.
  Depends on `domain/` and (transitively) on `iam/`.
- **`infrastructure/`** — Drizzle implementations of the domain repository
  contracts. The only place that imports the Drizzle schema.
- **`presentation/`** — HTTP boundary: controllers and DTOs (class-validator).
- **`authorization/`** *(books only)* — per-feature `Policy` implementations
  bound to `CAN_*` tokens consumed by `@Policies()`.

## API endpoints

### Books
- `GET /api/books?page=&limit=&category=` — paginated book list
- `GET /api/books/trending` — top 3 trending
- `GET /api/books/new-arrivals` — latest 4
- `GET /api/books/:id` — book detail (with likes, comments, rating, stock)
- `POST /api/books` — create (auth required)
- `PUT /api/books/:id` — update (auth + ownership policy)
- `DELETE /api/books/:id` — delete (auth + ownership policy)
- `GET /api/books/:id/like` — current user's like status (optional auth)
- `POST /api/books/:id/like` — toggle like (auth)
- `GET /api/books/:id/rate` — current user's rating (optional auth)
- `POST /api/books/:id/rate` — submit/update rating (auth)

### Comments
- `GET /api/books/:id/comments` — comment tree
- `POST /api/books/:id/comments` — create comment (or reply; auth required)
- `DELETE /api/books/:id/comments/:commentId` — delete (auth + ownership)
- `POST/DELETE /api/books/:id/comments/:commentId/like` — like/unlike (auth)

### Transactions
- `POST /api/books/:id/borrow` — borrow (locks book row, 14-day due)
- `POST /api/books/:id/return` — return
- `POST /api/books/:id/create-checkout-session` — Stripe single-book checkout
- `POST /api/cart/checkout` — Stripe cart checkout (with discount pipeline)
- `POST /api/confirm-purchase?session_id=...` — verify + record purchase
- `GET /api/user/borrows` — current user's borrows (paginated)
- `GET /api/user/purchases` — current user's purchases

### Social feed
- `GET /api/feed` — recent posts (auth required)
- `POST /api/feed` — create post (auth)
- `POST /api/feed/:id/like` — toggle post like (auth)
- `GET /api/feed/:id/like` — check if user liked (auth)
- `GET /api/feed/:id/replies` — list replies
- `POST /api/feed/:id/reply` — add reply (auth)

### Auth
- `GET/POST /api/auth/*` — Better Auth API (sign-in, sign-up, session, etc.)

## Module dependency graph

```
                  app.module
                       │
    ┌──────────┬───────┴───────┬──────────────┐
    ▼          ▼               ▼              ▼
  core/*     iam/*       feature modules   feature modules
  (@Global:  (no @Global; (no @Global;     (no @Global;
   config,   iam.module    explicit         explicit
   database)  exports       imports of       imports of
              AuthGuard,    iam for          iam for
              CurrentUser,  AuthGuard,       AuthGuard
              @Policies,    etc.)
              PoliciesGuard
```
- **Feature modules** declare their own dependencies (e.g.
  `TransactionsModule` `imports: [BooksModule, IamModule]` to get
  `BookRepository`, `BookReadModel`, and the auth guards).

- **`core/config`** and **`core/database`** are `@Global()` — every feature
  needs them and forcing `imports` everywhere would be noise.
- **`iam`** is **not** `@Global`. Features that need guards/decorators
  `imports: [IamModule]`.
- **Feature modules** declare their own dependencies (e.g.
  `TransactionsModule` `imports: [BooksModule, IamModule]` to get
  `BookRepository`, `BookReadModel`, and the auth guards).

## Environment

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/readinpace
BETTER_AUTH_SECRET=<your-secret>
STRIPE_SECRET_KEY=<your-stripe-secret>
```

See `src/core/config/env.schema.ts` for the full set of supported variables
(`NODE_ENV`, `PORT`, `CORS_ORIGINS`, `FRONTEND_URL`, `LOG_LEVEL`, etc.).
