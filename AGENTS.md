# Read in Peace — AGENTS.md

Consumed by agentic coding tools (Claude Code, Gemini CLI, Cursor, etc.). Read this
before writing or editing code so conventions, commands, and constraints stay
consistent across the monorepo.

## Project overview

Monorepo with two npm packages (no root `package.json` — run commands per-package
or via `npm -w <workspace> <script>`):
- `frontend/` — Nuxt 3 (SSR), Vue 3 Composition API, Pinia, Tailwind CSS v4, shadcn-vue
- `backend/` — NestJS v11 (Express platform), Better Auth, Drizzle ORM, PostgreSQL

## Commands

### Frontend (run from `frontend/` or `npm -w frontend <script>`)
- `npm run dev` — `nuxt dev` (port 3000)
- `npm run build` — `nuxt build`
- `npm run generate` — static export (`nuxt generate`)
- `npm run preview` — `nuxt preview`
- No lint, test, or format scripts — Prettier/ESLint are not configured. Match the
  surrounding code style manually.

### Backend (run from `backend/` or `npm -w backend <script>`)
- `npm run start:dev` — NestJS watch mode (port 4000)
- `npm run build` — `nest build`
- `npm run lint` — ESLint v9 flat config with `--fix` baked in
  (typescript-eslint + prettier)
- `npm run format` — Prettier write on `src/**/*.ts` and `test/**/*.ts`
- `npm run test` — Jest unit tests
- `npm run test:watch` — Jest watch
- `npm run test:cov` — Jest with coverage
- `npm run test:debug` — Jest with Node inspector
- `npm run test:e2e` — E2E tests (`test/`, uses `jest-e2e.json`)
- `npm run db:migrate` — `drizzle-kit migrate` from `src/db/migrations/`
- `npm run db:seed` — seed with `ts-node src/db/seed.ts`

### Running a single test (backend)
Jest's `rootDir` is `src/` and the regex is `.*\.spec\.ts$`, so paths in CLI
invocations are relative to `src/`. From `backend/`:
```bash
npx jest app.controller.spec.ts                    # one file
npx jest --testPathPattern=app.controller           # by name fragment
npx jest --testPathPattern=auth/policies            # by directory
npx jest -t "should return Hello World"            # by test name
npx jest src/auth/auth.guard.spec.ts                # absolute-from-rootDir path also works
```

### Database setup (first time)
```bash
# From backend/:
docker compose up -d   # PostgreSQL (see backend/docker-compose.yml)
npm run db:migrate
npm run db:seed
```

## Code style

### Vue / Nuxt (frontend)
- **Always** use `<script setup lang="ts">` — never Options API.
- **Nuxt auto-imports** (do NOT import manually): `ref`, `computed`, `useRouter`,
  `useRoute`, `useState`, `useFetch`, `useHead`, `useTemplateRef`,
  `definePageMeta`, `defineEventHandler`, `readBody`, `useRuntimeConfig`,
  `NuxtLink`, `NuxtLayout`, `NuxtPage`, `navigateTo`, `$fetch`, plus components
  under `components/` and composables under `composables/`.
- **Explicit imports** required for: `lucide-vue-next` icons, `shallowRef`/`watch`
  from `vue`, `defineModel` (when typing models), and anything under `utils/`,
  `types/`, `lib/`, `stores/` — use the `~` alias (e.g. `~/stores/cart`).
- `shadcn-vue` button convention lives in `components/ui/<name>/` with three
  files: `<Name>.vue`, `variants.ts` (CVA), `index.ts` (barrel re-export).
  Import `Button` from the barrel, but `buttonVariants` directly from
  `~/components/ui/button/variants` so non-button elements can reuse it.
- **Pinia stores** use setup-function syntax: `defineStore('name', () => { ... })`.
  Use `shallowRef` for primitive state (`boolean`, `string`, simple objects) and
  `ref` only for collections that need deep reactivity (e.g. `items: ref<T[]>([])`).
  Expose internals wrapped in `readonly(...)` when consumers must not mutate.
  Store methods use `function` declarations (not arrows).
- **Props**: `withDefaults(defineProps<{...}>(), { ... })` for defaults; use
  `defineModel<T>('name', { default: ... })` for `v-model` props; declare emits
  with `defineEmits<{ name: [args] }>()`.
- **Pages**: every page sets `definePageMeta({ title, description, layout })`.
  Use `useHead({ title: computed(() => ...) })` for dynamic per-data titles.
- **Composables** live in `frontend/composables/` and are auto-imported. State
  shared across components uses `useState<T>('key', init)` (e.g. `useFlash`).
- **Path alias**: `~` for all project imports — no `../../` chains.
- **Catch blocks**: prefer `catch (err: any)` and read `err?.message`,
  `err?.data?.message`, `err?.statusCode` (H3/Nuxt `$fetch` errors).

### NestJS (backend)
- Standard decorators: `@Controller()`, `@Get/@Post/@Put/@Delete()`,
  `@Injectable()`, `@Module()`. Use `@UseGuards(...)`, `@Body()`, `@Query()`,
  `@Param()`, `@CurrentUser()`.
- **Constructor-based DI** with `private readonly`. Repositories are injected
  via `@Inject(TOKEN) readonly foo: FooRepo` using symbol tokens declared in
  `src/repositories/tokens.ts` (e.g. `BOOK_REPO`, `LIKE_REPO`).
- **Auth**: protected routes use `@UseGuards(AuthGuard)`. Ownership checks add
  `@UseGuards(AuthGuard, PoliciesGuard)` + `@Policies(CAN_EDIT_BOOK)`. Optional
  auth uses `OptionalAuthGuard` + `@OptionalUser()`. The session is read from
  the `AuthPort` (Better Auth adapter) so guards are unit-testable with fakes.
- **Errors**: throw Nest exceptions (`NotFoundException`, `UnauthorizedException`,
  …). A global `AllExceptionsFilter` is registered in `main.ts`.
- **Imports**: relative paths with `./` prefix; `@/` alias is not used.
- **Config**: read from `ConfigService` (Zod-validated in
  `src/config/env.schema.ts`); never read `process.env` directly.
- **Repositories** are interfaces in `src/repositories/interfaces/`, with
  Drizzle implementations in `repositories/drizzle/` and fakes in
  `repositories/fakes/`. Services depend on interfaces, not Drizzle.

### TypeScript
- `interface` for data models; `type` only for unions/aliases.
- `import { ..., type X }` for type-only imports.
- Explicit generic on `ref`/`shallowRef`/`computed` when the initialiser is
  empty: `ref<string[]>([])`, `shallowRef<User | null>(null)`.
- Explicit return types on exported functions and class methods.
- `any` is allowed (ESLint `@typescript-eslint/no-explicit-any: off`) — use it
  in catch blocks and third-party shims without ceremony.
- Frontend `tsconfig.json` extends `./.nuxt/tsconfig.json` (Nuxt-generated);
  backend `tsconfig.json` is standalone (ES2023, nodenext, strict, decorators on).
- Avoid `satisfies` in `.vue` files; it is fine in backend config.

### Formatting (Prettier on backend, manual on frontend)
- Single quotes (`'`), never double quotes. (Some shadcn-vue generated files
  use double quotes — match the surrounding file rather than mass-converting.)
- Semicolons required.
- Trailing commas everywhere.
- 2-space indentation.
- ESLint sets `prettier/prettier: ["error", { endOfLine: "auto" }]`.

### Naming
- **Files**: `kebab-case` for `.vue` components, `camelCase` for `.ts` files.
  Component sub-folders match the component name (`components/book/BookCard.vue`).
- **Components**: PascalCase. **Stores**: `camelCase` file, `useXxxStore` export.
- **Variables/functions**: `camelCase`. **Types/interfaces**: PascalCase.
  **Constants**: `camelCase` (no SCREAMING_SNAKE_CASE).
- **Pinia store methods**: `function` declarations.

### Error handling
- **Backend**: NestJS exceptions + global `AllExceptionsFilter`; pino for logs.
- **Frontend**: no error boundaries; guard with `v-if`/`v-else` for missing data
  (see `pages/book/[id].vue`) or use `error.vue` for fatal 404/500s.
- **Server routes**: `defineEventHandler(async (event) => { ... })` wrapping
  `proxyRequest` to forward to the NestJS backend (see
  `frontend/server/api/[...].ts`); catch proxy failures and rethrow as
  `createError({ statusCode: 502, message: 'Backend unavailable' })`.
- **Early returns** for guard clauses: `if (!draft.value.trim()) return`.

## Project conventions

- Tailwind v4 CSS-first config in `frontend/assets/css/main.css` with `@theme`
  tokens (OKLCH colors). Dark mode toggled via the `.dark` class on `<html>`.
- shadcn-vue components live in `components/ui/`. New shadcn-vue components must
  follow the `Component.vue` + `variants.ts` + `index.ts` three-file pattern.
- `runtimeConfig.public.backendUrl` (default `http://localhost:4000`) in
  `nuxt.config.ts` is the only way the browser-side code reaches the backend;
  server-side code uses the same value via `useRuntimeConfig().public.backendUrl`
  inside the `server/api/[...].ts` proxy.
- Server API proxy at `frontend/server/api/[...].ts` forwards every `/api/*`
  request to the NestJS backend. There is no separate `/api/v1` versioning.
- Database: PostgreSQL via `backend/docker-compose.yml`, Drizzle ORM, Better Auth
  with the Drizzle adapter. Schema lives in `backend/src/db/schema.ts`; generated
  migrations in `backend/src/db/migrations/`. Repositories are interface-based
  for testability.
- Payments: Stripe Checkout Sessions created by `transactions.service.ts`.
- Cart: client-side Pinia store (`stores/cart.ts`) with manual localStorage
  persistence via `watch(items, persist, { deep: true })`. The discount pipeline
  (`utils/discount.ts`) runs 3 stages: quantity tier, category bonus, every $100.
- Auth: `better-auth/vue` provides a reactive `useSession()`; the auth store
  watches it with `immediate: true` and exposes `signedIn`, `user`, `adminMode`.
  Admin mode is a client-side toggle (no server enforcement yet).
- No commit conventions or CI/CD are configured yet.
