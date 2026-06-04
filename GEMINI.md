# Read in Pace — GEMINI.md

This file provides instructional context for Gemini CLI and other AI agents. It outlines project architecture, tech stack, commands, and development conventions.

## Project Overview

"Read in Pace" is a web application for book enthusiasts to read reviews, borrow, return, and purchase books. The project was recently migrated from a React monolith to a monorepo using Nuxt 3 and NestJS.

### Architecture
- **Structure:** Monorepo with `frontend/` and `backend/` packages.
- **Frontend:** Nuxt 3 (SSR), Vue 3 Composition API, Pinia, Tailwind CSS v4, shadcn-vue.
- **Backend:** NestJS v11 (Express platform), Jest.

## Building and Running

The project is divided into two main directories. Note that a root `package.json` with workspace-wide commands may be missing; run commands from the respective directories.

### Backend
Navigate to the `backend/` directory:
- `npm install` — Install dependencies.
- `npm run start:dev` — Start the NestJS server in watch mode (Port 4000).
- `npm run build` — Build the project.
- `npm run lint` — Run ESLint with auto-fix (enforces single quotes, semicolons, and trailing commas).
- `npm run format` — Run Prettier.
- `npm run test` — Run unit tests (`*.spec.ts`).
- `npm run test:e2e` — Run end-to-end tests using `jest-e2e.json`.

### Frontend
Navigate to the `frontend/` directory:
- `npm install` — Install dependencies.
- `npm run dev` — Start the Nuxt dev server (Port 3000).
- `npm run build` — Build for production.
- `npm run generate` — Static site generation.
- `npm run preview` — Preview the production build.

## Development Conventions

### Vue / Nuxt (Frontend)
- **Composition API:** Always use `<script setup lang="ts">`.
- **Auto-imports:** Leverage Nuxt auto-imports for Vue APIs (`ref`, `computed`, etc.), stores, and components. Do NOT import these manually.
- **Icons:** Use `lucide-vue-next` (explicit imports required).
- **State Management:** Pinia stores using the setup-function syntax.
- **SEO:** Use `definePageMeta` in page components for metadata.
- **Path Aliases:** Use `~` for all project imports (e.g., `~/stores/auth`). Avoid relative `../../` imports.

### NestJS (Backend)
- **Decorators:** Follow standard NestJS patterns (`@Controller()`, `@Injectable()`, etc.).
- **DI:** Use constructor-based dependency injection.
- **Imports:** Prefer relative imports with `./` prefix.

### TypeScript
- **Interfaces:** Use `interface` for data models.
- **Strict Typing:** Provide explicit return types and generic types for `ref` (e.g., `ref<string>('')`).
- **Imports:** Use `import { ..., type X }` for type-only imports.

### Formatting & Style
- **Quotes:** Single quotes (`'`) for strings.
- **Semicolons:** Required.
- **Indentation:** 2 spaces.
- **Trailing Commas:** Enforced in objects, arrays, and function parameters.
- **Naming:**
    - Files: `kebab-case` for `.vue`, `camelCase` for `.ts`.
    - Components: `PascalCase` (e.g., `BookCard.vue`).
    - Stores: `camelCase` filenames, `useXxxStore` exports.

## Project Notes
- **API Interaction:** The frontend communicates with the backend via a server proxy in `frontend/server/api/auth/[...].ts` which forwards requests to the NestJS backend on Port 4000.
- **Mock Data:** Currently, the project uses in-memory mock data on the backend and static mock data in `frontend/data/books.ts`.
- **Admin Features:** Admin mode is toggled via the `auth` store, enabling the `AdminFab` component and book editing features.
