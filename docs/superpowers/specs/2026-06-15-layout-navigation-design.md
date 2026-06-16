# Layout & Navigation — Read in Peace Ex Libris Port (Sub-project 1)

## Overview

Restructure the frontend layout and navigation to match the Ex Libris design from `new_design/`. Replace the single top-navbar layout with a richer app layout featuring a top navbar, 12-col main grid with sidebar, and a floating bottom dock navigation pill. Keep the landing page separate with its own minimal layout.

This is Sub-project 1 of 4. It establishes the layout shell; page content is filled in later sub-projects.

## Route Structure

| Route | Page | Layout | Notes |
|-------|------|--------|-------|
| `/` | `index.vue` | `default` | Landing page unchanged (video BG) |
| `/home` | `home.vue` | `app` | Dashboard — content in Sub-project 2 |
| `/explore` | `explore.vue` | `app` | Book browsing (moved from `/feed`) |
| `/shelf` | `shelf.vue` | `app` | Borrowed/purchased (moved from `/dashboard`) |
| `/social` | `social.vue` | `app` | Reader feed — content in Sub-project 3 |
| `/book/[id]` | `book/[id].vue` | `app` | Book detail (change layout via `definePageMeta`) |

## Layouts

### `layouts/default.vue` (minimal — landing page only)

Stripped down from current version. Renders only:
- `<NuxtPage />`
- `<Toaster richColors position="top-center" />`

Removed from this layout: Navbar, Footer, AdminFab, CheckoutDrawer, BookFormModal (moved to `app` layout).

### `layouts/app.vue` (new — all authenticated-context pages)

Full app chrome:

```
┌─────────────────────────────────────────────┐
│ AppNavbar (sticky top)                      │
│ Logo │ Home Explore Shelf Social │ 🔍 Cart 👤│
├──────────────────────────┬──────────────────┤
│ <slot /> (main content)  │ AppSidebar       │
│ col-span-12 lg:col-span-8│ lg:col-span-4    │
│                          │  Yearly Progress  │
│                          │  Reader Feed      │
│                          │  Book Club CTA    │
├──────────────────────────┴──────────────────┤
│ BottomDock (fixed bottom, floating pill)    │
│  ◉ Home  ◉ Explore  ◉ Shelf  ◉ Social     │
└─────────────────────────────────────────────┘
```

Includes:
- `<CheckoutDrawer />`
- `<AdminFab v-if="isNotIndex" />`
- `<BookFormModal v-if="..." @close="..." @saved="..." />`
- `<Toaster richColors position="top-center" />`
- `<AuthModal>` (via Navbar)

## Components

### `AppNavbar.vue` (new)

- Sticky top-0, z-40, border-b, backdrop-blur, bg-background/90
- Left: Logo "Read in Peace" (font-serif, italic, text-primary, links to `/home`)
- Center tabs (hidden on mobile, shown md+): Home / Explore / Shelf / Social
  - Active tab: `border-b border-primary text-foreground`
  - Inactive: `text-muted-foreground hover:text-foreground`
  - Each is a `NuxtLink`
- Right: Search input (hidden sm-, sm+), CartIcon, user avatar button
- Search: `rounded-sm bg-input pl-9 pr-3 py-2 text-sm`, Search icon on left, placeholder "Search titles, authors..."
- Profile avatar button opens dropdown (keep existing dropdown from current Navbar)
- Import `CartIcon` from existing component

### `BottomDock.vue` (new)

- Fixed bottom-5, centered (left-1/2 -translate-x-1/2), z-40
- Pill: `rounded-full bg-foreground px-8 py-3 shadow-2xl border border-background/10`
- 4 items, each using `archivalDock` variant:
  - Home (`Home` icon + "Home" label) → `/home`
  - Explore (`Search` icon + "Explore" label) → `/explore`
  - Shelf (`Library` icon + "Shelf" label) → `/shelf`
  - Social (`MessageCircle` icon + "Social" label) → `/social`
- Active item gets `text-primary`
- Hidden on landing page only (determined by route check)

### `AppSidebar.vue` (new)

- Right sidebar, 4 cols on lg+, below main content on mobile
- 3 named slots for page-level content:
  - `#yearly-progress` — placeholder card (content in Sub-project 2)
  - `#reader-feed` — placeholder section (content in Sub-project 2)
  - `#book-club` — placeholder CTA (content in Sub-project 2)
- Default renders empty state: "Loading..." placeholder text

## Page Files

### `pages/home.vue` (new)

- Uses `app` layout via `definePageMeta({ layout: 'app' })`
- Placeholder content: "Dashboard" heading
- Actual content (Active Loans, New Arrivals, widgets) in Sub-project 2

### `pages/explore.vue` (new)

- Uses `app` layout
- Copy existing `/feed` page content here (TrendingSection + BookShelf)
- Update `definePageMeta` for SEO
- Fill sidebar slots with placeholder content

### `pages/shelf.vue` (new)

- Uses `app` layout
- Copy existing `/dashboard` page content here (borrowed/purchased tabs + BookCard grid)
- Update `definePageMeta` for SEO

### `pages/social.vue` (new)

- Uses `app` layout
- Placeholder: "Reader Feed" heading
- Content in Sub-project 3

### `pages/feed.vue` (modify)

- Redirect to `/explore`: add `definePageMeta({ redirect: '/explore' })` or use middleware

### `pages/dashboard.vue` (modify)

- Redirect to `/shelf`: add `definePageMeta({ redirect: '/shelf' })` or use middleware

### `pages/book/[id].vue` (modify)

- Add `definePageMeta({ layout: 'app' })` to switch from default layout
- Face one line for layout

### `pages/index.vue` (modify)

- Add `definePageMeta({ layout: 'default' })` to be explicit

## Not In This Sub-project

- Active Loans section content (Sub-project 2)
- Yearly Progress widget real content (Sub-project 2)
- Reader Feed widget real content (Sub-project 2)
- New Arrivals grid on dashboard (Sub-project 2)
- Book Club CTA (Sub-project 2)
- Social page backend API + database + UI (Sub-project 3)
- Book detail restyling with borrow/purchase cards (Sub-project 4)
- Cart page improvements (Sub-project 4)
- Search functionality wiring
