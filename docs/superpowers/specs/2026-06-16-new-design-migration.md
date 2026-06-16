# New Design Migration — Full Port from `new_design/`

## Goal

Strip the frontend down to match `new_design/` (React/TanStack Start) pixel-perfectly. Keep only:
- Landing page (`/`) — as-is
- Single-page dashboard (`/home`) — exact port of `new_design/src/routes/index.tsx`
- Book detail (`/book/:id`) — exact port of `new_design/src/routes/book.$bookId.tsx`
- Cart (`/cart`) — exact port of `new_design/src/routes/cart.tsx`
- 404 page — exact port of `new_design/__root.tsx` NotFoundComponent

Auth (Better Auth), Stripe checkout, and the backend API proxy remain connected to the real backend.

## Pages

### `/` — Landing (keep as-is)
- Current `pages/index.vue` — full-screen video background, hero CTA
- Uses `layouts/default.vue` (minimal, no chrome)

### `/home` — Dashboard (rewrite from `new_design/src/routes/index.tsx`)
Single-page scrollable dashboard:

**Sticky Navbar:**
- Brand "Read in Peace" (serif, italic, links scroll to `#loans`)
- Desktop nav: Dashboard, Discover, The Stacks, Archive (scroll-to-section buttons)
- Search input (hidden on mobile), Cart link (icon + badge), user avatar button (initials, archival variant)
- Fully self-contained in page component (no shared layout)

**Main Content (12-col grid, 8 main + 4 sidebar on lg):**

#### Active Loans section
- Featured book card: real cover image (architecture-memory.png), "DUE IN 2 DAYS" badge, shelf location, progress bar (64%), actions (Return, Write Review, Buy $21.00)
- 2 mini loan cards: Silent Springs Revisited (crop 0, due Jun 22), Urbanism 2050 (crop 1, OVERDUE)
- Return buttons remove items from section (local state)
- Empty state: section conditionally hidden when all returned

#### New Arrivals section
- 4-book grid: The Hidden Sea, Logic & Form, Paper Shadows, The Long Night
- Each: sprite-sheet cover crop, title link, author, star rating, Borrow/Buy buttons
- Borrow button disabled after click, shows "Borrowed"
- Search filter filters the grid (mobile-only duplicate input)
- Empty state: "No volumes match \"{query}\"."

#### Sidebar (4 cols)
- **Yearly Progress**: "24 of 50 books", progress bar (48%), "2 books behind" message with accent border
- **Reader Feed**: 3 posts with initials avatars, time-ago, text, Like/Reply buttons
- **Book Club CTA**: dashed border, italic text, "Find a Book Club" button

#### Bottom Dock (fixed bottom)
- Center-aligned pill with 4 items: Home, Shelf, Social, Prefs
- Each: icon + label, archivalDock variant

#### Review Modal (conditional)
- Overlay with backdrop blur, clicks outside close
- Book cover thumbnail + title
- Star rating picker (1-5), textarea ("Write from the margins..."), Cancel/Publish buttons
- Disabled state when rating=0 or empty review

#### Toast Notification (fixed top-right)
- Dark background (`bg-foreground text-background`), auto-dismiss 2400ms
- Displays flash messages for all actions

### `/book/:id` — Book Detail (rewrite from `new_design/src/routes/book.$bookId.tsx`)

**Sticky Header:**
- Brand "Read in Peace" link, "Back to the stacks" link, Cart link

**3-Column Section:**
- **Left (300px)**: Book cover (direct image or sprite crop), shadow-2xl
- **Center (1fr)**: Metadata (year, pages, shelf), title (serif, up to 6xl), author (serif italic), star rating display, description paragraph, action buttons (Save to list, Read discussion)
- **Right (280px)**: Borrowing Status card — availability dot, status text, borrow button (disabled if borrowed), confirmation banner, divider, purchase price + "Purchase copy" button

**Discussion Section (full width below):**
- Header: "Reader Room" label, "Reviews & discussion" title, conversation count
- Reviews list with: initials avatar, name, time-ago, star rating, text, Like/Reply buttons, inline replies
- Sticky aside: "Add your voice" — star rating, textarea, publish button

**Error state**: 404-style message "This volume isn't on the shelf" with return link

### `/cart` — Cart (rewrite from `new_design/src/routes/cart.tsx`)

**Header:** Brand link, "Continue browsing" link

**Main content:**
- Section header: "The book bag" label, "Your cart" title, item count subtitle
- **Empty state**: Shopping cart icon, "Your book bag is empty." message, "Explore the library" button

**With items:**
- 2-column grid: items list (flex-1) + order summary (320px, sticky)
- Each item: cover image, title, author, price, quantity controls (- / count / +), Remove button
- Order summary: Subtotal, Shipping ("Calculated at checkout"), Estimated total
- "Proceed to checkout" button + secure checkout note
- Discount breakdown preserved from current implementation (tier, category, every-$100)

## Data Model

All book data is static, matching new_design exactly:

| ID | Title | Author | Price | Crop |
|---|---|---|---|---|
| `architecture-of-memory` | The Architecture of Memory | Elena Rossi-Vaughn | $21.00 | null |
| `the-hidden-sea` | The Hidden Sea | Eliot Harbor | $18.50 | 2 |
| `logic-and-form` | Logic & Form | Adrian Wakefield | $24.00 | 3 |
| `paper-shadows` | Paper Shadows | Maeve Lincoln | $16.00 | 4 |
| `the-long-night` | The Long Night | Daniel Hastings | $19.99 | 5 |

Sprite sheet: `new_design/src/assets/book-cover-sheet.png` (1536x1536, 3x2 grid)
Architecture cover: `new_design/src/assets/architecture-memory.png` (individual image)

Book covers use the `.cover-crop` + `.cover-0` through `.cover-5` system for sprite-sheet books.

## Interaction Fidelity

- Scroll-to-section via `scrollIntoView({ behavior: 'smooth' })` matching new_design
- Same button variants: `archival`, `archivalOutline`, `archivalGhost`, `archivalDock`
- Same 600ms cubic-bezier slide-up animation with staggered delays (150ms, 250ms, 300ms, 350ms)
- Flash/toast system with 2400ms auto-dismiss, fixed top-right
- Review modal: backdrop blur, click-outside-close, star rating + textarea
- Bottom dock: same icon set (Home, Library, MessageCircle, Settings) + label pattern
- Like/reply for reviews with local state
- Same 404 page design
- Same disabled/loading states

## Auth Integration

- Better Auth kept as-is (`stores/auth.ts`, `lib/auth-client.ts`)
- Auth modal kept and restyled to match new_design visual language
- User avatar button shows initials when signed in, opens profile
- No admin mode, no admin mode toggle

## Stripe Integration

- Cart checkout flow kept as-is (POST to `/api/cart/checkout`, redirect to Stripe)
- `session_id` query param handling kept for return from Stripe
- Discount pipeline kept in cart (`utils/discount.ts`)
- Cart store kept but refactored: simplify items to match new_design's CartItem shape, keep quantity support

## What Gets Removed

| Category | Files |
|---|---|
| Pages | `explore.vue`, `shelf.vue`, `social.vue`, `dashboard.vue`, `feed.vue` |
| Layouts | `layouts/app.vue`, `layouts/cart.vue` |
| Components | `AppNavbar`, `Navbar`, `AppSidebar`, `BottomDock`, `BookCard`, `BookShelf`, `TrendingSection`, `BookDetails`, `BookActions`, `BookRating`, `BookComments`, `BookShare`, `BookFormModal`, `AdminFab`, `FeedPost`, `CompactFeedPosts`, `YearlyProgressCard`, `CheckoutDrawer`, `CartIcon`, `Footer` |
| Stores | `books.ts`, `dashboard.ts`, `social.ts`, `readingGoal.ts` |
| Composables | `useBookDetail.ts`, `useShelf.ts` |
| Data | `data/books.ts`, `data/comments.ts` |

## File Inventory

### Kept/Adapted
- `pages/index.vue` — landing page (keep)
- `layouts/default.vue` — minimal layout (keep)
- `stores/auth.ts` — auth store (keep)
- `stores/cart.ts` — cart store (keep, refactor)
- `composables/useSearch.ts` — search query (keep)
- `lib/auth-client.ts` — Better Auth client (keep)
- `server/api/[...].ts` — API proxy (keep)
- `assets/css/main.css` — Tailwind theme (keep)
- `components/ui/button/Button.vue` — Button with archival variants (keep)
- `components/AuthModal.vue` — auth modal (keep, restyle)

### Rewritten (pixel-perfect from new_design)
- `pages/home.vue` — dashboard (from index.tsx)
- `pages/book/[id].vue` — book detail (from book.$bookId.tsx)
- `pages/cart.vue` — cart page (from cart.tsx)
- `app.vue` — root app component (keep as-is: `<NuxtLayout><NuxtPage /></NuxtLayout>` — still needed for `layouts/default.vue`)

### New
- `public/images/book-cover-sheet.png` — sprite sheet (copy from new_design)
- `public/images/architecture-memory.png` — individual cover (copy from new_design)
- `components/CoverImage.vue` — cover renderer with crop support

### Removed
- All files listed under "What Gets Removed" above
- `plugins/cart-persist.client.ts` (cart store handles its own persistence)
- `utils/discount.ts` (discount logic merged into cart store)

## CSS / Theme

The current `assets/css/main.css` already matches new_design's OKLCH values from Phase 1. No changes needed.

The `.animate-enter` class, `.cover-crop` / `.cover-N` classes, and `slide-up` animation already exist.

## Implementation Order

Each task is independent and can run in a parallel subagent:

1. **Cleanup**: Remove all files listed in "What Gets Removed"
2. **Assets**: Copy sprite sheet + architecture-memory.png to `public/images/`
3. **Home page**: Rewrite `pages/home.vue` pixel-perfect from `index.tsx`
4. **Book detail**: Rewrite `pages/book/[id].vue` pixel-perfect from `book.$bookId.tsx`
5. **Cart page**: Rewrite `pages/cart.vue` pixel-perfect from `cart.tsx`, refactor cart store to match
6. **Auth modal restyle**: Visually update `AuthModal.vue` to match new_design's visual language
7. **Root app**: Verify `app.vue` is `<NuxtLayout><NuxtPage /></NuxtLayout>` (keep as-is)
8. **404 page**: Add 404 page matching new_design's NotFoundComponent
9. **Verify build**: Run `npm run build` and fix any issues
