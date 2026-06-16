# Read in Peace — Nuxt/Nest Migration Design

## Overview

Migrate the existing "Read in Peace" TanStack React monolith (React 19 + TanStack Start SSR + shadcn/ui + Tailwind v4) to a separated architecture with a Nuxt 3 SSR frontend and a NestJS backend. Mock data is retained throughout — no real database or auth integration.

---

## 1. Monorepo Structure

```
read-in-pace/
├── frontend/                  # Nuxt 3 SSR app
│   ├── app.vue
│   ├── nuxt.config.ts
│   ├── pages/
│   │   ├── index.vue              # Landing page
│   │   ├── feed.vue               # Book listing / trending
│   │   ├── book/
│   │   │   └── [id].vue           # Individual book page
│   │   └── dashboard.vue          # User dashboard
│   ├── components/
│   │   ├── Navbar.vue
│   │   ├── BookCard.vue
│   │   ├── AdminFab.vue
│   │   └── ui/                    # shadcn-vue generated components
│   ├── stores/                    # Pinia stores
│   │   ├── auth.ts                # Auth state + mock auth API calls
│   │   ├── books.ts               # Book data + likes
│   │   └── dashboard.ts           # Borrowed/purchased lists
│   ├── composables/               # Reusable Vue composables
│   ├── data/                      # Mock data (ported books.ts, reviews)
│   ├── server/                    # Nuxt server routes / proxies
│   ├── assets/css/
│   │   └── main.css               # Tailwind v4 + theme tokens
│   ├── nuxt.config.ts
│   ├── tsconfig.json
│   └── package.json
├── backend/                       # NestJS app
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   └── auth/
│   │       ├── auth.module.ts
│   │       ├── auth.controller.ts
│   │       └── auth.service.ts
│   ├── nest-cli.json
│   ├── tsconfig.json
│   ├── tsconfig.build.json
│   └── package.json
├── package.json                   # Root — npm workspaces
├── tsconfig.base.json             # Shared TS base config (if needed)
└── .gitignore
```

**Root `package.json`:** Declares `"workspaces": ["frontend", "backend"]`. Dev scripts use `concurrently` to run both projects in parallel (`npm run dev:all`).

---

## 2. Frontend (Nuxt 3 SSR)

### Nuxt Configuration

- `ssr: true` (server-side rendering)
- Modules: `@nuxtjs/tailwindcss`, `shadcn-nuxt`, `@pinia/nuxt`
- Dev server on port 3000
- Runtime config for backend URL (`http://localhost:4000`)

### Pinia Store Design

Each store is a single-responsibility Pinia module.

**`stores/auth.ts`:**

- State: `signedIn`, `username`, `adminMode`
- Actions: `toggleAuth()` (calls mock POST /auth/login), `toggleAdmin()`
- Initial state mirrors current app: signedIn=true, username="Alex Rivera", adminMode=false

**`stores/books.ts`:**

- State: `books` (Book[] from mock data), `liked` (Record<string, boolean>)
- Getters: `getBook(id)`, `trendingBooks`, `getLiked`
- Actions: `toggleLike(id)`

**`stores/dashboard.ts`:**

- State: `borrowed` (string[]), `purchased` (string[])
- Actions: `borrow(id)`, `returnBook(id)`, `buy(id)`
- Initial mock IDs: borrowed=["2","5"], purchased=["1","7","9"]

### Page Migration

Each page is a single-file Vue component (`<script setup lang="ts">`). The visual output and behavior are preserved exactly.

| Current Route | New Route       | Key Changes                                       |
| ------------- | --------------- | ------------------------------------------------- |
| `/` (Landing) | `index.vue`     | Direct port of animated gradient, CTA button      |
| `/feed`       | `feed.vue`      | Trending section + full shelf grid + pagination   |
| `/book/$id`   | `book/[id].vue` | Two-column layout, reviews, social buttons        |
| `/dashboard`  | `dashboard.vue` | Tab switch (borrowed/purchased), BookCard variant |

### Component Migration

| Component      | Notes                                                              |
| -------------- | ------------------------------------------------------------------ |
| `Navbar.vue`   | Logo, feed/dashboard links, profile dropdown with admin toggle     |
| `BookCard.vue` | 3 variants (default/borrowed/purchased), admin edit/delete buttons |
| `AdminFab.vue` | Floating "+ Add New Book" button, admin-only visibility            |
| `ui/*`         | shadcn-vue components generated via CLI (Button, Card, etc.)       |

### Styling

- Tailwind CSS v4 with custom theme tokens ported from current `styles.css`:
  - OKLCH color palette (background, foreground, primary, muted, etc.)
  - Custom utilities: `bg-animated-gradient`, `glass`, `animate-fade-up`
  - Light/dark mode CSS variables
- The `@theme inline` block and `@layer base` styles are ported verbatim

### Nuxt Server Proxy

- A Nuxt server route (`server/api/`) forwards `/api/auth/*` requests to the Nest backend at port 4000
- This avoids CORS issues during development while keeping the frontend and backend decoupled

---

## 3. Backend (NestJS)

### Setup

- Scaffolded via `nest new backend --package-manager npm --skip-git`
- Runs on port 4000
- CORS enabled for `http://localhost:3000`

### Auth Module

**POST `/auth/login`**

- Request: `{ username: string }`
- Response: `{ token: "mock-jwt-token", user: { username: "Alex Rivera", email: "alex@readinpace.com" } }`
- Always succeeds — no validation, plain mock response

**POST `/auth/logout`**

- Response: `{ success: true }`

**GET `/auth/me`**

- Response: `{ username: "Alex Rivera", email: "alex@readinpace.com" }`
- No real auth check — always returns mock user

### Future-Proofing

- Auth module structure follows NestJS conventions, making it straightforward to swap mock logic for real authentication later
- Controller + Service pattern ensures business logic is testable independently

---

## 4. Dev Workflow

| Command                | What it does                          |
| ---------------------- | ------------------------------------- |
| `npm run dev:frontend` | Starts Nuxt on port 3000              |
| `npm run dev:backend`  | Starts Nest on port 4000 (watch mode) |
| `npm run dev:all`      | Runs both via `concurrently`          |

Root `package.json` scripts:

```json
{
  "scripts": {
    "dev:frontend": "npm run dev --workspace=frontend",
    "dev:backend": "npm run dev --workspace=backend",
    "dev:all": "concurrently \"npm:dev:frontend\" \"npm:dev:backend\""
  }
}
```

---

## 5. Migration Sequence

1. Initialize monorepo: root `package.json` with workspaces, `.gitignore`
2. Scaffold NestJS backend in `backend/` (CLI), create auth module
3. Scaffold Nuxt 3 frontend in `frontend/` (CLI), install modules
4. Port mock data (`src/lib/books.ts`) → `frontend/data/`
5. Port theme/styling (`src/styles.css`) → `frontend/assets/css/main.css`
6. Create Pinia stores (auth, books, dashboard)
7. Migrate pages: Landing → Feed → Book Detail → Dashboard
8. Migrate components (Navbar, BookCard, AdminFab)
9. Add shadcn-vue UI components
10. Wire up Nuxt server proxy to Nest backend auth endpoints
11. Verify each page renders identically

---

## 6. Key Design Decisions

| Decision               | Choice                    | Rationale                                              |
| ---------------------- | ------------------------- | ------------------------------------------------------ |
| Monorepo tooling       | npm workspaces            | Simple, no extra dependency, both projects use npm     |
| Styling                | Tailwind v4 + shadcn-vue  | Preserves current visual identity with minimal changes |
| State management       | Pinia (per-domain stores) | Idiomatic Nuxt 3, replaces React Context               |
| Auth                   | Mock Nest endpoint        | Real API call pattern without real auth complexity     |
| Frontend-backend comms | Nuxt server proxy         | Avoids CORS issues, keeps frontend/backend decoupled   |
| SSR                    | Nuxt SSR (true)           | Matches current SSR behavior of TanStack Start         |
