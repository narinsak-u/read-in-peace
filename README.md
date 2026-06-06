# Read in Pace

A quiet library to review, borrow, return, and buy books — built with Nuxt 3 + NestJS.

## Stack

- **Frontend:** Nuxt 3 (SSR), Vue 3 Composition API, Pinia, Tailwind CSS v4, shadcn-vue
- **Backend:** NestJS v11 (Express), Better Auth, Drizzle ORM, PostgreSQL
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

### Credentials

| Email | Password | Role |
|---|---|---|
| `seed@readinpace.com` | `seed123` | Default user |
| `admin@gmail.com` | `123456789` | Registered user (toggle admin mode) |

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
