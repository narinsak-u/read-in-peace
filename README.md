# Read in Peace

![Screenshot](frontend/public/Screenshot.png)

A quiet library to review, borrow, return, and buy books — built with Nuxt 3 + NestJS.

## Key features

- **Borrow & return** — Browse the library, borrow books for 7–30 days depending on your plan, return when you're done
- **Buy & keep** — Purchase books you love and build your personal library
- **Discount pipeline** — Automatic quantity tiers (up to 30% off), category bonuses, and every-$100 savings
- **Reader feed** — Share reviews, rate books, and discuss with other readers
- **Membership plans** — Free, Curator, and Archivist tiers with escalating borrow limits and discounts
- **Client-side cart** — localStorage-persisted cart with live discount previews and guest cart merge on sign-in
- **Stripe checkout** — Secure payments via Stripe Checkout Sessions
- **Book club** — Comming soon!

## Stack

- **Frontend:** Nuxt 3 (SSR), Vue 3 Composition API, Pinia, Tailwind CSS v4, shadcn-vue
- **Backend:** NestJS v11 (Express), Better Auth, Drizzle ORM, PostgreSQL
- **Cart:** Client-side Pinia store persisted to localStorage
- **Discounts:** 3-stage pipeline (quantity tier, category bonus, every $100)
- **Payments:** Stripe Checkout Sessions

## Quick start

```bash
# Prerequisites: Node.js 20+, Docker (PostgreSQL)

# Install dependencies
npm install

# Start PostgreSQL
docker compose up -d

# Push DB schema and seed data
npm run -w backend db:push
npm run -w backend db:seed

# Start development (frontend :3000 + backend :4000)
npm run dev:all
```

## Packages

| Package | Description | Port |
|---|---|---|
| `frontend/` | Nuxt 3 SSR application | 3000 |
| `backend/` | NestJS REST API | 4000 |

## Commands

```bash
npm run dev:all        # Run both packages
npm run dev:frontend   # Nuxt dev server only
npm run dev:backend    # NestJS watch mode only
```

See `frontend/README.md` and `backend/README.md` for package-specific commands.

## Environment

Copy `.env.example` from each package to `.env` and fill in the values.

| Package | Key variables |
|---------|--------------|
| `frontend/` | `NUXT_PUBLIC_BACKEND_URL`, `NUXT_PUBLIC_SITE_URL` |
| `backend/` | `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `BETTER_AUTH_URL`, `AUTH_SECRET`, `PORT`, `NODE_ENV`, `LOG_LEVEL`, `CORS_ORIGINS`, `FRONTEND_URL` |
