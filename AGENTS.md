# Read in Peace — AGENTS.md

Consumed by agentic coding tools. Read this before writing or editing code.

## Project structure

Two independent npm packages (no root `package.json` — run commands from each package directory):

- `frontend/` — Nuxt 3 (SSR), Vue 3 Composition API, Pinia, Tailwind CSS v4, shadcn-vue
- `backend/` — NestJS v11 (Express platform), Better Auth, Drizzle ORM, PostgreSQL

Feature modules in backend: `books/`, `transactions/`, `social/`, `membership/`.

## Commands

### Frontend
- `npm run dev` — `nuxt dev` (port 3000)
- `npm run build` — `nuxt build`
- `npm run lint` — ESLint with `@nuxt/eslint` flat config
- `npm run test` — Vitest (not Jest)
- `npm run test:watch` — Vitest watch

### Backend
- `npm run start:dev` — NestJS watch mode (port 4000)
- `npm run build` — `nest build`
- `npm run lint` — ESLint v9 flat config with `--fix` (typescript-eslint + prettier)
- `npm run format` — Prettier write on `src/**/*.ts` and `tests/**/*.ts`
- `npm run test` — Jest unit tests
- `npm run test:watch` / `:cov` / `:debug` / `:e2e`
- `npm run db:migrate` — `drizzle-kit migrate`
- `npm run db:seed` — `ts-node src/core/database/seed.ts`

### Single test (backend)
Jest `rootDir` is `src/`, regex is `.*\.spec\.ts$`:
```bash
npx jest app.controller.spec.ts
npx jest --testPathPattern=auth/policies
npx jest -t "should return Hello World"
```

### Database
```bash
# From backend/:
docker compose up -d
npm run db:migrate
npm run db:seed
```

## Code style

### Vue / Nuxt
- **Always** `<script setup lang="ts">` — no Options API.
- **Nuxt auto-imports**: `ref`, `computed`, `shallowRef`, `watch`, `useRouter`, `useRoute`, `useState`, `useFetch`, `useHead`, `useTemplateRef`, `definePageMeta`, `navigateTo`, `$fetch`, components under `components/`, composables under `composables/`.
- **Explicit imports**: `lucide-vue-next` icons, anything under `utils/`, `types/`, `lib/`, `stores/` — use `~` alias (e.g. `~/stores/cart`). `defineModel<T>('name', ...)` when typing models.
- **Pinia stores**: setup-function syntax `defineStore('name', () => { ... })`. Use `shallowRef` for primitives, `ref` for collections. Store methods use `function` declarations. Expose with `readonly(...)`.
- **Props/emits**: `withDefaults(defineProps<{...}>(), { ... })`, `defineEmits<{ name: [args] }>()`, `defineModel<T>('name', { default: ... })`.
- **Pages**: `definePageMeta({ title, description })`, `useHead({ title: computed(...) })`.
- **Path alias**: `~` for all project imports.
- **Catch blocks**: `catch (err: any)` and read `err?.message`, `err?.data?.message`, `err?.statusCode`.
- **ESLint allows `any`** — `@typescript-eslint/no-explicit-any: off` in config.

### NestJS
- Constructor-based DI with `private readonly`. Repositories injected via `@Inject(TOKEN)`. Tokens are symbols declared in each feature's `domain/` (e.g. `src/books/domain/borrow.ts` for `BORROW_REPOSITORY`).
- **Auth**: `@UseGuards(AuthGuard)`. Ownership: `@UseGuards(AuthGuard, PoliciesGuard)` + `@Policies(CAN_EDIT_BOOK)`. Optional auth: `OptionalAuthGuard` + `@OptionalUser()`.
- Session read from `AuthPort` (Better Auth adapter) — guards are unit-testable.
- Errors: Nest exceptions (`NotFoundException`, etc.). Global `AllExceptionsFilter` in `main.ts`.
- Config: read from `CoreConfigService` (Zod-validated at `src/core/config/env.schema.ts`). Never read `process.env` directly.
- Repositories: interface in `domain/`, Drizzle implementation in `infrastructure/`. Services depend on interfaces.
- Imports: relative paths with `./` prefix; no `@/` alias.

### TypeScript
- `interface` for data models; `type` for unions/aliases.
- `import { ..., type X }` for type-only imports.
- Explicit generics when initializer is empty: `ref<string[]>([])`.
- Explicit return types on exported functions.
- Frontend `tsconfig.json` extends `./.nuxt/tsconfig.json` (Nuxt-generated).
- Backend `tsconfig.json` is standalone (ES2023, nodenext, strict, decorators on).

### Formatting
- Single quotes (`'`), semicolons required, trailing commas, 2-space indent.
- Backend: Prettier (`npm run format`). Frontend: manual (match surrounding style).

### Naming
- `.vue` files: `kebab-case`. `.ts` files: `camelCase`. Components: PascalCase.
- Stores: `camelCase` file, `useXxxStore` export.
- Constants: `camelCase` (no SCREAMING_SNAKE_CASE).
- Component sub-folders match component name (`components/book/BookCard.vue`).

## Project conventions

- Tailwind v4 CSS-first config in `frontend/assets/css/main.css` with `@theme` tokens (OKLCH colors). Dark mode via `.dark` class on `<html>`.
- shadcn-vue components in `components/ui/` follow three-file pattern: `<Name>.vue` + `variants.ts` (CVA) + `index.ts` (barrel). Import `Button` from barrel, `buttonVariants` directly from `variants.ts` for non-button elements.
- `runtimeConfig.public.backendUrl` (default `http://localhost:4000`) is the only way frontend reaches backend.
- Server API proxy at `frontend/server/api/[...].ts` forwards every `/api/*` to NestJS (no versioning).
- Backend API prefix: `/api/`. Stripe webhooks at `/api/stripe/webhook` (raw body preserved via `rawBody: true` in `main.ts`).
- Database: PostgreSQL via `docker-compose.yml`, Drizzle ORM, Better Auth Drizzle adapter. Schema in `src/core/database/schema.ts` (16 tables). Migrations in `src/core/database/migrations/`.
- Payments: Stripe Checkout Sessions (payment mode for purchases, subscription mode for membership). Webhook events processed by `StripeWebhookService` in `membership/application/`.
- Cart: client-side Pinia store (`stores/cart.ts`) with localStorage persistence via `watch(items, persist, { deep: true })`. Discount pipeline (`utils/discount.ts`): quantity tier → category bonus → every $100.
- Auth: `better-auth/vue` provides `useSession()`. Auth store watches it with `immediate: true`. Exposes `signedIn`, `user`, `adminMode` (client-side only).
- Plans: free (15 items), curator ($5/mo, 25 items), archivist ($10/mo, 50 items). Borrow limit enforced by `MembershipService.enforceBorrowLimit()`.
- No commit conventions or CI/CD configured.

## After editing code

Always run `npm run lint` (frontend) or `npm run lint` (backend), then `npm run test`, then `npm run build` to verify changes before committing.
