# Read in Pace — AGENTS.md

This file is consumed by agentic coding tools (Claude Code, Gemini CLI, Cursor, etc.).
Use it to understand the project conventions before writing or editing code.

## Project overview

Monorepo (npm workspaces) with two packages:
- `frontend/` — Nuxt 3 (SSR), Vue 3 Composition API, Pinia, Tailwind CSS v4, shadcn-vue
- `backend/` — NestJS v11 (Express platform), Jest

## Commands

### Root
- `npm run dev:all` — Run frontend + backend concurrently
- `npm run dev:frontend` — Nuxt dev server (port 3000)
- `npm run dev:backend` — NestJS watch mode (port 4000)

### Frontend (run from `frontend/` or via `--workspace=frontend`)
- `npm run dev` — `nuxt dev`
- `npm run build` — `nuxt build`
- `npm run generate` — `nuxt generate` (static export)
- `npm run preview` — `nuxt preview`
- No lint, test, or format commands exist for the frontend

### Backend (run from `backend/` or via `--workspace=backend`)
- `npm run build` — `nest build`
- `npm run lint` — ESLint v9 flat config (typescript-eslint + prettier)
- `npm run format` — Prettier (`singleQuote: true`, `trailingComma: "all"`)
- `npm run test` — Jest unit tests (`*.spec.ts`)
- `npm run test:watch` — Jest watch mode
- `npm run test:cov` — Jest with coverage
- `npm run test:e2e` — E2E tests (`test/`, uses `jest-e2e.json`)

### Running a single test (backend)
```bash
# From backend/ directory:
npx jest src/app.controller.spec.ts
npx jest --testPathPattern="app.controller"
npx jest -t "should return Hello World"
```

## Code style

### Vue / Nuxt (frontend)
- Composition API with `<script setup lang="ts">` — never Options API
- Nuxt auto-imports: `ref`, `computed`, `useRouter`, `useRoute`, `definePageMeta`, `defineEventHandler`, `readBody`, `useRuntimeConfig`, `NuxtLink`, `NuxtLayout`, `NuxtPage`, `$fetch` — do NOT import these manually
- `lucide-vue-next` icons are explicit imports (not auto-imported): `import { ArrowRight } from 'lucide-vue-next'`
- Components from `components/` are auto-imported by Nuxt — no manual import needed
- Pinia stores use setup-function syntax: `defineStore('name', () => { ... })`
- Store access: `const store = useXxxStore()` at top of `<script setup>`
- Use `withDefaults(defineProps<{...}>(), { ... })` for props with defaults
- Use `definePageMeta({ title, description })` in every page for SEO
- Path alias `~` for all project imports (`~/stores/auth`, `~/components/BookCard.vue`) — no relative `../../` imports

### NestJS (backend)
- Standard NestJS decorators: `@Controller()`, `@Get()`, `@Injectable()`, `@Module()`
- Constructor-based dependency injection
- Relative imports using `./` prefix
- Single-quote strings throughout

### TypeScript
- `interface` for data models (not `type`)
- `type` imports use `import { ..., type X }` syntax
- Explicit generic types on `ref`: `ref<string[]>([])`, `ref<boolean>(false)`
- Explicit return types on functions and methods
- `any` is allowed (`@typescript-eslint/no-explicit-any: off` on backend)
- Shared base config in `tsconfig.base.json` (ES2022, ESNext modules, Bundler resolution, strict)
- No `satisfies` in Vue files (used in tailwind config only)

### Formatting (enforced by Prettier on backend, follow manually on frontend)
- Single quotes (`'`), never double quotes
- Semicolons required
- Trailing commas everywhere (objects, arrays, function params)
- 2-space indentation
- No `endOfLine` preference (set to `auto` in ESLint config)

### Naming conventions
- **Files:** `kebab-case` for `.vue` components, `camelCase` for `.ts` files
- **Components:** PascalCase (`BookCard.vue`, `AdminFab.vue`, `Navbar.vue`)
- **Stores:** `camelCase` filenames, `useXxxStore` export names
- **Variables/functions:** `camelCase`
- **Types/interfaces:** PascalCase
- **Constants:** `camelCase` (no screaming snake case)
- **Pinia store methods:** `function` declarations (not arrow functions)

### Error handling
- Backend: NestJS exception filters + standard try/catch (when added)
- Frontend: No error boundaries currently; guard with `v-if` / `v-else` for missing data
- Server routes: `defineEventHandler(async (event) => { ... })` with `fetch` to backend
- Early returns for guard clauses: `if (!draft.value.trim()) return`

### Git
- No commit conventions enforced yet
- No CI/CD pipelines exist

## Project conventions

- `tailwind.config.ts` in `frontend/` uses OKLCH color tokens via CSS custom properties in `main.css`
- Dark mode via `.dark` class on `<html>` (handled by `darkMode: "class"` in tailwind config)
- shadcn-vue components go in `components/ui/`
- `backendUrl` is configured via `runtimeConfig.public.backendUrl` in `nuxt.config.ts`
- Server API proxy in `server/api/auth/[...].ts` proxies `/api/auth/*` to NestJS backend
- No database yet — backend uses in-memory mock data; frontend uses mock data in `data/books.ts`
