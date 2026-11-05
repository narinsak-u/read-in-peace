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
# Prerequisites: Node.js 20+, Docker, repository and package dependencies installed
npm install
cd frontend && npm ci
cd ../backend && npm ci
cd ..

# Start Central Caddy first; export its root.crt as described in the Central README.
NODE_EXTRA_CA_CERTS="$(realpath ../book-auth-middleware/central-identity-root.crt)" npm run dev
```

The HTTPS browser origin is `https://reading.lvh.me:8080` through the Central
Identity Caddy proxy. Trust Caddy's local root certificate before testing.
Nest needs the absolute `NODE_EXTRA_CA_CERTS` path to fetch Central's OIDC
discovery document from either subpackage directory.
Root startup reuses `backend/docker-compose.yml` and its existing `pgdata`
volume; it does not create or reset the app's local database. Run migrations
and seed only when needed:

```bash
cd backend
npm run db:migrate
npm run db:seed
```

## Central Identity local proof

Use the encrypted `backend/.env.development` and `frontend/.env.development`
files, not plaintext `.env` files. The matching `.env.development.example`
files are templates. Each package decrypts only its settings with its own
ignored `.env.keys`; back up both keys outside the repository. Keep the
operator-issued `CENTRAL_IDENTITY_CLIENT_ID` and
`CENTRAL_IDENTITY_CLIENT_SECRET` in encrypted backend settings. The issuer is
`https://auth.127.0.0.1.nip.io:8080`; the registered callback is
`https://reading.lvh.me:8080/api/auth/callback/central-identity`.

For production-mode local proof, configure and encrypt each package's
`.env.test-production` using its `.env.test-production.example`. Use separate
local credentials, test Stripe keys, and a provisioned test Central Identity
client. `npm run dev:prod` builds and starts both apps with `NODE_ENV=production`,
applies migrations only to its isolated database on host `:5433`, then runs the
backend on `:3100`, frontend on `:3101`, and HTTPS gateway on `:8081`. The callback is
`https://reading-test.lvh.me:8081/api/auth/callback/central-identity`. It never
loads `.env.production`, which remains live operator configuration.

Browser smoke: sign into Central Identity via Book Bidding, then open
Read in Peace and choose **Continue with Central Identity**. It should return
to Reading without another password prompt and create an independent Reading
session. When sign-in is requested from the protected library page, Read in
Peace returns to that same local path and query after the callback; direct
sign-in without a requested destination returns to the site origin. Sign out
from Reading and confirm Book Bidding remains signed in.

To keep an existing Reading profile and memberships, first sign in with its
local credentials, open **Central Identity link** from the profile menu, and
authenticate with Central Identity. Later OIDC sign-ins return to that same
Reading user even when the two email addresses differ. Matching email alone
never links accounts. If either proof is missing or an identity is already
linked elsewhere, stop and request reviewed recovery instead of creating a
replacement account.

**Sign out of Read in Peace** ends only its Application Session; Book Bidding
and the Central SSO Session remain active. **Manage Central Identity / sign out
centrally** opens the provider page (`NUXT_PUBLIC_CENTRAL_IDENTITY_URL`), where
**Sign out of Central Identity** ends only the Central SSO Session. Existing
Application Sessions remain usable until separately ended or expired.
For provider callbacks, Caddy trust, local client provisioning, and the
three-host browser flow, follow the sibling provider's
[Development SSO workflow](../book-auth-middleware/docs/local-oauth-sso.md).

## 📁 Project structure

```
read-in-peace/
├── frontend/          # Nuxt 3 app (port 3001; HTTPS gateway :8080)
│   ├── components/    # Vue components (chat/, profile/, social/, reviews/, browse/, auth/, ui/)
│   ├── composables/   # useChat*, useConversations, useProfile, useFollow, useFeed, etc.
│   ├── pages/         # File-based routing
│   ├── stores/        # Pinia (auth, cart, chat)
│   ├── types/         # TypeScript interfaces
│   └── utils/         # Feed, comment, discount helpers
├── backend/           # NestJS API (port 3000; test-production :3100)
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
