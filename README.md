# Read in Peace 📚

![Screenshot](frontend/public/Screenshot.png)

Your quiet corner of the internet to discover, borrow, buy, and discuss books — all in one cozy library.

## ✨ What you can do

- **📖 Borrow & Return** — Grab books from the library for 7–30 days depending on your plan. Return them when you're done.
- **🛒 Buy & Keep** — Fall in love with a book? Purchase it and build your personal collection.
- **💬 Direct Messages** — Chat with other readers in real time via the collapsible chat modal (Facebook/Twitter style), powered by Socket.IO.
- **📝 Reader Feed** — Share reviews, rate books, reply to posts, and join the conversation.
- **👤 Profiles & Follows** — Visit reader profiles with a radar chart of reading stats. Follow your favorite reviewers.
- **🎟️ Membership Plans** — Free (15 items), Curator ($5/mo, 25 items), and Archivist ($10/mo, 50 items) tiers — each with escalating perks.
- **🏷️ Smart Discounts** — Automatic savings via a 3-stage discount pipeline: quantity tiers (up to 30% off), category bonuses, and $100 thresholds.
- **🛍️ Client-side Cart** — Cart persists across sessions and merges with your account on sign-in. Live discount previews as you shop.
- **💳 Stripe Checkout** — Secure payments for purchases and subscriptions via Stripe Checkout Sessions.
- **🌙 Dark Mode** — Respects your system preference with a `.dark` class toggle.

## 🧱 Stack

| Layer | Tech |
|-------|------|
| Frontend | Nuxt 3 (SSR), Vue 3 Composition API, Pinia, Tailwind CSS v4, shadcn-vue, Chart.js, Socket.IO Client |
| Backend | NestJS v11 (Express), Better Auth, Drizzle ORM, Socket.IO |
| Database | PostgreSQL (Docker) |
| Payments | Stripe Checkout Sessions |
| Auth | Better Auth (email/password) |

## 🚀 Quick start

```bash
# Prerequisites: Node.js 20+, Docker

# Start PostgreSQL
docker compose up -d

# Backend
cd backend
npm install
npm run db:migrate
npm run db:seed
npm run start:dev          # → http://localhost:4000

# Frontend (in a second terminal)
cd frontend
npm install
npm run dev                # → http://localhost:3000
```

## Central Identity local proof

For the cross-site SSO proof, use the local HTTPS host `https://reading.lvh.me`
through the Central Identity Caddy proxy. Trust Caddy's local root certificate
in the browser before testing. The proxy forwards this host to the Nuxt dev
server on port 3000; PostgreSQL is started reproducibly with `docker compose up -d`.

Copy `backend/.env.example` to `backend/.env` and fill in the operator-issued
`CENTRAL_IDENTITY_CLIENT_ID` and `CENTRAL_IDENTITY_CLIENT_SECRET`. The issuer is
`https://auth.127.0.0.1.nip.io/api/auth`; its confidential client callback is
`https://reading.lvh.me/api/auth/callback/central-identity`. Keep `.env` files
private and do not commit client credentials. Run backend migrations and start
the backend, then start Nuxt with `frontend/.env.example` copied to
`frontend/.env` and `NUXT_PUBLIC_SITE_URL=https://reading.lvh.me`.

Browser smoke: sign into Central Identity via Book Bidding, then open
Read in Peace and choose **Continue with Central Identity**. It should return
to Reading without another password prompt and create an independent Reading
session. Sign out from Reading and confirm Book Bidding remains signed in.

To keep an existing Reading profile and memberships, first sign in with its
local credentials, open **Central Identity link** from the profile menu, and
authenticate with Central Identity. Later OIDC sign-ins return to that same
Reading user even when the two email addresses differ. Matching email alone
never links accounts. If either proof is missing or an identity is already
linked elsewhere, stop and request reviewed recovery instead of creating a
replacement account.

## 📁 Project structure

```
read-in-peace/
├── frontend/          # Nuxt 3 app (Port 3000)
│   ├── components/    # Vue components (chat/, profile/, social/, reviews/, browse/, auth/, ui/)
│   ├── composables/   # useChat*, useConversations, useProfile, useFollow, useFeed, etc.
│   ├── pages/         # File-based routing
│   ├── stores/        # Pinia (auth, cart, chat)
│   ├── types/         # TypeScript interfaces
│   └── utils/         # Feed, comment, discount helpers
├── backend/           # NestJS API (Port 4000)
│   └── src/
│       ├── chat/      # Direct messages (WebSocket gateway + service + repository)
│       ├── profiles/  # User profiles, follow system
│       ├── books/     # Book catalog, borrow/purchase
│       ├── social/    # Feed posts, comments, likes
│       ├── membership/# Plans, subscriptions, borrow limits
│       ├── transactions/ # Checkout, Stripe integration
│       ├── iam/       # Authentication, authorization guards
│       └── core/      # Database, config, logging
└── docs/              # Specs and implementation plans
```

## ⚙️ Commands

Each package is independent — run commands from its directory.

### Backend (`cd backend`)

```bash
npm run start:dev       # Watch mode
npm run test            # Jest unit tests
npm run test:cov        # With coverage
npm run lint            # ESLint with fix
npm run format          # Prettier
npm run db:migrate      # Run Drizzle migrations
npm run db:seed         # Seed database
npm run build           # Production build
```

### Frontend (`cd frontend`)

```bash
npm run dev             # Nuxt dev server
npm run test            # Vitest unit tests
npm run lint            # ESLint
npm run build           # Production build
```

## 🔐 Environment

Copy `.env.example` from each package to `.env` and fill in the values.

| Package | Key variables |
|---------|--------------|
| `frontend/` | `NUXT_PUBLIC_BACKEND_URL`, `NUXT_PUBLIC_SITE_URL` |
| `backend/` | `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `BETTER_AUTH_URL`, `AUTH_SECRET`, `PORT`, `NODE_ENV`, `LOG_LEVEL`, `CORS_ORIGINS`, `FRONTEND_URL` |

## 🧪 Tests

```bash
# Backend — 144 tests
cd backend && npm run test

# Frontend — 107 tests
cd frontend && npm run test
```
