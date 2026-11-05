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

Browser smoke: sign in through Book Bidding's header, then open Read in Peace
and select **Sign In**. The second relying party should return from Central
Identity without another credential prompt and create its independent Reading
session. Select **Sign In** in Reading to begin its own OIDC transaction.
When sign-in starts from the library page, callback restores that same safe
local path and query. Sign out from Reading and confirm Book Bidding remains
signed in.
Existing users with an active Application Session can link Central Identity from
the profile menu. Users without a session use the reviewed recovery screen at
`https://reading.lvh.me:8080/account/identity`. They independently prove their
existing Reading account with its local password or its already-linked Google
or GitHub account, then authenticate through Central Identity OIDC. The provider
proof must match the provider subject already stored on that Reading user.
Recovery only adds the unique Central Identity mapping; it creates no session,
does not enable local login, and does not change the user ID or business data.
After success, start ordinary sign-in through Central Identity.

To enable the recovery callbacks, configure the separately provisioned Central
Identity client with both the ordinary callback and
`https://reading.lvh.me:8080/api/identity-recovery/callback`. Register
`https://reading.lvh.me:8080/api/identity-recovery/provider/callback` in
temporary Google/GitHub OAuth clients. Store their separate
`READING_RECOVERY_GOOGLE_*` and `READING_RECOVERY_GITHUB_*` credentials only in
encrypted backend settings. Then apply the schema:

```bash
cd backend
npm run db:migrate
```

For test-production, provision matching callback URLs on its isolated clients
and use `https://reading-test.lvh.me:8081` instead. Production requires explicit
operator-owned callback URLs and recovery-only Google/GitHub clients. Disable
and revoke those temporary provider clients after the migration window. Never
paste passwords, provider tokens, authorization codes, or client secrets into
logs or support tickets. Matching email alone never links accounts; any
conflicting identity mapping fails closed. Preserve database backups before
migration and do not delete or merge Application Users.

**Sign out of Read in Peace** ends only its Application Session. The Central
SSO Session and Book Bidding's Application Session remain active. Ending the
Central SSO Session does not invalidate existing Application Sessions; sign out
from Central Identity using its own portal controls.
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
