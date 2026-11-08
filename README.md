# Read in Peace 📚

![Screenshot](frontend/public/Screenshot.png)

Your quiet corner of the internet to discover, borrow, buy, and discuss books — all in one cozy library.

## ✨ What you can do

- **📖 Borrow & Return** — Borrow books for 14 days. Return them when you're done.
- **🛒 Buy & Keep** — Fall in love with a book? Purchase it and build your personal collection.
- **💬 Direct Messages** — Chat with other readers in real time via the collapsible chat modal (Facebook/Twitter style), powered by Socket.IO.
- **📝 Reader Feed** — Share reviews, rate books, reply to posts, and join the conversation.
- **👤 Profiles & Follows** — Visit reader profiles with a radar chart of reading stats. Follow your favorite reviewers.
- **🎟️ Membership Plans** — Free (15 items), Curator ($5/mo, 25 items), and Archivist ($10/mo, 50 items) tiers — each with escalating perks.
- **🏷️ Smart Discounts** — Automatic savings via quantity tiers, category bonuses, $100 thresholds, and membership-plan discounts.
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
| Auth | Better Auth OIDC via Central Identity; no local sign-in |

## 🚀 Quick start

```bash
# Prerequisites: Node.js 20+, Docker, repository and package dependencies installed
npm install
cd frontend && npm ci
cd ../backend && npm ci
cd ..
npm run dev
```

Start Central Identity with `bun run dev`. Ordinary Reading development
needs no Central Identity CA export, browser CA trust, DNS entry, or
`NODE_EXTRA_CA_CERTS`. Central Identity's portal and issuer use
`http://localhost:8080`; Reading's browser origin stays
`http://localhost:3001`, with Nuxt proxying its `/api/*` requests to Nest at
`http://localhost:3000`. Both Reading services bind only to loopback.
Use Central email/password sign-in. Google and GitHub callbacks remain deferred
and unverified for this local HTTP flow; do not rely on them.
Application API requests go to Reading, not through
Central Identity. Register
`http://localhost:3001/api/auth/callback/central-identity` on the development
client. Root startup reuses `backend/docker-compose.yml` and its existing
`pgdata` volume; it does not create or reset the app's local database. Run
migrations and seed only when needed:

```bash
cd backend
npm run db:migrate
npm run db:seed
```

## Independent production deployment

Reading owns its Compose project and database; neutral `sso-edge` owns public Caddy and TLS. Before production use, record PostgreSQL version, exact existing `READING_DB_VOLUME`, users/content, clients, sessions, and a consistent backup; verify an isolated restore. Stop Reading writes and its old PostgreSQL container before mounting that same external volume. Compose refuses a missing volume. Never substitute a volume, run two PostgreSQL owners, seed production, or use `down -v`. Keep protected `.env.production` mode `0600`; never commit plaintext runtime settings. Provider's `docs/production-vm.md` and edge's README contain the complete gated cutover and rollback. DNS, TLS, SMTP, Vercel, backups, and browser SSO require operator verification.

Synthetic standalone rehearsal, from this checkout, requires Docker and a reachable synthetic Central Identity issuer:

```sh
CENTRAL_IDENTITY_ISSUER='<synthetic-issuer>' scripts/production-compose-smoke.sh
```

The smoke uses a disposable Reading volume and real PostgreSQL container, never an operator volume.

## Central Identity local proof

Use the encrypted `backend/.env.development` and `frontend/.env.development`
files, not plaintext `.env` files. The matching `.env.development.example`
files are templates. Each package decrypts only its settings with its own
ignored `.env.keys`; back up both keys outside the repository. Keep the
operator-issued `CENTRAL_IDENTITY_CLIENT_ID` and
`CENTRAL_IDENTITY_CLIENT_SECRET` in encrypted backend settings. Central
Identity's portal and issuer use `http://localhost:8080`; Reading's browser
origin and registered development callback use `http://localhost:3001`:
`http://localhost:3001/api/auth/callback/central-identity`.

For production-mode local proof, configure each package's `.env.test-production`
using its `.env.test-production.example` and a separate ignored
`.env.test-production.keys` key file. Use separate local credentials, test
Stripe keys, and a provisioned test Central Identity client. `npm run dev:prod`
builds and starts both Reading apps with `NODE_ENV=production`, applies
migrations only to its isolated database on host `:5433`, then runs the backend
on `:3100` and frontend on `:3101`. The command does not start an HTTPS gateway:
Central Identity's isolated Caddy serves `:8081` and routes to these Reading
services. The Reading browser origin is `https://reading-test.localhost:8081`,
with issuer `https://auth-test.localhost:8081/api/auth`; register
`https://reading-test.localhost:8081/api/auth/callback/central-identity` on the
isolated Central Identity client.

If these test-production names do not resolve to loopback, add this line to
`/etc/hosts` in WSL and `C:\Windows\System32\drivers\etc\hosts` in Windows
(edit as Administrator):

```text
127.0.0.1 auth-test.localhost bidding-test.localhost reading-test.localhost
```

Verify them in WSL with
`getent ahostsv4 auth-test.localhost bidding-test.localhost reading-test.localhost`
and in Windows PowerShell:

```powershell
'auth-test.localhost','bidding-test.localhost','reading-test.localhost' | ForEach-Object { "$_ $([System.Net.Dns]::GetHostAddresses($_) -join ',')" }
```

Each result must include `127.0.0.1`. Check both environments and the browser
host. Start fresh Reading sessions and update saved links after cutover. The
command never loads `.env.production`, which remains live operator configuration.

Browser smoke: sign in through Book Bidding's header, then open Read in Peace
and select **Sign In**. The second relying party should return from Central
Identity without another credential prompt and create its independent Reading
session. Select **Sign In** in Reading to begin its own OIDC transaction.
When sign-in starts from the library page, callback restores that same safe
local path and query. Sign out from Reading and confirm Book Bidding remains
signed in.
Reading uses its own `reading` Better Auth cookie prefix, separate from other
localhost applications. HTTP development cookies are not marked Secure;
production HTTPS cookies remain Secure.
Existing users with an active Application Session can link Central Identity from
the profile menu. Users without a session use the reviewed recovery screen at
`http://localhost:3001/account/identity`.
They independently prove their existing Reading account with its local password
or its already-linked Google or GitHub account, then authenticate through
Central Identity OIDC. The provider proof must match the provider subject already
stored on that Reading user.
Reading's host-only session cookie remains available on its `localhost` origin;
startup does not clear its session or database.
Recovery only adds the unique Central Identity mapping; it creates no session,
does not enable local login, and does not change the user ID or business data.
After success, start ordinary sign-in through Central Identity.

To enable the recovery callbacks, configure the separately provisioned Central
Identity client with both the ordinary callback and
`http://localhost:3001/api/identity-recovery/callback`. Register
`http://localhost:3001/api/identity-recovery/provider/callback` in
temporary Google/GitHub OAuth clients. Update each external provider's allowed
callback origins in its operator console. Store their separate
`READING_RECOVERY_GOOGLE_*` and `READING_RECOVERY_GITHUB_*` credentials only in
encrypted backend settings. Then apply the schema:

```bash
cd backend
npm run db:migrate
```

For test-production recovery, register
`https://reading-test.localhost:8081/api/identity-recovery/callback` on the
isolated Central Identity client and
`https://reading-test.localhost:8081/api/identity-recovery/provider/callback`
on temporary Google/GitHub OAuth clients. Export the test-production Caddy root
certificate and trust it separately from development; set `NODE_EXTRA_CA_CERTS`
to its absolute path for Node, and trust only that root in the browser before
opening the HTTPS origin. Check discovery at
`https://auth-test.localhost:8081/api/auth/.well-known/openid-configuration`;
its `issuer` must equal `https://auth-test.localhost:8081/api/auth`. Production
requires explicit operator-owned callback URLs and recovery-only Google/GitHub
clients. Disable and revoke those temporary provider clients after the migration
window. Never paste passwords, provider tokens, authorization codes, or client
secrets into logs or support tickets. Matching email alone never links accounts;
any conflicting identity mapping fails closed. Preserve database backups before
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
│   ├── stores/        # Pinia (auth, cart, book status, membership, chat)
│   ├── types/         # TypeScript interfaces
│   └── utils/         # Feed, comment, discount helpers
├── backend/           # NestJS API (port 3000; test-production :3100)
│   └── src/
│       ├── chat/      # Direct messages (WebSocket gateway + service + repository)
│       ├── profiles/  # User profiles, follow system
│       ├── books/     # Book catalog, borrow/purchase
│       ├── social/    # Feed posts, comments, likes
│       ├── membership/# Plans, subscriptions, borrow limits
│       ├── transactions/ # Loans, checkout, purchase confirmation
│       ├── iam/       # Authentication, authorization guards
│       └── core/      # Database, config, logging
└── docs/              # Current workflow and active review/design notes
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

Use encrypted `backend/.env.development` and `frontend/.env.development` for
local development. From the repository root, run `npm run env:decrypt` before
editing and `npm run env:encrypt` before staging. For test-production, create a
separate ignored `.env.test-production.keys` in each package and select
`ENV_FILE=.env.test-production` for these root commands. Keep key files private
and outside Git. Tracked `.env.*.example` files are templates only.

| Package | Key variables |
|---------|--------------|
| `frontend/` | `NUXT_PUBLIC_BACKEND_URL`, `NUXT_PUBLIC_SITE_URL` |
| `backend/` | `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `BETTER_AUTH_URL`, `AUTH_SECRET`, `PORT`, `NODE_ENV`, `LOG_LEVEL`, `CORS_ORIGINS`, `FRONTEND_URL` |

## 🧪 Tests

```bash
# Backend Jest
cd backend && npm run test

# Frontend Vitest
cd frontend && npm run test
```
