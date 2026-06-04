# Read in Pace — Frontend

Nuxt 3 SSR application with Vue 3 Composition API, Pinia, Tailwind CSS v4, and shadcn-vue.

## Tech stack

- **Framework:** Nuxt 3 (SSR), Vue 3 `<script setup lang="ts">`
- **State:** Pinia (setup-function stores)
- **Styling:** Tailwind CSS v4 (CSS-first config, `@tailwindcss/vite` plugin), CSS custom properties for theming (OKLCH), dark mode via `.dark` class
- **UI:** shadcn-vue components (`components/ui/`), lucide-vue-next icons
- **Build:** Vite 7, Nitro server

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (port 3000) |
| `npm run build` | Production build |
| `npm run generate` | Static export |
| `npm run preview` | Preview production build |

## Project structure

```
frontend/
├── app.vue                 # Root component
├── nuxt.config.ts          # Nuxt configuration
├── assets/css/main.css     # Tailwind v4 CSS with @theme tokens
├── components/
│   ├── BookCard.vue        # Book card (default/borrowed/purchased variants)
│   ├── Navbar.vue          # Top navigation with auth menu
│   ├── AdminFab.vue        # Admin "Add New Book" FAB
│   └── ui/                 # shadcn-vue components
├── layouts/default.vue     # Default layout (includes AdminFab)
├── pages/
│   ├── index.vue           # Landing page
│   ├── feed.vue            # Book browsing with trending section
│   ├── dashboard.vue       # User's borrowed/purchased books
│   └── book/[id].vue       # Book detail with reviews
├── stores/
│   ├── auth.ts             # Auth state (sign-in, admin mode)
│   ├── books.ts            # Books catalog, reviews, likes
│   └── dashboard.ts        # User's borrowed/purchased books
├── data/books.ts           # Mock book data
└── server/api/auth/[...].ts # API proxy to NestJS backend
```

## Architecture

- **Pages:** Each page uses `definePageMeta` for SEO. Server routes (`server/api/`) proxy to the NestJS backend at `http://localhost:4000`.
- **Stores:** Pinia stores use setup-function syntax. `useAuthStore` manages auth state, `useBooksStore` manages the catalog, and `useDashboardStore` tracks user borrows/purchases.
- **Styling:** Tailwind v4 uses CSS-first configuration via `main.css`. Design tokens (colors, radius, animations) are in `@theme`. The `--radius` CSS variable drives all rounded utilities for consistent border-radius. Dark mode toggles via `.dark` class on `<html>`.
- **Path alias:** `~` for all project imports (`~/components/BookCard.vue`).
