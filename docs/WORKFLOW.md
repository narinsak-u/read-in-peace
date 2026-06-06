# Workflows

This document traces each user-facing workflow end-to-end: from UI interaction
through the full stack (frontend → composable → store → API proxy → NestJS
controller → service → database) and back to the UI.

---

## 1. Authentication

### 1.1 Sign Up

```
User fills email, password, name in AuthModal (sign-up tab)
  │
  ▼
AuthModal.vue calls auth.signUp(name, email, password)
  │
  ▼
stores/auth.ts → authSignUp()
  │  calls signUp.email({ name, email, password })
  │  from better-auth/vue client (lib/auth-client.ts)
  │
  ▼
POST /api/auth/sign-up
  │  (Nuxt server proxy: server/api/[...].ts forwards to NestJS)
  │
  ▼
backend/src/main.ts → toNodeHandler(auth)
  │  Better Auth handles the route:
  │  1. Validates input (name, email, password ≥ 8 chars)
  │  2. Hashes password with scrypt (N=16384, r=16, p=1, dkLen=64)
  │  3. Inserts user row + account row (providerId: "credential")
  │  4. Creates session, returns Set-Cookie header
  │
  ▼
Response: { user: { id, name, email }, session }
  │  Cookies forwarded by h3 proxyRequest
  │
  ▼
auth store sets signedIn = true, user = data.user
  │  useSession() reactive ref also updates (session watcher)
  │
  ▼
Toast: "Account created successfully"
  │  Router navigates to /feed
```

### 1.2 Sign In

```
User fills email, password in AuthModal (sign-in tab)
  │
  ▼
AuthModal.vue calls auth.signIn(email, password)
  │
  ▼
stores/auth.ts → authSignIn()
  │  calls signIn.email({ email, password })
  │
  ▼
POST /api/auth/sign-in
  │  (proxy → NestJS → Better Auth handler)
  │
  ▼
Better Auth:
  1. Looks up account by email, verifies password (scrypt compare)
  2. Creates session, returns Set-Cookie
  │
  ▼
Response: { user: { id, name, email }, session }
  │
  ▼
auth store sets signedIn = true, user = data.user
  │
  ▼
Toast: "Signed in successfully"
  │  Router navigates to /feed
```

### 1.3 Session Persistence (Page Reload)

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

### 1.4 Sign Out

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

```
User navigates to /feed
  │
  ▼
feed.vue (thin container) mounts
  │  uses useShelf() composable
  │
  ▼
composables/useShelf.ts → onMounted()
  │  Promise.all([
  │    booksStore.fetchTrending(),
  │    booksStore.fetchBooks(1, 12),
  │  ])
  │
  ▼
stores/books.ts:
  │  fetchTrending() → $fetch("/api/books/trending")
  │  fetchBooks(1, 12) → $fetch("/api/books?page=1&limit=12")
  │
  ▼
server/api/[...].ts → proxyRequest to http://localhost:4000
  │
  ▼
NestJS BooksController:
  │  @Get("api/books/trending") → BooksService.getTrending()
  │    SELECT books.*, likeCount, commentCount, avgRating
  │    ORDER BY avg rating DESC, LIMIT 3
  │
  │  @Get("api/books") → BooksService.findAll(1, 12)
  │    SELECT books.* with subquery aggregates
  │    WHERE (no category filter)
  │    ORDER BY createdAt DESC, LIMIT 12 OFFSET 0
  │
  ▼
Response: { data: BookWithMeta[], meta: { page, limit, total, totalPages } }
  │
  ▼
books store sets:
  │  trending.value = res  (for TrendingSection)
  │  books.value = res.data  (for BookShelf grid)
  │  meta.value = res.meta  (for pagination)
  │
  ▼
useShelf categories derivation:
  │  categories.value = ["All", ...new Set(books.map(b => b.category))]
  │  e.g. ["All", "Fiction", "How-to", "Manga"]
  │
  ▼
Template renders:
  │  <TrendingSection :trending="booksStore.trending" />
  │  <BookShelf
  │     :books="booksStore.books"
  │     :categories="categories"
  │     :activeCategory="activeCategory"
  │     :page="page"
  │     :totalPages="totalPages"
  │     :adminMode="auth.adminMode"
  │     @edit="handleEdit" @add-book="handleAddBook"
  │     @category-change="setCategory" @page-change="setPage"
  │  />
```

### 2.2 Category Filter

```
User clicks category button (e.g. "How-to") in BookShelf
  │
  ▼
BookShelf emits "categoryChange" with the category name
  │
  ▼
feed.vue calls setCategory(cat)
  │
  ▼
composables/useShelf.ts → setCategory(cat)
  │  activeCategory.value = cat
  │  page.value = 1  (resets to first page)
  │
  ▼
watch([page, activeCategory]) fires
  │  calls booksStore.fetchBooks(1, 12, "How-to")
  │
  ▼
GET /api/books?page=1&limit=12&category=How-to
  │
  ▼
BooksService.findAll(1, 12, "How-to")
  │  WHERE category = "How-to"
  │  Returns filtered data + new meta
  │
  ▼
books store updates books.value
  │  BookShelf re-renders with filtered books
```

### 2.3 Pagination

```
User clicks page button (e.g. page 3)
  │
  ▼
BookShelf emits "pageChange" with page number
  │
  ▼
feed.vue calls setPage(3)
  │
  ▼
composables/useShelf.ts → setPage(p)
  │  page.value = 3
  │
  ▼
watch([page, activeCategory]) fires
  │  cancelled flag prevents stale responses
  │  calls booksStore.fetchBooks(3, 12, activeCategory)
  │
  ▼
GET /api/books?page=3&limit=12
  │  (with category if active)
  │
  ▼
BooksService.findAll(3, 12)
  │  LIMIT 12 OFFSET 24
  │  Returns page 3 data
  │
  ▼
books store updates books.value
  │  BookShelf re-renders grid with new page
  │  Pagination buttons highlight current page
```

---

## 3. Book Detail Page

### 3.1 View Book Detail

```
User clicks a book card (from feed, trending, or dashboard)
  │
  ▼
NuxtLink navigates to /book/:id
  │
  ▼
pages/book/[id].vue (thin container) mounts
  │  uses useBookDetail(id) composable
  │
  ▼
composables/useBookDetail.ts → onMounted()
  │
  ├─ book.value = await booksStore.fetchBook(id)
  │    GET /api/books/:id → BooksService.findOne(id)
  │    SELECT book with subquery aggregates (likeCount, commentCount, avgRating)
  │    Returns BookWithMeta
  │
  ├─ comments.value = await booksStore.fetchComments(id)
  │    GET /api/books/:id/comments → CommentsController.findAll(id)
  │    SELECT comments with JOIN on user (name, image)
  │    ORDER BY createdAt DESC
  │
  └─ If signed in:
       Promise.all([
         dashboard.fetchBorrows(),       → GET /api/user/borrows
         booksStore.fetchLikeStatus(id), → GET /api/books/:id/like
         booksStore.fetchUserRating(id), → GET /api/books/:id/rate
       ])
  │
  ▼
Template renders 2-column grid:
  │
  ├─ Left (sticky): cover image
  │
  └─ Right (scrollable):
       ├─ <BookDetails :book="book" />
       │    author, title, price, avg rating, stock badge, synopsis
       ├─ <BookActions :book :hasBorrowed @buy @borrow />
       │    Buy button (hidden if stock ≤ 1)
       │    Borrow button (disabled if unavailable, out of stock, or already borrowed)
       ├─ Social row: Like button, Comment toggle, <BookShare />
       ├─ <BookRating /> with 5 stars
       └─ <BookComments :comments :signedIn :showCommentForm />
            (comment form hidden until MessageSquare is clicked)
```

### 3.2 Like / Unlike

```
User clicks heart button (not signed in)
  │
  ▼
composables/useBookDetail → handleLike()
  │  calls booksStore.toggleLike(id)
  │
  ▼
stores/books.ts → toggleLike()
  │  POST /api/books/:id/like
  │
  ▼
NestJS LikesController → LikesService.toggle(bookId, userId)
  │  AuthGuard validates session from cookie
  │  CurrentUser decorator extracts user.id
  │
  ▼
LikesService:
  │  1. SELECT existing like for (bookId, userId)
  │  2. If exists → DELETE like (unlike)
  │     If not → INSERT like
  │  3. SELECT COUNT(*) of likes for this book
  │
  ▼
Response: { liked: boolean, likeCount: number }
  │
  ▼
books store updates liked.value[id] = res.liked
  │
  ▼
Heart icon updates: fill, color (text-destructive if liked)

---

User clicks heart button (not signed in):
  │
  ▼
booksStore.toggleLike throws 401 from $fetch
  │
  ▼
catch → toast.error("Please sign in to like a book")
```

### 3.3 Rate a Book

```
User clicks star (1-5) in BookRating component
  │
  ▼
BookRating emits "rate" with star number
  │
  ▼
composables/useBookDetail → handleRate(rating)
  │  calls booksStore.rateBook(id, rating)
  │
  ▼
POST /api/books/:id/rate  { rating: 4 }
  │
  ▼
RatingsService.upsert(bookId, userId, 4)
  │  Validates integer 1-5
  │  INSERT ... ON CONFLICT (bookId, userId) DO UPDATE SET rating = 4
  │  SELECT AVG(rating) for this book
  │
  ▼
Response: { avgRating: 3.8, userRating: 4 }
  │
  ▼
books store updates:
  │  userRating.value[id] = 4
  │  book.value.avgRating = refetched from API
  │
  ▼
Star UI updates: stars up to userRating fill amber
  │  Avg rating label updates
```

### 3.4 Comment

```
User clicks MessageSquare icon → comment form appears (showCommentForm = true)
  │
  ▼
User types in textarea, clicks "Post comment"
  │
  ▼
BookComments emits "submit" with trimmed text
  │
  ▼
composables/useBookDetail → submitReview(text)
  │  calls booksStore.createComment(id, text)
  │
  ▼
POST /api/books/:id/comments  { text }
  │
  ▼
CommentsService.create(bookId, userId, text)
  │  AuthGuard validates session
  │  Inserts comment row
  │
  ▼
comments refetched: comments.value = booksStore.fetchComments(id)
  │
  ▼
Comment list re-renders with new comment at top
```

### 3.5 Share

```
User clicks Share2 icon
  │
  ▼
BookShare.vue → showShare = true
  │
  ▼
SocialShare popup appears (Facebook, X, LinkedIn, Reddit, Threads, WhatsApp)
  │  Uses @stefanobartoletti/nuxt-social-share module
  │  Dynamic baseUrl from runtimeConfig or env
  │
  ▼
User clicks a network → opens share dialog/URL
  │  Popup closes (SocialShare @click handler)
```

---

## 4. Borrow

### 4.1 Borrow a Book

```
User clicks "Borrow" button on BookActions (book detail) or BookCard (feed/dashboard)
  │
  ▼
Frontend guards (before API call):
  │
  ├─ If hasBorrowed: toast("You have already borrowed this book") → return
  │
  ├─ If !book.isAvailable: toast("Book is currently not available") → return
  │
  └─ If not signed in: toast.error("Please sign in to borrow a book") → return
  │
  ▼
dashboard.borrowBook(id)
  │
  ▼
POST /api/books/:id/borrow
  │
  ▼
TransactionsService.borrow(bookId, userId)
  │  1. Get book (check exists, isAvailable)
  │  2. Check no active borrow (same user, same book, returnedAt IS NULL)
  │     → ConflictException("Book already borrowed") if exists
  │  3. Calculate remaining = inStock - 1
  │  4. UPDATE books SET inStock = remaining, isAvailable = (remaining > 1)
  │  5. INSERT into borrows (bookId, userId, borrowedAt)
  │
  ▼
Response: { id, bookId, userId, borrowedAt }
  │
  ▼
dashboard store refetches borrows (dashboard.fetchBorrows())
  │
  ▼
Toast: "Book borrowed"
  │
  ▼
BookCard variant switches if on dashboard
  │  hasBorrowed flag updates for borrow button state
```

### 4.2 Return a Book

```
User clicks "Return Book" on BookCard(variant="borrowed") in dashboard
  │
  ▼
BookCard @click → dashboard.returnBook(book.id)
  │
  ▼
POST /api/books/:id/return
  │
  ▼
TransactionsService.returnBook(bookId, userId)
  │  1. Find active borrow (bookId, userId, returnedAt IS NULL)
  │     → BadRequestException if none found
  │  2. UPDATE books SET inStock = inStock + 1, isAvailable = true
  │  3. UPDATE borrows SET returnedAt = NOW()
  │
  ▼
Response: { id, bookId, userId, borrowedAt, returnedAt }
  │
  ▼
dashboard store refetches borrows
  │  BookCard with variant="borrowed" disappears from list
  │
  ▼
Toast: "Book returned"
```

### 4.3 View Borrows in Dashboard

```
User navigates to /dashboard
  │
  ▼
pages/dashboard.vue mounts
  │  Reads ?tab=borrowed from query (default)
  │
  ▼
onMounted:
  │  Promise.all([
  │    dashboard.fetchBorrows(),
  │    dashboard.fetchPurchases(),
  │  ])
  │
  ▼
stores/dashboard.ts:
  │  fetchBorrows() → GET /api/user/borrows
  │  fetchPurchases() → GET /api/user/purchases
  │
  ▼
TransactionsService.getUserBorrows(userId)
  │  SELECT borrows.*, books.*
  │  FROM borrows INNER JOIN books
  │  WHERE userId = ? AND returnedAt IS NULL
  │  ORDER BY borrowedAt DESC
  │
  ▼
Template renders:
  │  Tab bar: "Borrowed (N)" | "Purchased (N)"
  │  BookCard grid with variant="borrowed" tab
  │  Each card shows "Return Book" button
```

---

## 5. Buy (Stripe Purchase)

### 5.1 Initiate Checkout

```
User clicks "Buy Now — $XX.XX" button
  │
  ▼
Frontend guard:
  │  If book.inStock === 1: toast("Only one copy left — borrow-only") → return
  │  If not signed in: toast.error("Please sign in to buy a book") → return
  │
  ▼
dashboard.buyBook(id)
  │
  ▼
POST /api/books/:id/create-checkout-session
  │
  ▼
TransactionsService.createCheckoutSession(bookId, userId)
  │  1. Get book, check inStock > 1 (else BadRequestException)
  │  2. Initialize Stripe with STRIPE_SECRET_KEY
  │  3. Create Stripe Checkout Session:
  │     - mode: "payment"
  │     - line_item: book title, price (in cents)
  │     - metadata: { bookId, userId }
  │     - success_url: /dashboard?tab=purchased&session_id={CHECKOUT_SESSION_ID}
  │     - cancel_url: /book/{bookId}
  │
  ▼
Response: { url: "https://checkout.stripe.com/..." }
  │
  ▼
window.location.href = url  → Redirects to Stripe Checkout
```

### 5.2 Confirm Purchase (Stripe Redirect)

```
Stripe redirects to /dashboard?tab=purchased&session_id=cs_test_...
  │
  ▼
pages/dashboard.vue mounts
  │  Detects session_id in query
  │
  ▼
dashboard.confirmPurchase(sessionId)
  │
  ▼
POST /api/confirm-purchase?session_id=cs_test_...
  │
  ▼
TransactionsService.confirmPurchase(sessionId, userId)
  │  1. Retrieve Stripe Checkout Session
  │  2. Verify payment_status === "paid"
  │  3. Verify metadata.userId matches current user
  │  4. Check if purchase already recorded (idempotency)
  │  5. INSERT into purchases (bookId, userId)
  │  6. UPDATE books SET inStock = inStock - 1 (if > 1)
  │
  ▼
On success:
  │  Toast: "Purchase complete!"
  │  dashboard.fetchPurchases() refetches
  │  Dashboard shows "Purchased" tab with BookCard(variant="purchased")
  │  Each card shows "Read Now" button
  │
  ▼
On failure:
  │  Toast: "Purchase confirmation failed"
  │  Dashboard still loads normally
```

---

## 6. Admin Operations

### 6.1 Toggle Admin Mode

```
User clicks the shield toggle in Navbar profile dropdown
  │
  ▼
stores/auth.ts → toggleAdmin()
  │  adminMode.value = !adminMode.value
  │
  ▼
UI reacts:
  │  AdminFab appears (bottom-right "Add New Book" button)
  │  BookCard shows edit (pencil) and delete (trash) icons on hover
  │  BookShelf shows "+ New Book" button
  │  Feed page "+ New Book" button appears above shelf
```

### 6.2 Create Book

```
Admin clicks "+ New Book" (AdminFab, BookShelf, or feed header)
  │
  ▼
feed.vue sets showBookForm = true, editingBook = null
  │
  ▼
BookFormModal.vue (Teleported to body)
  │  Form fields: title, author, price, cover URL, synopsis, category, trending
  │  Uses reactive() for form state
  │
  ▼
Admin fills form, clicks "Create Book"
  │
  ▼
BookFormModal emits "saved"
  │
  ▼
booksStore.createBook(form)
  │
  ▼
POST /api/books
  │  AuthGuard validates session
  │
  ▼
BooksService.create(data, userId)
  │  INSERT INTO books (title, author, price, cover, synopsis, category, trending, createdBy)
  │
  ▼
Response: created book
  │
  ▼
Toast: "Book created"
  │  Modal closes
  │  Feed refetches current page
  │  New book appears in grid
```

### 6.3 Edit Book

```
Admin hovers a BookCard → pencil icon appears → clicks it
  │
  ▼
BookCard emits "edit" with the book
  │
  ▼
feed.vue → handleEdit(book)
  │  editingBook.value = book
  │  showBookForm.value = true
  │
  ▼
BookFormModal pre-fills with existing book data
  │
  ▼
Admin modifies fields, clicks "Save Changes"
  │
  ▼
booksStore.updateBook(id, form)
  │
  ▼
PUT /api/books/:id
  │  AuthGuard validates session
  │
  ▼
BooksService.update(id, data, userId)
  │  Verifies ownership (createdBy === userId)
  │  → ForbiddenException if not owner
  │  UPDATE books SET ... WHERE id = ?
  │
  ▼
Toast: "Book updated"
  │  Modal closes
  │  Feed refetches
```

### 6.4 Delete Book

```
Admin hovers BookCard → trash icon appears → clicks it
  │
  ▼
BookCard → handleDelete()
  │  confirm("Delete this book?")
  │
  ▼
booksStore.deleteBook(id)
  │
  ▼
DELETE /api/books/:id
  │
  ▼
BooksService.remove(id, userId)
  │  Verifies ownership
  │  DELETE FROM books WHERE id = ?
  │  (CASCADE deletes likes, comments, ratings, borrows, purchases)
  │
  ▼
Toast: "Book deleted"
  │  Card disappears from grid
```

---

## 7. Data Flow Architecture

### Request Lifecycle (typical authenticated request)

```
1. User action in component (e.g. @click="handleLike")
2. Page handler → composable method → store method
3. Store calls $fetch("/api/books/:id/like", { method: "POST" })
4. Nuxt server: server/api/[...].ts catches /api/*
5. h3 proxyRequest forwards to http://localhost:4000/api/books/:id/like
6. NestJS routing: BooksController → LikesController
7. AuthGuard: extracts cookie from headers, calls auth.api.getSession()
   → 401 if no valid session
8. CurrentUser decorator: attaches user.id to request
9. Service method: performs DB operations via Drizzle ORM
10. Response flows back: controller → proxy → store → component → UI
```

### Cookie / Session Flow

```
Better Auth sets session cookie on sign-in/sign-up
  │  Cookie: better-auth-session=<token>
  │  Domain: localhost (not Secure in dev)
  │
  ▼
Subsequent requests:
  │  Browser sends cookie with request
  │  Nuxt proxy (h3) forwards cookie header to NestJS
  │
  ▼
AuthGuard:
  │  fromNodeHeaders(request.headers) extracts cookie
  │  auth.api.getSession({ headers }) validates against DB
  │  Returns { user, session } or null
  │
  ▼
On page reload:
  │  better-auth/vue → useSession() calls GET /api/auth/get-session
  │  Cookie forwarded → Better Auth validates → session data returned
```

### Error Handling Flow

```
Backend throws (examples):
  │  NotFoundException("Book not found")       → 404
  │  UnauthorizedException()                   → 401
  │  ForbiddenException("Not your book")       → 403
  │  ConflictException("Already borrowed")     → 409
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
