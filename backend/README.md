# Read in Pace — Backend

NestJS v11 REST API with Better Auth, Drizzle ORM, and PostgreSQL.

## Tech stack

- **Framework:** NestJS v11 (Express platform)
- **Auth:** Better Auth (email/password, scrypt hashing)
- **Database:** PostgreSQL + Drizzle ORM (schema + migrations via `drizzle-kit`)
- **Payments:** Stripe Checkout Sessions
- **Testing:** Jest

## Commands

```bash
npm run build          # nest build
npm run lint           # ESLint + Prettier
npm run format         # Prettier (singleQuote, trailingComma)
npm run test           # Jest unit tests
npm run test:watch     # Jest watch mode
npm run test:cov       # Jest with coverage
npm run test:e2e       # E2E tests
npm run db:push        # Push Drizzle schema to DB
npm run db:seed        # Seed database (2 users, 15 books, comments, ratings)
```

## Project structure

```
backend/src/
├── main.ts                 # Entry point, mounts Better Auth at /api/auth
├── app.module.ts           # Root module
├── auth/
│   ├── better-auth.ts      # Better Auth config (scrypt, Drizzle adapter)
│   ├── auth.guard.ts       # @UseGuards(AuthGuard) for protected routes
│   └── current-user.decorator.ts  # @CurrentUser() parameter decorator
├── books/
│   ├── books.controller.ts
│   ├── books.service.ts
│   ├── likes.controller.ts + likes.service.ts
│   ├── ratings.controller.ts + ratings.service.ts
│   └── comments.controller.ts + comments.service.ts
├── transactions/
│   ├── transactions.controller.ts
│   └── transactions.service.ts  # borrow, return, Stripe checkout, confirm purchase
├── db/
│   ├── schema.ts            # All tables (users, books, likes, ratings, comments, borrows, purchases)
│   └── seed.ts              # Seed data with scrypt password hashing
└── drizzle/                 # Generated migration files
```

## API endpoints

### Books
- `GET /api/books?page=&limit=&category=` — Paginated book list
- `GET /api/books/trending` — Trending books
- `GET /api/books/:id` — Book detail with meta (likes, comments, rating, stock)
- `POST /api/books` — Create book (auth required)
- `PUT /api/books/:id` — Update book (auth required)
- `DELETE /api/books/:id` — Delete book (auth required)

### Social
- `GET/POST /api/books/:id/like` — Get/ Toggle like status
- `GET/POST /api/books/:id/rate` — Get/Submit rating (1-5)
- `GET /api/books/:id/comments` — List comments
- `POST /api/books/:id/comments` — Add comment (auth required)

### Transactions
- `POST /api/books/:id/borrow` — Borrow a book (decrements stock)
- `POST /api/books/:id/return` — Return a book (increments stock)
- `POST /api/books/:id/create-checkout-session` — Stripe Checkout Session
- `POST /api/confirm-purchase?session_id=` — Confirm purchase after Stripe redirect
- `GET /api/user/borrows` — Current user's borrowed books
- `GET /api/user/purchases` — Current user's purchased books

### Auth
- `GET/POST /api/auth/*` — Better Auth API (sign-in, sign-up, session, etc.)

## Environment

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/readinpace
BETTER_AUTH_SECRET=<your-secret>
STRIPE_SECRET_KEY=<your-stripe-secret>
```
