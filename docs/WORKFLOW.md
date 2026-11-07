# Workflows

![Screenshot](../frontend/public/Screenshot.png)

This document traces each user-facing workflow end-to-end: from UI interaction
through the full stack (frontend → composable → store → API proxy → NestJS
controller → service → database) and back to the UI.

---

## Local and production configuration

The frontend and backend are independent npm packages. Install repository tooling
once, then install each application separately:

```sh
npm install
cd frontend && npm ci
cd ../backend && npm ci
```

Before root `npm run dev`, start Central Identity with `bun run dev:setup`; it
exports the public root certificate to
`../book-auth-middleware/central-identity-root.crt`. Root startup resolves that
certificate to an absolute path for Nest, which needs it to fetch the issuer's
discovery document. Set `NODE_EXTRA_CA_CERTS` to use an explicit CA path instead.
If the default or override is missing or unreadable, startup stops with guidance.
Root startup starts PostgreSQL from `backend/docker-compose.yml` in its existing
`backend` Compose project. It reuses the existing `pgdata` volume and
`readinpeace` database, preserving local users and sessions. Nest runs on `:3000`
and Nuxt on `:3001`. Open Reading at `http://localhost:3001`; Nuxt owns and
proxies browser `/api/*` requests to Nest. Central Identity remains at
`https://auth.localhost:8080/api/auth`; register
`http://localhost:3001/api/auth/callback/central-identity` as the development
callback.

Each application keeps its own encrypted env files and ignored `.env.keys`.
Test-production uses a separate ignored `.env.test-production.keys` in each
package. Back up package key files outside the repository with restrictive
permissions. Root env commands select one file for both packages, defaulting to
development:
`ENV_FILE=.env.test-production npm run env:encrypt` or
`ENV_FILE=.env.test-production npm run env:decrypt`. These commands use each
package's `.env.test-production.keys` for test-production, and `.env.keys` for
development or live production. Live production files are touched only when
`ENV_FILE=.env.production` is explicitly selected. Never commit key files or
plaintext env files.

`npm run dev:prod` builds both applications, starts PostgreSQL from the root
Compose files with its own volume on host `:5433`, waits for database health,
runs test-production migrations, then starts both apps in production mode.
It uses only `.env.test-production`, backend `:3100`, Nuxt preview `:3101`, and
the isolated origins `https://reading-test.localhost:8081` and
`https://auth-test.localhost:8081`. Central Identity's isolated Caddy gateway
serves `:8081`; this command starts only Reading services and its database. The
backend guard accepts only Stripe test credentials and those isolated local
origins in this mode. Keep `.env.production` reserved for live operator
settings; this local command never loads it. Configure the Reading Central
Identity test client callback as
`https://reading-test.localhost:8081/api/auth/callback/central-identity` before
testing SSO. Provider-console client provisioning is required.

Tracked `.env.*.example` files are templates, not credentials. Configure and
encrypt `.env.test-production` separately in both packages before starting
`dev:prod`; use a unique local auth secret, test Stripe credentials, and the
operator-provisioned test Central Identity client. Do not copy a live client
secret or live Stripe key into local configuration.

The frontend refuses a live production build without all three public URLs; the
backend production config requires its database, auth, payment, and Central
Identity values. The root Husky pre-commit hook encrypts and re-stages changed
development, production, and test-production env files. It rejects plaintext,
staged private keys, and partially staged env changes.

Run `npm run test:env` from the repository root to exercise the hook in a
disposable Git repository. This verifies commit-time encryption and rejection
of private keys and partial env staging; it does not exercise live sign-in.

---

## 1. Authentication

### 1.1 Start Central Identity sign-in

The header profile control starts the Relying Party's Better Auth OAuth request.
The same control is available in the mobile navigation. It does not link directly
to the portal, so the application owns the authorization transaction and return
destination.

```text
Sign In → POST /api/auth/sign-in/social (provider: central-identity)
  → Better Auth discovers Central Identity and starts OIDC authorization code
    flow with state and PKCE
  → browser visits the Central Identity Authentication Portal
```

The Relying Party callback is
`http://localhost:3001/api/auth/callback/central-identity`. Keep the callback
registered on the development Central Identity client.

### 1.2 Callback, account mapping, and session

Better Auth validates the OIDC response and matches the Central Identity issuer
and subject to the existing `central-identity` account link. It creates an
independent Read in Peace Application Session only after successful callback.
The browser returns to the original safe same-origin path, query, and fragment.
Application authorization still checks the retained local user and roles.

An unknown subject cannot claim an unlinked local user by matching email.
Conflicts and unlinked existing users must use the signed-in Identity Link or
Reviewed Recovery flow. Recovery proves ownership; it does not create an
Application Session as its proof step or replace local users and records.

### 1.3 Retired local sign-in

Read in Peace Better Auth has email/password authentication disabled and
registers only Central Identity as a normal OAuth provider. Legacy password and
social-login requests cannot create an Application Session. Existing user,
account, session, and business records remain in place. Old local credentials
remain only as the recovery proof for migration and must not be exposed as a
sign-in option.

### 1.4 Development browser check

1. Start the Central Identity development service and database.
2. Start Read in Peace with `npm run dev`.
3. Open `http://localhost:3001`.
4. Select Sign In from the header or mobile navigation. Confirm the browser
   enters the portal through the Central Identity authorization request.
5. Complete Central Identity authentication. Confirm callback creates the local
   session and returns to the original safe same-origin page.
6. Open `http://localhost:3001/dashboard` while signed out. After local session
   hydration, confirm OIDC starts automatically and callback returns to `/dashboard`.
7. Confirm an unlinked existing account cannot sign in by email match and is
   directed to Reviewed Recovery.
8. Tamper with OIDC state, issuer, token, authorization code, and return target.
   Forged state, invalid issuer/token, replayed code, or external destination
   must fail without creating a session or redirecting outside this origin.
9. Confirm local password, signup, password-reset, Google, and GitHub requests
   do not create an Application Session.

Do not use production issuer or credentials for this development check.

### 1.5 Session Persistence (Page Reload)

```
Page reloads
  │
  ▼
stores/auth.ts creates authClient.useSession()
  │  This is a reactive Vue ref from better-auth/vue
  │  It calls GET /api/auth/get-session with existing cookies
  │
  ▼
Better Auth reads session token from cookie
  │  Validates against session table, checks expiry
  │
  ▼
On success: session watcher fires
  │  user.value = session.user
  │  signedIn.value = true
  │
  ▼
On failure (no cookie / expired):
  │  user.value = null
  │  signedIn.value = false
  │
  ▼
UI reacts: Navbar shows profile initials, guarded features unlock
```

### 1.6 Sign Out

```
User clicks "Sign out" in Navbar dropdown
  │
  ▼
stores/auth.ts → authSignOut()
  │  calls signOut() from better-auth/vue
  │
  ▼
POST /api/auth/sign-out
  │  (proxy → NestJS → Better Auth handler)
  │
  ▼
Better Auth invalidates session (deletes from DB)
  │  Returns clear-cookie header
  │
  ▼
auth store resets: signedIn = false, user = null
  │
  ▼
Toast: "Signed out"
  │  UI updates: profile icon returns to User icon, guarded features hide
```

---

## 2. Browse Books (Feed Page)

### 2.1 Initial Load

`/feed` renders the loan, new-arrival, and reader-feed sections. `NewArrivals`
uses `useBooks({ query })`, which fetches page 1 with 8 books immediately.

```text
/feed → NewArrivals → useBooks → GET /api/books?page=1&limit=8
  → Nuxt API proxy → BooksController → BooksService → PostgreSQL
  ← paginated books and metadata
```

The response is mapped to frontend book models. `useBooks` exposes the current
page, metadata, loading state, and filtered result.

### 2.2 Category, Search, and Pagination

`NewArrivals` supplies a fixed category list. Category changes update the
`useBooks` category ref; page or category changes trigger another API request.
Search filters the current page in the browser. Pagination updates the page ref
and clamps it to the available range.

---

## 3. Book Detail Page

### 3.1 View Book Detail

`/book/:id` fetches the book through Nuxt's API proxy and maps the response to
the frontend book model. The page renders `BookHero`, `BookBorrowCard`, and
`BookReviews`.

```text
/book/:id → pages/book/[id].vue → GET /api/books/:id
  → Nuxt API proxy → BooksController → BooksService → database
```

### 3.2 Publish a Review

`BookReviews` collects a star rating and review text. A signed-in reader submits
`POST /api/books/:id/comments` with `{ text, rating }`. The backend stores the
comment and rating together; the review list refreshes through its invalidation
hook.

### 3.3 Reply to or Like a Review

Replies use the same comments endpoint with `parentId`. Review likes use
`POST` or `DELETE /api/books/:id/comments/:commentId/like`. The review
composable updates likes optimistically and restores the previous state if the
request fails.

## 4. Borrow

### 4.1 Borrow and Return

Book-detail and feed actions call `useBookStatusStore`. It sends
`POST /api/books/:id/borrow` or `/return` through the Nuxt API proxy.

```text
Borrow action
  → TransactionsController
  → BorrowsService.borrow()
  → transaction locks the book, checks availability, duplicate loans,
    and membership limit
  → records a 14-day loan and updates stock

Return action
  → TransactionsController
  → BorrowsService.returnBook()
  → restores stock and marks the loan returned
```

The UI refreshes borrow state and displays the result. Backend errors preserve
stock and loan consistency through the transaction boundary.

### 4.2 Dashboard Loans and Purchases

`/dashboard` loads loans with `useBorrows()` and purchases with
`usePurchases()`. The backend exposes `GET /api/user/borrows` and
`GET /api/user/purchases`; the loan list is paginated.


---

## 5. Cart & Checkout

The client-side cart persists through localStorage. It previews discounts; the
backend recalculates the authoritative total when creating the Stripe Checkout
Session.

### 5.1 Add to Cart

```
User adds a book to the cart from BookCard or BookBorrowCard
  │
  ▼
BookCard or BookBorrowCard → cart.addItem({
  id, title, author, cover, price, category, stock
})
  │
  ▼
stores/cart.ts → addItem(book)
  │
  ├─ Existing item: increment quantity up to current stock
  └─ New item: add with quantity 1
  │
  ▼
Pinia persistence stores the cart under "read-in-peace-cart"
  │  Cart survives page reloads
  ▼
```

### 5.2 Cart Page

The navbar cart link opens `/cart`. The page shows each item, quantity controls,
removal, subtotal, and a discount breakdown. The preview includes the active
membership-plan discount after bundle, category, and every-$100 discounts.

### 5.3 Initiate Checkout

```
User clicks "Proceed to Checkout"
  │
  ▼
cartStore.checkout()
  │
  ├─ Not signed in:
  │    auth.signInCentral() starts Central Identity OIDC
  │    the cart persists across the redirect; user retries checkout
  │    return
  │
  └─ Signed in:
       │
       ▼
       POST /api/cart/checkout  { bookIds: string[] }
       │
       ▼
       CheckoutService.forCart(bookIds, userId)
       │  1. Fetch and validate books and available stock
       │  2. Load the user's membership plan
       │  3. Compute discounts with applyDiscounts() from transactions/domain/pricing.ts
       │     Works in cents (Stripe convention):
       │
       │     a. Quantity tier: 2 books = 10%, 3 = 20%, 4+ = 30%
       │     b. Category bonus: 10% for each category with at least 2 books
       │     c. Every $100: $1 off each full $100 of the running total
       │     d. Membership plan discount follows the other stages
       │     e. Clamp final total to at least $0
       │  4. Create Stripe Checkout Session:
       │     - mode: "payment"
       │     - line_item: "Read in Peace — N books" at computed total
       │     - metadata: { bookIds: JSON.stringify(bookIds), userId }
       │     - success_url: /dashboard?tab=purchased&session_id=...
       │     - cancel_url: /feed?cart=preserved
       │
       ▼
       Response: { url: "https://checkout.stripe.com/..." }
       │
       ▼
       navigateTo(url, { external: true })  → Stripe Checkout
```

### 5.4 Confirm Purchase (Stripe Redirect)

```
Stripe redirects to /dashboard?tab=purchased&session_id=cs_test_...
  │
  ▼
pages/dashboard.vue → onMounted()
  │  Detects session_id in query
  │
  ▼
dashboard.confirmPurchase(sessionId)
  │
  ▼
PurchaseConfirmationService.confirm(sessionId, userId)
  │  1. Retrieve Stripe Checkout Session
  │  2. Verify payment_status === "paid"
  │  3. Verify metadata.userId matches current user
  │
  ├─ Metadata has bookIds (JSON array, from cart):
  │    recordBatchPurchases(bookIds, userId)
  │    DB transaction:
  │      For each bookId (skip if already purchased):
  │        INSERT into purchases (bookId, userId)
  │        UPDATE books SET inStock = inStock - 1
  │          WHERE id = bookId AND inStock > 1
  │      If any fail: transaction rolls back all inserts/decrements
  │
  └─ Metadata has bookId (single, legacy from old buy flow):
       recordSinglePurchase(bookId, userId)
       Same as old flow with WHERE filter per-bookId
  │
  ▼
cartStore.clear()  ← Pinia persistence stores the empty cart
Toast: "Purchase complete!"
dashboard.fetchPurchases() refetches
  │
  ▼
Dashboard shows "Purchased" tab with BookCard(variant="purchased")
  │  Each card shows "Read Now" button
  │
  ▼
On failure:
  │  Toast: "Purchase confirmation failed"
  │  Cart preserved (user can retry from Stripe)
```

---

## 6. Cart & Discount Model

### 6.1 Cart State Lifecycle

| Event | Effect on cart |
|---|---|
| User adds or changes items | Pinia persistence stores changes under `read-in-peace-cart` |
| User removes item | Pinia persistence stores the updated cart |
| Page reload | Pinia persistence restores the cart from localStorage |
| Auth required (guest checkout) | Central Identity sign-in; persisted cart remains available after callback |
| Stripe cancel (user returns) | Cart preserved (no clear happens) |
| Purchase confirmed | `cartStore.clear()` called from `dashboard.vue` after `confirmPurchase` |
| Sign out | Cart persists (stays in localStorage; not connected to auth state) |

### 6.2 Discount Pipeline

```
Subtotal → Quantity Tier → Category Bonus → Every $100 → Membership Plan → Final Price
```

Each stage receives the running total from the previous stage. Final price is
clamped to $0 or higher.

| Stage | Condition | Discount formula |
|---|---|---|
| **Quantity Tier** | 2/3/4+ items | 10%/20%/30% off subtotal |
| **Category Bonus** | Each category with ≥2 items | 10% of original category subtotal |
| **Every $100** | Running total ≥ $100 | $1 for each full $100 |
| **Membership Plan** | Paid plan | Plan percentage off the post-pipeline total |

### 6.3 Discount Computation Runs On Both Sides

**Frontend** (`utils/discount.ts`):
- `computeDiscount(items, planDiscountPercent)` previews the cart page breakdown.

**Backend** (`transactions/domain/pricing.ts`):
- `applyDiscounts(books, planDiscountPercent)` runs in `CheckoutService` and
  calculates the authoritative amount for Stripe Checkout.

### 6.4 Worked Example

With the free plan, cart prices $20, $15, $30, and $25:

| Step | Calculation | Running total |
|---|---|---|
| Subtotal | 20 + 15 + 30 + 25 | $90.00 |
| Qty tier (4 items → 30%) | −$27.00 | $63.00 |
| Category bonus (Fiction $35 × 10%) | −$3.50 | $59.50 |
| Category bonus (Science $55 × 10%) | −$5.50 | $54.00 |
| Every $100; free plan | $0 | **$54.00** |

---


## 7. Data Flow Architecture

```text
Component → page handler → composable or Pinia store
  → same-origin /api request → Nuxt server API proxy
  → NestJS controller → application service
  → repository contract → Drizzle/PostgreSQL
  ← response returns through the same layers to the UI
```

```
Central Identity OIDC callback succeeds
  │ Better Auth creates a Read in Peace Application Session
  │ Browser stores its session cookie for the HTTPS Reading origin
  ▼
Subsequent same-origin request:
  │ Browser sends the Application Session cookie
  │ Nuxt proxy forwards the cookie header to NestJS
  ▼
AuthGuard:
  │ auth.api.getSession({ headers }) validates the session against the database
  │ Returns { user, session } or null
  ▼
On page reload:
  │ better-auth/vue → useSession() fetches GET /api/auth/get-session
  │ Nuxt forwards the cookie; Better Auth returns the session
```

### Error Handling Flow

```
Backend throws (examples):
  │  NotFoundException("Book not found")       → 404
  │  UnauthorizedException()                   → 401
  │  ForbiddenException("Not your book")       → 403
  │  BadRequestException("Book already borrowed") → 400
  │  BadRequestException("Invalid rating")     → 400
  │
  ▼
NestJS serializes to JSON error response:
  │  { statusCode: 4xx, message: string }
  │
  ▼
$fetch on frontend throws:
  │  { statusCode, message, data, ... }
  │
  ▼
Store catches:
  │  Checks e?.statusCode === 401 → toast("Please sign in...")
  │  Otherwise → toast("Failed to...")
  │  Re-throws for caller
```

---

## 8. Stock / Inventory Model

| Condition | Buy button | Borrow button | Stock badge |
|---|---|---|---|
| `inStock > 1` | Visible | Enabled | "In stock: N" (green) |
| `inStock === 1` | Hidden (borrow-only) | Enabled | "In stock: 1" (green) |
| `inStock < 1` | Hidden | Disabled, "Unavailable" | "Out of stock" (red) |
| `isAvailable === false` | — | Disabled, "Unavailable" | Normal (green/red) |
| `hasBorrowed === true` | — | Disabled, "Unavailable" | Normal |

### Stock mutation triggers

| Action | Effect on stock | Effect on isAvailable |
|---|---|---|
| Borrow | `inStock - 1` | `false` if remaining ≤ 1 |
| Return | `inStock + 1` | Always `true` |
| Purchase (confirmed) | `inStock - 1` | No change |
| Create book | Default: 5 | Default: `true` |
| Edit book | No change | No change |
