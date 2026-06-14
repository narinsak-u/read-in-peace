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
       ├─ <BookActions :book :hasBorrowed @borrow />
       │    Buy button → cartStore.addItem(book) (hidden if stock ≤ 1)
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

## 5. Cart & Checkout

A client-side cart (localStorage-persisted) replaces the old single-item Stripe purchase.
Discounts are computed client-side for display and re-verified server-side at checkout.

### 5.1 Add to Cart

```
User clicks "Buy Now — $XX.XX" button (BookCard or BookActions)
  │
  ▼
BookCard / BookActions → cartStore.addItem({
  bookId, title, author, cover, price, category
})
  │
  ▼
stores/cart.ts → addItem(book)
  │
  ├─ Duplicate (bookId already in items):
  │    toast.info("This book is already in your cart") → return
  │
  └─ New item:
       items.value = [...items.value, book]
       drawerOpen.value = true  (auto-opens drawer)
  │
  ▼
watch(items) → localStorage.setItem("read-in-pace-cart", JSON.stringify(items))
  │  Cart survives page reloads via localStorage
```

### 5.2 Checkout Drawer

```
CartIcon (navbar, with item count badge) + "Proceed to Checkout" triggers
  │
  ▼
CheckoutDrawer slides in from right (TranslateX animation, Teleported to body)
  │
  ├─ Header: "Cart (N items)" + close button
  │
  ├─ Empty state:
  │    ShoppingBag icon + "Your cart is empty" + "Browse books and click Buy to add them"
  │
  └─ With items:
       ├─ For each item:
       │    Cover thumb (48×64, NuxtLink to /book/:id)
       │    Title, author, category, price, Remove button
       │
       ├─ Discount breakdown (via useDiscount/computeDiscount composable):
       │    computed(() => computeDiscount(cartStore.items))
       │    Pipeline: Subtotal → Qty Tier → Cat Bonus → Every $100 → Total
       │    ┌─────────────────────────────────────┐
       │    │ Order Summary                        │
       │    │ Subtotal (3 items)          $37.00   │
       │    │ − 20% bundle discount       −$7.40   │
       │    │ − Category bonus            −$3.70   │
       │    │ − Every $100 discount        $0.00   │
       │    │ ───────────────────────────────────  │
       │    │ Total                       $25.90   │
       │    └─────────────────────────────────────┘
       │
       └─ "Proceed to Checkout — $25.90" button
            (disabled when cart isEmpty)
```

### 5.3 Initiate Checkout

```
User clicks "Proceed to Checkout"
  │
  ▼
cartStore.checkout()
  │
  ├─ Not signed in:
  │    drawerOpen.value = false
  │    auth.openAuthModal(() => {      ← opens AuthModal
  │      drawerOpen.value = true        ← reopens drawer after sign-in
  │      checkout()                     ← retries checkout
  │    })
  │    return
  │
  └─ Signed in:
       │
       ▼
       POST /api/cart/checkout  { bookIds: string[] }
       │
       ▼
       TransactionsService.createCartCheckoutSession(bookIds, userId)
       │  1. Fetch all books from DB
       │  2. Validate all exist + inStock > 1
       │  3. Compute discount: applyDiscounts(books)
       │     → Pure function exported from transactions.service.ts
       │     Works in cents (Stripe convention):
       │
       │     a. Quantity Tier:
       │        1 item  → 0%
       │        2 items → 10% off subtotal
       │        3 items → 20% off subtotal
       │        4+      → 30% off subtotal (max)
       │
       │     b. Category Bonus:
       │        For each category with ≥2 items:
       │        discount += original category subtotal × 0.10
       │        Applied to running total after tier discount
       │
       │     c. Every $100:
       │        floor(runningTotalInCents / 10000) × 100
       │        = $1 off per $100 of remaining total
       │
       │     d. Clamp final to ≥ $0
       │
       │  4. Create Stripe Checkout Session:
       │     - mode: "payment"
       │     - line_item: "Read in Pace — N books" at computed total
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
TransactionsService.confirmPurchase(sessionId, userId)
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
cartStore.clear()  ← clears in-memory items; watch() persists empty to localStorage
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
| User adds item | `items.value` appends; `watch` persists to localStorage |
| User removes item | `items.value` filters; `watch` persists to localStorage |
| Page reload (client) | `plugins/cart-persist.client.ts` → `cartStore.hydrateFromStorage()` reads localStorage |
| Auth required (guest checkout) | Drawer closes → AuthModal opens → on sign-in success: drawer reopens → checkout retries |
| Stripe cancel (user returns) | Cart preserved (no clear happens) |
| Purchase confirmed | `cartStore.clear()` called from `dashboard.vue` after `confirmPurchase` |
| Sign out | Cart persists (stays in localStorage; not connected to auth state) |

### 6.2 Discount Pipeline

```
Subtotal  →  Quantity Tier  →  Category Bonus  →  Every $100  →  Final Price
```

Each stage receives the running total from the previous stage. Final price clamped ≥ $0.

| Stage | Condition | Discount formula |
|---|---|---|
| **Quantity Tier** | 2 items | 10% off subtotal |
| | 3 items | 20% off subtotal |
| | 4+ items | 30% off subtotal (max) |
| | 1 item | 0% |
| **Category Bonus** | Each category with ≥2 items | `+ originalCategorySubtotal × 0.10` (on original prices, not post-tier) |
| **Every $100** | Running total ≥ $100 | `floor(runningTotalInCents / 10000) × 100` cents |

### 6.3 Discount Computation Runs On Both Sides

**Frontend** (`composables/useDiscount.ts`):
- `computeDiscount(items: CartItem[]) → DiscountBreakdown`
- Used live in CheckoutDrawer via `computed(() => computeDiscount(cartStore.items))`
- Previews discounts before checkout

**Backend** (`transactions.service.ts`):
- `applyDiscounts(books: {price, category}[]) → DiscountResult` (exported pure function)
- Re-verifies during `POST /api/cart/checkout` (authoritative source)

### 6.4 Worked Example

Cart: Book A (Fiction, $20) + Book B (Fiction, $15) + Book C (Science, $30) + Book D (Science, $25)

| Step | Calculation | Running total |
|---|---|---|
| Subtotal | 20 + 15 + 30 + 25 | $90.00 |
| Qty tier (4 items → 30%) | −$27.00 | $63.00 |
| Cat bonus (Fiction $35×10%) | −$3.50 | $59.50 |
| Cat bonus (Science $55×10%) | −$5.50 | $54.00 |
| Every $100 (floor(54/100)×$1) | −$0.00 | **$54.00** |

---

## 7. Admin Operations

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

## 8. Data Flow Architecture

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

## 9. Stock / Inventory Model

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
