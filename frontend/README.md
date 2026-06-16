# Read in Peace — Frontend

Nuxt 3 SSR application with Vue 3 Composition API, Pinia, Tailwind CSS v4, and shadcn-vue.

## Tech stack

- **Framework:** Nuxt 3 (SSR), Vue 3 `<script setup lang="ts">`
- **State:** Pinia (setup-function stores)
- **Auth:** Better Auth client (`better-auth/vue`) with reactive `useSession()`
- **Cart:** Client-side Pinia store with manual localStorage persistence
- **Discounts:** 3-stage pipeline composable (quantity tier, category bonus, every $100)
- **Styling:** Tailwind CSS v4 (CSS-first config, `@tailwindcss/vite` plugin), OKLCH color tokens, dark mode via `.dark` class
- **UI:** shadcn-vue components (`components/ui/`), lucide-vue-next icons
- **Social share:** `@stefanobartoletti/nuxt-social-share`
- **Toasts:** `vue-sonner`
- **Build:** Vite 7, Nitro server

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (port 3000) |
| `npm run build` | Production build |
| `npm run generate` | Static export |
| `npm run preview` | Preview production build |

## Project structure

```
frontend/
├── app.vue                    # Root component (NuxtLayout + NuxtPage)
├── nuxt.config.ts             # Nuxt config (modules, runtimeConfig, Tailwind)
├── assets/css/main.css        # Tailwind v4 with @theme color tokens
├── composables/
│   ├── useBookDetail.ts       # Book detail orchestration (fetch, like, rate, comment)
│   ├── useShelf.ts            # Shelf pagination, category filtering, async cleanup
│   └── useDiscount.ts         # Discount pipeline (quantity tier, category bonus, every $100)
├── components/
│   ├── BookCard.vue           # Book card (default / borrowed / purchased variants)
│   ├── BookDetails.vue        # Book metadata: author, title, price, stock badge, synopsis
│   ├── BookActions.vue        # Buy/borrow buttons (buy → cartStore.addItem)
│   ├── BookRating.vue         # Star rating input (1-5)
│   ├── BookShare.vue          # Social share popup (Facebook, X, LinkedIn, Reddit, Threads, WhatsApp)
│   ├── BookComments.vue       # Comment form + comment list
│   ├── TrendingSection.vue    # Trending hero grid (feed page)
│   ├── BookShelf.vue          # Category filters, book grid, pagination (feed page)
│   ├── BookFormModal.vue      # Create/edit book form (admin)
│   ├── AuthModal.vue          # Sign-in / Sign-up modal
│   ├── Navbar.vue             # Top nav with CartIcon, profile dropdown, admin toggle
│   ├── AdminFab.vue           # Floating "Add New Book" button (admin)
│   ├── CheckoutDrawer.vue     # Right-side slide-over cart with items + discount breakdown
│   └── CartIcon.vue           # Cart icon in navbar with item count badge
├── layouts/default.vue        # Default layout (Footer, AdminFab, CheckoutDrawer, Toaster)
├── pages/
│   ├── index.vue              # Landing / hero page
│   ├── feed.vue               # Book browsing (trending + shelf with pagination)
│   ├── dashboard.vue          # User's borrowed / purchased books (clears cart on confirm)
│   └── book/[id].vue          # Book detail (cover, metadata, actions, comments)
├── plugins/
│   └── cart-persist.client.ts # Nuxt client plugin: rehydrate cart from localStorage
├── stores/
│   ├── auth.ts                # Auth state (session from useSession(), admin mode, auth modal)
│   ├── books.ts               # Books catalog, trending, likes, ratings, comments
│   ├── dashboard.ts           # User's borrowed + purchased books
│   └── cart.ts                # Cart items (localStorage), drawer state, checkout, discount helpers
├── lib/auth-client.ts         # Better Auth client (createAuthClient from better-auth/vue)
├── server/api/[...].ts        # H3 proxy forwarding all /api/* to NestJS backend
└── data/books.ts              # Mock Book interface (used for frontend types only)
```

## Architecture

### Pages as thin containers

Route pages delegate orchestration to composables and rendering to child components.

| Page | Composable | Child components |
|---|---|---|
| `book/[id].vue` | `useBookDetail(id)` | BookDetails, BookActions, BookRating, BookShare, BookComments |
| `feed.vue` | `useShelf()` | TrendingSection, BookShelf, BookFormModal |
| `dashboard.vue` | — (uses stores directly, clears cart on confirm) | BookCard (with borrowed/purchased variant) |

### Data flow

```
Page ──► composable (orchestration) ──► Pinia store (API calls + state)
  │
  ├── BookDetails (props: book)
  ├── BookActions (props: book, hasBorrowed; emits: borrow; buy → cartStore.addItem)
  ├── BookRating (props: avgRating, userRating; emits: rate)
  └── BookComments (props: comments, signedIn, showCommentForm; emits: submit)

Cart flow (no page composable — self-contained in cart store):
  Buy click ──► cartStore.addItem() ──► drawer open ──► discount preview ──► checkout
  │                                                                          │
  └── localStorage ◄──────────────────────────────────────────────────────────┘
                                                                      (watch + hydrate)
```

### Auth

- `better-auth/vue` provides `createAuthClient()` with `useSession()` (reactive Vue ref)
- `stores/auth.ts` watches session changes and exposes `signedIn`, `user`, `adminMode`
- All `/api/*` requests are proxied via `server/api/[...].ts` to NestJS backend

### Styling

- Tailwind v4 CSS-first config via `main.css` with `@theme` design tokens
- OKLCH color tokens mapped to CSS custom properties
- Dark mode via `.dark` class on `<html>`

### Path alias

`~` for all project imports (`~/stores/auth`, `~/components/BookCard.vue`).
