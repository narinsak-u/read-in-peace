# Backend Workflows

## Table of Contents

1. [Browsing & Discovery](#1-browsing--discovery)
2. [Book Detail & Engagement](#2-book-detail--engagement)
3. [Book Comments](#3-book-comments)
4. [Borrowing & Returning](#4-borrowing--returning)
5. [Purchase (Stripe Checkout)](#5-purchase-stripe-checkout)
6. [Cart Checkout with Discounts](#6-cart-checkout-with-discounts)
7. [Purchase Confirmation](#7-purchase-confirmation)
8. [Social Feed](#8-social-feed)
9. [Authentication](#9-authentication)
10. [Authorization (Policies)](#10-authorization-policies)
11. [Error Handling](#11-error-handling)

---

## 1. Browsing & Discovery

### 1.1 Paginated Book List

**Endpoint**: `GET /api/books?page=1&limit=12&category=Fiction`

**Flow**:
1. `BooksController.findAll(page?, limit?, category?)` receives optional query params
2. Delegates to `BooksService.findAll(page, limit, category)`
3. `BookReadModel.findFullPaginated(page, limit, category?)` queries Drizzle with:
   - Computed subqueries for `likeCount`, `commentCount`, `avgRating`, `ratingsCount`
   - Optional `WHERE category = ?` filter
   - `LIMIT`/`OFFSET` pagination
   - `ORDER BY createdAt DESC`
4. Returns `{ data: BookProjection[], meta: { page, limit, total, totalPages } }`

**Error states**: None (returns empty data array if no books match).

### 1.2 Trending Books

**Endpoint**: `GET /api/books/trending`

**Flow**:
1. `BooksController.getTrending()` → `BooksService.getTrending()`
2. `BookReadModel.getTrending(3)` queries all books with computed aggregates
3. Orders by `avgRating DESC`, limits to 3
4. Returns `BookProjection[]`

**Business rule**: Trending is computed dynamically (avg rating), not based on the `trending` boolean column.

### 1.3 New Arrivals

**Endpoint**: `GET /api/books/new-arrivals`

**Flow**:
1. `BooksController.getNewArrivals()` → `BooksService.findNewArrivals()`
2. `BookReadModel.findNewArrivals(4)` queries with computed aggregates
3. Orders by `createdAt DESC`, limits to 4
4. Returns `BookProjection[]`

---

## 2. Book Detail & Engagement

### 2.1 Single Book

**Endpoint**: `GET /api/books/:id`

**Flow**:
1. `BooksController.findOne(id)` → `BooksService.findOne(idOrSlug)` where `idOrSlug = id`
2. `BookReadModel.findFullByIdOrSlug(idOrSlug)` queries the book with all computed aggregates
3. Returns `BookProjection` or throws `NotFoundException`

### 2.2 Like a Book

**Toggle endpoint**: `POST /api/books/:id/like` (auth required)

**Flow**:
1. `AuthGuard` extracts session via `AuthPort.getSession(headers)`, sets `request.user`
2. `BooksController.toggleLike(id, user)` → `BooksService.toggleLike(bookId, userId)`
3. `LikeRepository.toggle(bookId, userId)` checks existence then inserts or deletes
4. Returns `{ liked: boolean, likeCount: number }`

**Check endpoint**: `GET /api/books/:id/like` (optional auth)

**Flow**:
1. `OptionalAuthGuard` may set `request.user` if session exists
2. `BooksController.isLiked(id, user?)` → if user: `BooksService.isLiked(bookId, userId)`
3. Returns `{ liked: boolean }` or `{ liked: false }` if no user

### 2.3 Rate a Book

**Endpoint**: `POST /api/books/:id/rate` (auth required)

Body: `{ rating: 1 | 2 | 3 | 4 | 5 }`

**Flow**:
1. `AuthGuard` validates session
2. `BooksController.rateBook(id, dto, user)` → `BooksService.rateBook(bookId, userId, rating)`
3. `RatingRepository.upsert(bookId, userId, rating)` uses `ON CONFLICT DO UPDATE` on composite PK
4. Returns `void`

**Check endpoint**: `GET /api/books/:id/rate` (optional auth) — returns user's rating or null.

---

## 3. Book Comments

### 3.1 List Comments

**Endpoint**: `GET /api/books/:id/comments` (optional auth)

**Flow**:
1. `OptionalAuthGuard` may set user for like-status enrichment
2. `CommentsController.findAll(id, user?)` → `CommentsService.findByBook(bookId, currentUserId?)`
3. `CommentRepository.findByBook(bookId)` joins with `user` table for `{ id, userId, bookId, text, rating, parentId, createdAt, updatedAt, user: { id, name, image } }`
4. `CommentRepository.countLikesFor(commentIds)` returns a `Map<commentId, count>`
5. If `currentUserId` is provided, `CommentRepository.likedSetFor(commentIds, userId)` returns a `Map<commentId, boolean>`
6. Builds a reply tree: top-level comments have replies nested under them (based on `parentId`)
7. Returns `CommentWithUser[]` with `likeCount`, `likedByMe`, and nested `replies`

### 3.2 Create Comment

**Endpoint**: `POST /api/books/:id/comments` (auth required)

Body: `{ text: string (1-2000), rating?: 1-5, parentId?: string }`

**Flow**:
1. `AuthGuard` validates session
2. `CommentsController.create(id, dto, user)` → `CommentsService.create(bookId, userId, dto)`
3. **Validations** (all throw `BadRequestException`):
   - If `parentId` is provided: `rating` must be null (replies can't have ratings)
   - If `parentId` is provided: parent must exist and belong to the same book
4. Runs in a database transaction:
   - `CommentRepository.create(data, tx)` inserts the comment
   - If `dto.rating` is not null: `RatingRepository.recordFromComment(tx, { bookId, userId, rating })` — upserts rating via the comment flow
5. Returns the created comment with user info

### 3.3 Delete Comment

**Endpoint**: `DELETE /api/books/:id/comments/:commentId` (auth required)

**Flow**:
1. `AuthGuard` + `PoliciesGuard` both applied
2. `PoliciesGuard` resolves `CAN_DELETE_COMMENT` policy token
3. `DeleteCommentPolicy.check(ctx)` calls `CommentRepository.findRaw(commentId)` and verifies `userId === currentUserId` (throws `NotFoundException` if missing, `ForbiddenException` if not owner)
4. `CommentsController.remove(commentId, user)` → `CommentsService.remove(commentId, userId)`
5. Duplicate ownership check in service (throws `ForbiddenException`)
6. `CommentRepository.delete(commentId)` removes the row
7. Returns `void`

### 3.4 Like / Unlike Comment

**Endpoints**: `POST /api/books/:id/comments/:commentId/like` | `DELETE .../like` (auth required)

**Flow**:
1. `AuthGuard` validates session
2. `CommentsController.like(commentId, user)` → `CommentsService.like(commentId, userId)`
3. `CommentRepository.like(commentId, userId)` inserts into `comment_likes`
4. Returns `{ liked: true, likeCount: number }`
5. Unlike follows the same pattern with `unlike()`

---

## 4. Borrowing & Returning

### 4.1 Borrow a Book

**Endpoint**: `POST /api/books/:id/borrow` (auth required)

**Flow**:
1. `AuthGuard` validates session
2. `TransactionsController.borrow(id, user)` → `BorrowsService.borrow(bookId, userId)`
3. Runs in a database transaction:
   - `BookRepository.acquireLockForBorrow(bookId, tx)` — `SELECT ... FOR UPDATE` on the book row (pessimistic lock to prevent race conditions)
   - Throws `NotFoundException` if book not found
   - Throws `BadRequestException` if `!book.isAvailable` or `inStock <= 0`
   - Checks no active borrow exists for this user+book via `BorrowRepository.findActiveBorrow(bookId, userId, tx)`
   - `BookRepository.decrementStock(bookId, tx)` decreases `inStock` by 1, sets `isAvailable = false` when `inStock` reaches 0
   - `BorrowRepository.recordBorrow(bookId, userId, dueAt, totalPages, tx)` creates borrow row with `dueAt = now + 14 days`
4. Returns the borrow row

### 4.2 Return a Book

**Endpoint**: `POST /api/books/:id/return` (auth required)

**Flow**:
1. `AuthGuard` validates session
2. `TransactionsController.returnBook(id, user)` → `BorrowsService.returnBook(bookId, userId)`
3. Runs in a database transaction:
   - `BorrowRepository.findActiveBorrow(bookId, userId, tx)` — finds borrow where `returnedAt IS NULL`
   - Throws `BadRequestException` if no active borrow found
   - `BookRepository.incrementStock(bookId, tx)` increases `inStock` by 1 and sets `isAvailable = true`
   - `BorrowRepository.markReturned(borrowId, tx)` sets `returnedAt = now()`
4. Returns the updated borrow row

### 4.3 List User's Borrows

**Endpoint**: `GET /api/user/borrows?page=1&limit=10` (auth required)

**Flow**:
1. `AuthGuard` validates session
2. `TransactionsController.myBorrows(user, page?, limit?)` → `BorrowsService.listForUser(userId, page, limit)`
3. `BorrowRepository.listActiveByUser(userId, page, limit)` returns borrow IDs + total count
4. `BorrowRepository.findByIds(ids)` fetches full borrow rows
5. `BookReadModel.attachToBorrows(borrows)` fetches matching book projections and maps them
6. Returns `{ data: { borrow: BorrowRow, book: BookProjection }[], meta: PaginationMeta }`

---

## 5. Purchase (Stripe Checkout)

### 5.1 Single Book Checkout

**Endpoint**: `POST /api/books/:id/create-checkout-session` (auth required)

**Flow**:
1. `AuthGuard` validates session
2. `TransactionsController.createCheckoutSession(id, user)` → `CheckoutService.forBook(bookId, userId)`
3. `BookRepository.findPricingForPurchase([bookId])` fetches pricing info
4. Throws `NotFoundException` if book missing
5. Throws `BadRequestException` if `inStock <= 1` (last copy is borrow-only)
6. Calls `stripe.checkout.sessions.create()`:
   - `mode: 'payment'`
   - `line_items`: single item with `unit_amount` in cents
   - `metadata: { bookId, userId }`
   - `success_url`: `${frontendUrl}/dashboard?tab=purchased`
   - `cancel_url`: `${frontendUrl}/book/${bookId}`
7. Returns `{ url: session.url }`

### 5.2 Cart Checkout with Discounts

**Endpoint**: `POST /api/cart/checkout` (auth required)

Body: `{ bookIds: string[] }`

**Flow**:
1. `AuthGuard` validates session
2. `TransactionsController.cartCheckout({ bookIds }, user)` → `CheckoutService.forCart(bookIds, userId)`
3. Throws `BadRequestException` if `bookIds` is empty
4. `BookRepository.findPricingForPurchase(bookIds)` fetches all books' pricing
5. Throws `NotFoundException` if any book is missing
6. Throws `BadRequestException` if any book has `inStock <= 1`
7. Runs the **discount pipeline** (`applyDiscounts` in `transactions/domain/pricing.ts`):
   - **Quantity Tier**: 2 books = 10%, 3 books = 20%, 4+ books = 30% off subtotal
   - **Category Bonus**: If 2+ books in same category, 10% off that category's subtotal
   - **Every $100 Discount**: $1 off for every full $100 in running total
8. Calls `stripe.checkout.sessions.create()`:
   - `mode: 'payment'`
   - Single `line_item` with computed `unit_amount` = total after all discounts
   - `metadata`: `{ userId, bc: bookCount, b0: bookId0, b1: bookId1, ... }`
   - Same `success_url`/`cancel_url` pattern
9. Returns `{ url: session.url }`

---

## 6. Purchase Confirmation

### 6.1 Confirm Purchase

**Endpoint**: `POST /api/confirm-purchase` (auth required)

Body: `{ session_id: string }`

**Flow**:
1. `AuthGuard` validates session
2. `TransactionsController.confirmPurchase({ session_id }, user)` → `PurchaseConfirmationService.confirm(sessionId, userId)`
3. Retrieves Stripe session via `stripe.checkout.sessions.retrieve(sessionId)`
4. Throws `BadRequestException` if `payment_status !== 'paid'`
5. Throws `BadRequestException` if `metadata.userId !== userId`
6. Parses book IDs from metadata:
   - Single book: `metadata.bookId`
   - Multi-book: `bc` = count, `b0`, `b1`, ... = individual IDs
7. For each book ID, runs in a transaction:
   - `PurchaseRepository.findExisting(bookId, userId, tx)` — skips if already purchased (idempotent)
   - `PurchaseRepository.record(bookId, userId, tx)` — inserts purchase row
   - `BookRepository.decrementStock(bookId, tx)` — reduces stock
8. Returns the purchase(s)

### 6.2 List User's Purchases

**Endpoint**: `GET /api/user/purchases` (auth required)

**Flow**:
1. `AuthGuard` validates session
2. `TransactionsController.myPurchases(user)` → `PurchaseConfirmationService.listForUser(userId)`
3. `PurchaseRepository.listForUser(userId)` returns all purchase rows with book IDs
4. `BookReadModel.attachToPurchases(purchases)` fetches matching book projections
5. Returns `{ purchase: PurchaseRow, book: BookProjection }[]`

---

## 7. Social Feed

### 7.1 Get Feed

**Endpoint**: `GET /api/feed` (auth required)

**Flow**:
1. `AuthGuard` validates session
2. `SocialController.getFeed(user)` → `SocialService.getFeed(userId)`
3. `PostRepository.feed(20, userId)` queries `posts` table:
   - `JOIN user` for post author info
   - Inline subquery for `likeCount` (COUNT from `post_likes`)
   - Inline subquery for `replyCount` (COUNT from `post_replies`)
   - Outer `SELECT` checks `post_likes` for current user (returns `liked: boolean`)
   - `ORDER BY createdAt DESC`, `LIMIT 20`
4. Returns `PostWithUser[]` with `user`, `likeCount`, `replyCount`, `liked`

### 7.2 Create Post

**Endpoint**: `POST /api/feed` (auth required)

Body: `{ text: string, rating?: number }`

**Flow**:
1. `AuthGuard` validates session
2. `SocialController.createPost(text, user, rating?)` → `SocialService.createPost(userId, text, rating?)`
3. `PostRepository.create(userId, text, rating?)` inserts into `posts` table
4. Returns the created post

### 7.3 Like Post

**Endpoint**: `POST /api/feed/:id/like` (auth required)

**Flow**:
1. `AuthGuard` validates session
2. `SocialController.toggleLike(id, user)` → `SocialService.toggleLike(postId, userId)`
3. `PostRepository.toggleLike(postId, userId)` checks existence then inserts or deletes from `post_likes`
4. Returns `{ liked: boolean, likeCount: number }`

### 7.4 Reply to Post

**Endpoint**: `POST /api/feed/:id/reply` (auth required)

Body: `{ text: string }`

**Flow**:
1. `AuthGuard` validates session
2. `SocialController.createReply(id, text, user)` → `SocialService.createReply(postId, userId, text)`
3. `PostRepository.findById(postId)` — throws `NotFoundException` if missing
4. `PostRepository.createReply(postId, userId, text)` inserts into `post_replies`
5. Returns the created reply

### 7.5 Get Replies

**Endpoint**: `GET /api/feed/:id/replies`

**Flow**:
1. No auth required (public)
2. `SocialController.getReplies(id)` → `SocialService.getReplies(postId)`
3. `PostRepository.getReplies(postId)` queries `post_replies` with `JOIN user`
4. Returns `ReplyWithUser[]`

---

## 8. Authentication

### 8.1 Better Auth Setup

- Instance created at bootstrap in `src/iam/auth/better-auth.ts`
- Drizzle adapter connected to the same PostgreSQL database
- Email/password authentication enabled
- Mounted on `/api/auth/*` in `main.ts` via `auth.handler → toNodeHandler`
- Config: `baseURL` from `BETTER_AUTH_URL`, `trustedOrigins` from `CORS_ORIGINS`

### 8.2 Auth Flow

1. **Sign up**: `POST /api/auth/sign-up` with `{ email, password, name }`
2. **Sign in**: `POST /api/auth/sign-in` with `{ email, password }` → returns session cookie
3. **Session check**: `GET /api/auth/session` returns `{ user, session }` or `null`
4. **Sign out**: `POST /api/auth/sign-out` clears session

### 8.3 Auth Guard

- `AuthGuard`: Required auth — if `AuthPort.getSession(headers)` returns null, throws `UnauthorizedException`
- `OptionalAuthGuard`: Optional auth — if session exists, sets `request.user`; if not, continues without user
- `@CurrentUser()` decorator extracts `request.user` (type `AuthUser | undefined`)

### 8.4 AuthPort (Testability Abstraction)

- Interface defined in `src/iam/auth/auth.port.ts`
- `getSession(headers): Promise<AuthSession | null>`
- Production: `BetterAuthAdapter` wraps Better Auth's `auth.api.getSession`
- Used by guards so they're unit-testable without a running auth server

---

## 9. Authorization (Policies)

### 9.1 Policy Framework

Located in `src/iam/authorization/`. Uses NestJS `moduleRef` to dynamically resolve policy instances.

**Components**:
- `Policy` interface with `action: string` and `check(ctx: PolicyContext): Promise<boolean>`
- `@Policies(...tokens)` decorator attaches string tokens to route handler metadata
- `PoliciesGuard` reads metadata, resolves policy tokens from DI, runs checks

**Guard chain**: `@UseGuards(AuthGuard, PoliciesGuard)` — auth first, then policy.

**Policy context**:
```typescript
{ user: AuthUser, params: Record<string, string>, body: unknown }
```

### 9.2 Available Policies

| Token | Action | Logic | File |
|-------|--------|-------|------|
| `CAN_EDIT_BOOK` | `edit_book` | `BookRepository.findOwner(bookId)` → verify `owner === user.id` | `books/authorization/edit-book.policy.ts` |
| `CAN_DELETE_BOOK` | `delete_book` | Same owner check, different error message | `books/authorization/delete-book.policy.ts` |
| `CAN_DELETE_COMMENT` | `delete_comment` | `CommentRepository.findRaw(commentId)` → verify `userId === user.id` | `books/authorization/delete-comment.policy.ts` |

### 9.3 Error Handling in Policies

- `NotFoundException` — resource or param `id` missing
- `ForbiddenException` — user is not the resource owner

---

## 10. Error Handling

### 10.1 Global Exception Filter

`AllExceptionsFilter` (`src/core/http/all-exceptions.filter.ts`) catches every unhandled exception.

**Flow**:
1. Reads `requestId`, `method`, `path` from CLS request context
2. If `HttpException`: extracts status and response, maps to `{ statusCode, error, message, requestId, timestamp, path }`
3. If unknown: returns 500 with `{ statusCode: 500, error: "Internal Server Error", message, requestId, timestamp, path }`
4. Logs via `PinoLogger` with structured metadata

### 10.2 Exception Map

| HTTP Status | Error Text | When |
|-------------|-----------|------|
| 400 | Bad Request | Validation errors, borrow/purchase business rules |
| 401 | Unauthorized | Missing or invalid session |
| 403 | Forbidden | Not resource owner |
| 404 | Not Found | Missing book, comment, post, user |
| 500 | Internal Server Error | Unhandled exceptions |

### 10.3 Error Response Shape

```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Book not found",
  "requestId": "uuid-from-cls",
  "timestamp": "2026-06-23T12:00:00.000Z",
  "path": "/api/books/missing-id"
}
```

---

## 11. Database Architecture

### 11.1 Tables

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `user` | Auth users | FK from most tables |
| `session` | Better Auth sessions | FK → user |
| `account` | Credentials + OAuth | FK → user |
| `verification` | Email verification | — |
| `books` | Book catalog | FK → user (created_by) |
| `likes` | Book likes | Composite FK → books + user |
| `comments` | Book comments + replies | FK → books + user, self-ref FK (parent_id) |
| `comment_likes` | Comment likes | Composite FK → comments + user |
| `ratings` | Book ratings | Composite FK → books + user |
| `borrows` | Book borrowing | FK → books + user |
| `purchases` | Book purchases | FK → books + user |
| `reading_goals` | User reading goals | FK → user |
| `posts` | Social feed posts | FK → user |
| `post_likes` | Social post likes | Composite FK → posts + user |
| `post_replies` | Social post replies | FK → posts + user |

### 11.2 Repository Pattern

Every data access layer follows **Interface → Drizzle Implementation → In-Memory Fake**:

| Repository | Interface Token | Drizzle Impl | Test Fake |
|-----------|----------------|-------------|-----------|
| Book | `BOOK_REPOSITORY` | `DrizzleBookRepository` | — |
| Book Read Model | `BOOK_READ_MODEL` | `DrizzleBookReadModel` | — |
| Comment | `COMMENT_REPOSITORY` | `DrizzleCommentRepository` | — |
| Like | `LIKE_REPOSITORY` | `DrizzleLikeRepository` | `InMemoryLikeRepository` |
| Rating | `RATING_REPOSITORY` | `DrizzleRatingRepository` | — |
| Borrow | `BORROW_REPOSITORY` | `DrizzleBorrowRepository` | — |
| Purchase | `PURCHASE_REPOSITORY` | `DrizzlePurchaseRepository` | — |
| Post (Social) | `POST_REPOSITORY` | `DrizzlePostRepository` | — |

Repositories that accept an optional `tx` parameter participate in database transactions. Services coordinate multi-step workflows using Drizzle transactions (e.g., borrow + stock decrement, comment + rating creation).

---

## 12. Config & Environment

### 12.1 Env Variables

| Variable | Default | Required | Used By |
|----------|---------|----------|---------|
| `DATABASE_URL` | — | Yes | Drizzle PostgreSQL connection |
| `STRIPE_SECRET_KEY` | — | Yes | Stripe SDK |
| `PORT` | `4000` | No | Server listen port |
| `NODE_ENV` | `development` | No | Dev/prod mode switching |
| `LOG_LEVEL` | `info` | No | pino log level |
| `CORS_ORIGINS` | `http://localhost:3000` | No | Allowed origins |
| `BETTER_AUTH_URL` | — | No | Auth base URL (defaults to FRONTEND_URL) |
| `FRONTEND_URL` | `http://localhost:3000` | No | Stripe redirect URLs |
| `AUTH_SECRET` | — | No | Better Auth secret key |

### 12.2 Config Slices

```typescript
config.db            → { url: string }
config.server        → { port, corsOrigins, nodeEnv, logLevel }
config.frontend      → { url: string }
config.auth          → { baseUrl, trustedOrigins, secret }
config.stripe        → { secretKey: string }
```

All validated at startup via Zod schema (`env.schema.ts`). Missing required vars cause the process to exit immediately.
