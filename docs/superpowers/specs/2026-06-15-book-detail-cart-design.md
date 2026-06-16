# Book Detail & Cart Improvements (Sub-project 4)

## Overview

Restyle the book detail page with Ex Libris-style borrow/purchase cards and Reader Room review cards. Add a full `/cart` page with quantity controls and a summary sidebar. Keep the existing cart drawer as a quick-access mini-cart.

## Book Detail Page (`pages/book/[id].vue`)

### Layout Changes

Two-column grid on md+: cover (sticky, left) + details (right).

**Left column:**
- Cover with `cover-crop cover-N` wrapper, border + shadow
- Sticky positioning (md:sticky md:top-24)

**Right column:**
- Metadata row: Shelf ID, pages, year (font-mono text-[10px] uppercase text-muted-foreground, separated by "·")
- Title (font-serif text-3xl font-bold)
- Author (italic text-muted-foreground)
- Star rating: filled/empty stars + "(N ratings)" in text-muted-foreground
- Description (text-sm leading-relaxed, mb-8)

### Borrow Card

Replaces current "Borrow" button. Styled as a bordered card:

```
┌─ Borrow ───────────────────────────────┐
│ 3 available                        ←→  │
│ [Borrow this book]                     │
│ 21-day loan from date of borrow        │
└────────────────────────────────────────┘
```

- Available copies count from `book.inStock` or API
- "Borrow this book" button (archival variant)
- Subtle "21-day loan from date of borrow" helper text
- Disabled state when out of stock or already borrowed

### Purchase Card

Replaces current "Buy" button. Styled as a bordered card:

```
┌─ Purchase ────────────────────────────┐
│ $21.00                                 │
│              [−]  1  [+]              │
│ [Purchase]                             │
│ Permanent copy · Ships within 5 days   │
└────────────────────────────────────────┘
```

- Price display
- Quantity selector: `−` / number / `+` buttons
- "Purchase" button (archival variant), triggers `cartStore.addItem`
- Disabled when out of stock

### Reader Room

Replaces the current `<div class="space-y-4">` comments list with review cards:

```
┌─ Reader Room ─────────────────────────────┐
│                                            │
│ ┌─ ★★★★☆ ───────────────────────────────┐ │
│ │ "Devastating and tender in equal..."    │ │
│ │    — Anya · 2 months ago     👍 12     │ │
│ └─────────────────────────────────────────┘ │
│                                            │
│ ┌─ ★★★★★ ───────────────────────────────┐ │
│ │ "Could not put this down..."             │ │
│ │    — Hana · 1 month ago       👍 8      │ │
│ └─────────────────────────────────────────┘ │
│                                            │
│ [Add your thoughts]                        │
└────────────────────────────────────────────┘
```

Each review card shows:
- Star rating (filled/empty stars)
- Comment text
- User name + relative time
- Like count (existing like system)
- Like button (existing)

"Add your thoughts" opens the existing comment form (no new modal needed — just restyle the existing form area).

### Review Form (stays inside detail page)

Keep the existing comment form but enhance:
- Star rating picker (1-5, clickable stars)
- Textarea
- Submit button (archival variant)
- Use existing `rateBook` + `createComment` API calls

## Cart Page (`pages/cart.vue`)

### New Page

Uses a standalone layout (no sidebar, no bottom dock). A header with logo + "Continue browsing" link, then the cart content.

### Layout

```
<header>: logo (Ex Libris style) + "← Continue browsing" button
<main>: grid [1fr_320px]
  <left>: list of cart items
  <right>: order summary sidebar
```

### Cart Item Row

```
┌─ [cover crop] ───────────────────────────────┐
│ The Architecture of Memory                    │
│ by Elena Rossi-Vaughn                         │
│ $21.00                          −  1  +       │
│ [Remove]                                      │
└───────────────────────────────────────────────┘
```

- Cover crop on left (h-36 w-24)
- Title (font-serif) + author (italic)
- Price + quantity controls on same row
- Remove button (archivalGhost, text-destructive)

### Order Summary Sidebar

```
┌─ Order Summary ───────────────┐
│ Subtotal (N items)   $42.00   │
│ − N% bundle discount −$4.20   │
│ − Category bonus     −$2.00   │
│ Total                $35.80   │
│                                │
│ [Proceed to Checkout]          │
│ — $35.80                       │
└────────────────────────────────┘
```

- Same discount calculation as drawer (reuse `computeDiscount`)
- Sticky sidebar on md+
- Checkout calls `cartStore.checkout()` (existing Stripe flow)

### Empty State

```
┌──────────────────────────────────┐
│        🛒 (icon)                │
│ Your book bag is empty.         │
│ Browse the stacks and keep a    │
│ permanent copy of something     │
│ worth returning to.             │
│      [Explore the library]       │
└──────────────────────────────────┘
```

### Navigation

- `CartIcon` click: opens drawer (unchanged)
- Drawer gets a "View full cart" link at the bottom → navigates to `/cart`
- `/cart` page: no sidebar, no bottom dock, standalone layout

## Cart Store Changes (`stores/cart.ts`)

### Add `quantity` to CartItem

```ts
export interface CartItem {
  bookId: string;
  title: string;
  author: string;
  cover: string;
  price: number;
  category: string;
  crop: number;
  quantity: number;  // NEW: default 1
}
```

### New Methods

```ts
function setQuantity(bookId: string, quantity: number): void;  // remove if 0
function incrementQuantity(bookId: string): void;
function decrementQuantity(bookId: string): void;  // remove if 1→0
```

### Updated Methods

- `addItem`: if item exists, increment quantity instead of duplicate
- `itemCount`: computed, sum of all `item.quantity`
- `removeItem`: unchanged

## Navigation Updates

- `CartIcon.vue`: badge shows `itemCount` (sum of quantities). Click opens drawer.
- `AppNavbar.vue`: CartIcon already renders — no change needed.
- Drawer (`CheckoutDrawer.vue`): Add "View full cart" link at bottom.
- Bottom dock: Cart page has no bottom dock (uses standalone layout).

## Files Summary

### Create
| File | Purpose |
|------|---------|
| `frontend/pages/cart.vue` | Full cart page with qty controls + summary sidebar |
| `frontend/layouts/cart.vue` | Minimal layout for cart page (no sidebar, no dock) |

### Modify
| File | Purpose |
|------|---------|
| `frontend/pages/book/[id].vue` | Restyle: cover layout, borrow/purchase cards, Reader Room |
| `frontend/stores/cart.ts` | Add quantity field, setQuantity/increment/decrement methods |
| `frontend/components/CheckoutDrawer.vue` | Add "View full cart" link, show quantity in rows |
| `frontend/components/CartIcon.vue` | Update badge to use quantity-based itemCount |

## Not In This Sub-Project
- Cover crop image asset (reuse existing covers)
- "Write Review" modal from Active Loans (deferred)
- Shipping/tax calculation in cart
- Order history on cart page
