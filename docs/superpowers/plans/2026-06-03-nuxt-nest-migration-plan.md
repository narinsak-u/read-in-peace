# Read in Peace — Nuxt/Nest Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the existing TanStack React monolith to a Nuxt 3 SSR frontend + NestJS backend with mock data, preserving all existing functionality and visual design.

**Architecture:** npm workspaces monorepo with `frontend/` (Nuxt 3) and `backend/` (NestJS). Frontend uses Pinia stores per domain, shadcn-vue + Tailwind v4 styling. Backend provides mock auth API. All state stays client-side mock except auth which calls the backend.

**Tech Stack:** Nuxt 3 (SSR), Vue 3 Composition API, Pinia, shadcn-vue, Tailwind CSS v4, NestJS, npm workspaces

**Pre-flight:** Ensure Node.js 18+ and npm 9+ are installed. The existing project at `D:\Github\read-in-pace` is the root.

---

### Task 1: Initialize root monorepo

**Files:**

- Create: `package.json` (replace existing)
- Modify: `.gitignore`
- Create: `tsconfig.base.json`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "read-in-pace",
  "private": true,
  "type": "module",
  "workspaces": ["frontend", "backend"],
  "scripts": {
    "dev:frontend": "npm run dev --workspace=frontend",
    "dev:backend": "npm run dev --workspace=backend",
    "dev:all": "concurrently \"npm:dev:frontend\" \"npm:dev:backend\""
  },
  "devDependencies": {
    "concurrently": "^9.1.0"
  }
}
```

- [ ] **Step 2: Update .gitignore**

Replace `.gitignore` contents:

```
node_modules
dist
dist-ssr
.output
*.local

# Nuxt
.nuxt

# Nest
dist/

# Editor
.vscode/*
!.vscode/extensions.json
.idea
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# OS
.DS_Store
Thumbs.db
```

- [ ] **Step 3: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

- [ ] **Step 4: Remove old files no longer needed**

Keep the root `docs/` folder. The `src/`, `vite.config.ts`, `components.json`, `eslint.config.js`, `.prettierrc`, `.prettierignore`, `bun.lock`, `bunfig.toml` are all from the old TanStack project.

Delete or archive these old files (they'll be in git history):

- Remove `src/`, `vite.config.ts`, `components.json`, `eslint.config.js`, `.prettierrc`, `.prettierignore`, `bun.lock`, `bunfig.toml`

- [ ] **Step 5: Commit**

```bash
git add package.json .gitignore tsconfig.base.json
git rm -r src/ vite.config.ts components.json eslint.config.js .prettierrc .prettierignore bun.lock bunfig.toml 2>/dev/null || true
git commit -m "feat: init monorepo with npm workspaces"
```

---

### Task 2: Scaffold NestJS backend with auth module

**Files:**

- All files under `backend/` created by Nest CLI
- Create: `backend/src/auth/auth.module.ts`
- Create: `backend/src/auth/auth.controller.ts`
- Create: `backend/src/auth/auth.service.ts`
- Modify: `backend/src/app.module.ts`
- Modify: `backend/src/main.ts`

- [ ] **Step 1: Scaffold NestJS project**

```bash
npx @nestjs/cli@latest new backend --package-manager npm --skip-git --skip-install
```

Then install dependencies:

```bash
npm install
```

- [ ] **Step 2: Configure CORS in main.ts**

Replace `backend/src/main.ts`:

```typescript
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: "http://localhost:3000",
    credentials: true,
  });

  await app.listen(4000);
  console.log("Backend running on http://localhost:4000");
}
bootstrap();
```

- [ ] **Step 3: Create auth module files**

Create `backend/src/auth/auth.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

@Module({
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
```

Create `backend/src/auth/auth.controller.ts`:

```typescript
import { Controller, Post, Get, Body } from "@nestjs/common";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  login(@Body() body: { username: string }) {
    return this.authService.login(body.username);
  }

  @Post("logout")
  logout() {
    return this.authService.logout();
  }

  @Get("me")
  getProfile() {
    return this.authService.getProfile();
  }
}
```

Create `backend/src/auth/auth.service.ts`:

```typescript
import { Injectable } from "@nestjs/common";

@Injectable()
export class AuthService {
  private readonly mockUser = {
    username: "Alex Rivera",
    email: "alex@readinpace.com",
  };

  login(username: string) {
    return {
      token: "mock-jwt-token",
      user: this.mockUser,
    };
  }

  logout() {
    return { success: true };
  }

  getProfile() {
    return this.mockUser;
  }
}
```

- [ ] **Step 4: Wire up AuthModule in app.module.ts**

Replace `backend/src/app.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";

@Module({
  imports: [AuthModule],
})
export class AppModule {}
```

- [ ] **Step 5: Update backend port in nest-cli.json (optional)**

Update `backend/nest-cli.json` if needed. The default port is set in `main.ts` to 4000.

- [ ] **Step 6: Verify backend starts**

```bash
npm run dev --workspace=backend
```

Expected: `Backend running on http://localhost:4000`

Test: `curl http://localhost:4000/auth/me` should return `{"username":"Alex Rivera","email":"alex@readinpace.com"}`

- [ ] **Step 7: Commit**

```bash
git add backend/
git commit -m "feat: scaffold NestJS backend with mock auth module"
```

---

### Task 3: Scaffold Nuxt 3 frontend

**Files:**

- All files under `frontend/` created by nuxi init
- Modify: `frontend/nuxt.config.ts`
- Modify: `frontend/package.json` (add deps)
- Create: `frontend/app.vue`

- [ ] **Step 1: Scaffold Nuxt project**

```bash
npx nuxi@latest init frontend --npm
```

- [ ] **Step 2: Remove auto-generated boilerplate**

Delete `frontend/pages/index.vue`, `frontend/app.vue`, and any generated example files. They'll be replaced.

- [ ] **Step 3: Install modules and dependencies**

```bash
cd frontend
npx nuxi module add pinia
npx nuxi module add shadcn-nuxt
npm install @nuxtjs/tailwindcss
npm install @vueuse/core
npm install lucide-vue-next
cd ..
```

- [ ] **Step 4: Configure nuxt.config.ts**

Replace `frontend/nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  ssr: true,
  devtools: true,

  modules: ["@pinia/nuxt", "shadcn-nuxt", "@nuxtjs/tailwindcss"],

  devServer: {
    port: 3000,
  },

  runtimeConfig: {
    public: {
      backendUrl: "http://localhost:4000",
    },
  },

  compatibilityDate: "2026-06-03",
});
```

- [ ] **Step 5: Create app.vue**

Create `frontend/app.vue`:

```vue
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
```

- [ ] **Step 6: Verify Nuxt starts**

```bash
npm run dev --workspace=frontend
```

Expected: Nuxt starts on port 3000.

- [ ] **Step 7: Commit**

```bash
git add frontend/
git commit -m "feat: scaffold Nuxt 3 SSR frontend with modules"
```

---

### Task 4: Port mock data

**Files:**

- Create: `frontend/data/books.ts`

- [ ] **Step 1: Create mock data file**

Create `frontend/data/books.ts`:

```typescript
export interface Book {
  id: string;
  title: string;
  author: string;
  price: number;
  cover: string;
  synopsis: string;
  rating: number;
  trending?: boolean;
}

const covers = [
  "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1592496431122-2349e0fbc666?w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1531901599143-df5010ab9438?w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1629992101753-56d196c8aabb?w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1621351183012-e2f9972dd9bf?w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1610882648335-ced8fc8fa6b6?w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1495640388908-05fa85288e61?w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1589998059171-988d887df646?w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1474932430478-367dbb6832c1?w=600&auto=format&fit=crop",
];

const titles: [string, string][] = [
  ["The Quiet Hours", "Elena Marsh"],
  ["Atlas of Small Things", "Ravi Kapoor"],
  ["Northbound", "Sigrid Hallman"],
  ["A Patient Year", "Marcus Webb"],
  ["Letters from Tomorrow", "June Okafor"],
  ["The Cartographer's Daughter", "Lila Vance"],
  ["Slowfire", "Theo Almeida"],
  ["Field Notes on Stillness", "Anya Petrova"],
  ["The Glass Orchard", "Hugo Bennet"],
  ["Paper Boats", "Mei Lin"],
  ["Echoes in November", "Daniel Ortiz"],
  ["The Last Lighthouse", "Cora Whitfield"],
];

const synopsis =
  "A quietly luminous novel about memory, distance, and the small rituals that bind us. Across one slow year, four lives converge on a coastline that refuses to stay still.";

export const books: Book[] = titles.map(([title, author], i) => ({
  id: String(i + 1),
  title,
  author,
  price: Math.round((9 + i * 1.7) * 100) / 100,
  cover: covers[i % covers.length],
  synopsis,
  rating: 3.8 + ((i * 0.13) % 1.2),
  trending: i < 3,
}));

export const getBook = (id: string) => books.find((b) => b.id === id);

export interface Review {
  user: string;
  avatar: string;
  rating: number;
  text: string;
}

export const mockReviews: Review[] = [
  {
    user: "Hana",
    avatar: "H",
    rating: 5,
    text: "Read it in two sittings. The prose has a hush to it — like the world goes quieter while you're inside.",
  },
  {
    user: "Jonas",
    avatar: "J",
    rating: 4,
    text: "Beautifully restrained. The second act drifts a little but the ending earned it.",
  },
  {
    user: "Priya",
    avatar: "P",
    rating: 5,
    text: "One of those books I'll keep on the nightstand. Already lent my copy to a friend.",
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add frontend/data/books.ts
git commit -m "feat: port mock book data to Nuxt"
```

---

### Task 5: Port theme and styling

**Files:**

- Create: `frontend/assets/css/main.css`

- [ ] **Step 1: Create main CSS file**

Create `frontend/assets/css/main.css`:

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --radius-2xl: calc(var(--radius) + 8px);
  --radius-3xl: calc(var(--radius) + 12px);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary-soft: var(--primary-soft);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --animate-gradient: gradient-shift 18s ease infinite;
  --animate-float: float 6s ease-in-out infinite;
  --animate-fade-up: fade-up 0.5s ease-out;
}

:root {
  --radius: 0.75rem;
  --background: oklch(0.99 0.003 90);
  --foreground: oklch(0.22 0.008 250);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.22 0.008 250);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.22 0.008 250);
  --primary: oklch(0.55 0.07 155);
  --primary-foreground: oklch(0.99 0 0);
  --primary-soft: oklch(0.92 0.04 155);
  --secondary: oklch(0.96 0.005 90);
  --secondary-foreground: oklch(0.22 0.008 250);
  --muted: oklch(0.96 0.005 90);
  --muted-foreground: oklch(0.5 0.01 250);
  --accent: oklch(0.94 0.03 155);
  --accent-foreground: oklch(0.3 0.05 155);
  --destructive: oklch(0.6 0.2 25);
  --destructive-foreground: oklch(0.99 0 0);
  --border: oklch(0.92 0.005 90);
  --input: oklch(0.92 0.005 90);
  --ring: oklch(0.55 0.07 155);
}

.dark {
  --background: oklch(0.18 0.008 250);
  --foreground: oklch(0.96 0.005 90);
  --card: oklch(0.22 0.008 250);
  --card-foreground: oklch(0.96 0.005 90);
  --popover: oklch(0.22 0.008 250);
  --popover-foreground: oklch(0.96 0.005 90);
  --primary: oklch(0.7 0.09 155);
  --primary-foreground: oklch(0.18 0.008 250);
  --primary-soft: oklch(0.3 0.05 155);
  --secondary: oklch(0.26 0.008 250);
  --secondary-foreground: oklch(0.96 0.005 90);
  --muted: oklch(0.26 0.008 250);
  --muted-foreground: oklch(0.7 0.01 250);
  --accent: oklch(0.3 0.04 155);
  --accent-foreground: oklch(0.92 0.04 155);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.7 0.09 155);
}

@keyframes gradient-shift {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@utility bg-animated-gradient {
  background: linear-gradient(
    120deg,
    oklch(0.95 0.04 155),
    oklch(0.94 0.03 220),
    oklch(0.96 0.02 90),
    oklch(0.93 0.05 155)
  );
  background-size: 300% 300%;
  animation: gradient-shift 18s ease infinite;
}

@utility glass {
  background: color-mix(in oklab, white 55%, transparent);
  backdrop-filter: blur(20px) saturate(140%);
  border: 1px solid color-mix(in oklab, white 70%, transparent);
}

@layer base {
  * {
    border-color: var(--color-border);
  }
  body {
    background-color: var(--color-background);
    color: var(--color-foreground);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
  }
  h1,
  h2,
  h3,
  h4 {
    letter-spacing: -0.02em;
  }
}
```

- [ ] **Step 2: Register CSS in nuxt.config.ts**

Add the CSS import to `frontend/nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  css: ["~/assets/css/main.css"],
  // ... rest of config
});
```

- [ ] **Step 3: Commit**

```bash
git add frontend/assets/css/main.css frontend/nuxt.config.ts
git commit -m "feat: port Tailwind v4 theme and custom utilities"
```

---

### Task 6: Create Pinia stores

**Files:**

- Create: `frontend/stores/auth.ts`
- Create: `frontend/stores/books.ts`
- Create: `frontend/stores/dashboard.ts`

- [ ] **Step 1: Create auth store**

Create `frontend/stores/auth.ts`:

```typescript
import { defineStore } from "pinia";
import { ref } from "vue";

export const useAuthStore = defineStore("auth", () => {
  const signedIn = ref(true);
  const username = ref("Alex Rivera");
  const adminMode = ref(false);

  const runtimeConfig = useRuntimeConfig();

  async function toggleAuth() {
    if (signedIn.value) {
      await $fetch("/api/auth/logout", {
        method: "POST",
        baseURL: runtimeConfig.public.backendUrl,
      });
      signedIn.value = false;
    } else {
      await $fetch("/api/auth/login", {
        method: "POST",
        body: { username: username.value },
        baseURL: runtimeConfig.public.backendUrl,
      });
      signedIn.value = true;
    }
  }

  function toggleAdmin() {
    adminMode.value = !adminMode.value;
  }

  return { signedIn, username, adminMode, toggleAuth, toggleAdmin };
});
```

- [ ] **Step 2: Create books store**

Create `frontend/stores/books.ts`:

```typescript
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import {
  books as bookData,
  getBook as getBookData,
  mockReviews,
  type Book,
  type Review,
} from "~/data/books";

export const useBooksStore = defineStore("books", () => {
  const books = ref<Book[]>(bookData);
  const liked = ref<Record<string, boolean>>({});
  const reviews = ref<Record<string, Review[]>>({});

  const trendingBooks = computed(() => books.value.filter((b) => b.trending));

  function getBook(id: string) {
    return getBookData(id);
  }

  function getReviews(bookId: string) {
    if (!reviews.value[bookId]) {
      reviews.value[bookId] = [...mockReviews];
    }
    return reviews.value[bookId];
  }

  function addReview(bookId: string, review: Review) {
    if (!reviews.value[bookId]) {
      reviews.value[bookId] = [...mockReviews];
    }
    reviews.value[bookId] = [review, ...reviews.value[bookId]];
  }

  function toggleLike(id: string) {
    liked.value = { ...liked.value, [id]: !liked.value[id] };
  }

  return { books, liked, trendingBooks, getBook, getReviews, addReview, toggleLike };
});
```

- [ ] **Step 3: Create dashboard store**

Create `frontend/stores/dashboard.ts`:

```typescript
import { defineStore } from "pinia";
import { ref } from "vue";
import { books } from "~/data/books";

export const useDashboardStore = defineStore("dashboard", () => {
  const borrowed = ref<string[]>(["2", "5"]);
  const purchased = ref<string[]>(["1", "7", "9"]);

  function borrow(id: string) {
    if (!borrowed.value.includes(id)) {
      borrowed.value = [...borrowed.value, id];
    }
  }

  function returnBook(id: string) {
    borrowed.value = borrowed.value.filter((x) => x !== id);
  }

  function buy(id: string) {
    if (!purchased.value.includes(id)) {
      purchased.value = [...purchased.value, id];
    }
  }

  return { borrowed, purchased, borrow, returnBook, buy };
});
```

- [ ] **Step 4: Commit**

```bash
git add frontend/stores/
git commit -m "feat: create Pinia stores for auth, books, dashboard"
```

---

### Task 7: Create Navbar component

**Files:**

- Create: `frontend/components/Navbar.vue`

- [ ] **Step 1: Create Navbar.vue**

```vue
<script setup lang="ts">
import { Rss, LayoutDashboard, User, LogOut, LogIn, Shield } from "lucide-vue-next";
import { useAuthStore } from "~/stores/auth";

const auth = useAuthStore();
const open = ref(false);
const router = useRouter();

function navigate(path: string) {
  open.value = false;
  router.push(path);
}
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
      <NuxtLink to="/" class="text-lg font-semibold tracking-tight">
        Read<span class="text-primary"> in </span>Pace
      </NuxtLink>

      <nav class="flex items-center gap-1">
        <NuxtLink
          to="/feed"
          class="hidden items-center gap-2 rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
        >
          <Rss class="h-4 w-4" /> Feed
        </NuxtLink>
        <NuxtLink
          to="/dashboard"
          class="hidden items-center gap-2 rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
        >
          <LayoutDashboard class="h-4 w-4" /> My Dashboard
        </NuxtLink>

        <div class="relative ml-2">
          <button
            @click="open = !open"
            @blur="setTimeout(() => (open = false), 150)"
            class="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-border transition-transform hover:scale-105"
            aria-label="Profile menu"
          >
            <span v-if="auth.signedIn" class="text-sm font-semibold">
              {{
                auth.username
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
              }}
            </span>
            <User v-else class="h-4 w-4" />
          </button>
          <div
            v-if="open"
            class="absolute right-0 mt-2 w-60 origin-top-right rounded-xl border border-border bg-popover p-2 shadow-lg"
          >
            <template v-if="auth.signedIn">
              <div class="px-3 py-2">
                <p class="text-sm font-medium">{{ auth.username }}</p>
                <p class="text-xs text-muted-foreground">alex@readinpace.com</p>
              </div>
              <div class="my-1 h-px bg-border" />
              <button
                @mousedown="navigate('/dashboard')"
                class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted"
              >
                <LayoutDashboard class="h-4 w-4" /> Dashboard
              </button>
              <button
                @mousedown="auth.toggleAdmin()"
                class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-muted"
              >
                <span class="flex items-center gap-2"><Shield class="h-4 w-4" /> Admin mode</span>
                <span
                  class="relative h-4 w-7 rounded-full transition-colors"
                  :class="auth.adminMode ? 'bg-primary' : 'bg-muted-foreground/30'"
                >
                  <span
                    class="absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all"
                    :class="auth.adminMode ? 'left-3.5' : 'left-0.5'"
                  />
                </span>
              </button>
              <button
                @mousedown="auth.toggleAuth()"
                class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-muted"
              >
                <LogOut class="h-4 w-4" /> Sign out
              </button>
            </template>
            <template v-else>
              <button
                @mousedown="auth.toggleAuth()"
                class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted"
              >
                <LogIn class="h-4 w-4" /> Sign in
              </button>
            </template>
          </div>
        </div>
      </nav>
    </div>
  </header>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/Navbar.vue
git commit -m "feat: create Navbar component"
```

---

### Task 8: Create BookCard component

**Files:**

- Create: `frontend/components/BookCard.vue`

- [ ] **Step 1: Create BookCard.vue**

```vue
<script setup lang="ts">
import { Pencil, Trash2, RotateCcw, BookOpen } from "lucide-vue-next";
import type { Book } from "~/data/books";
import { useDashboardStore } from "~/stores/dashboard";
import { useAuthStore } from "~/stores/auth";

const props = withDefaults(
  defineProps<{
    book: Book;
    variant?: "default" | "borrowed" | "purchased";
  }>(),
  { variant: "default" },
);

const dashboard = useDashboardStore();
const auth = useAuthStore();
</script>

<template>
  <div
    class="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5"
  >
    <div
      v-if="auth.adminMode"
      class="absolute right-3 top-3 z-10 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100"
    >
      <button
        class="flex h-8 w-8 items-center justify-center rounded-full bg-background/90 backdrop-blur ring-1 ring-border hover:bg-background"
      >
        <Pencil class="h-3.5 w-3.5" />
      </button>
      <button
        class="flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-destructive backdrop-blur ring-1 ring-border hover:bg-background"
      >
        <Trash2 class="h-3.5 w-3.5" />
      </button>
    </div>

    <NuxtLink :to="`/book/${book.id}`" class="block overflow-hidden bg-muted">
      <div class="aspect-[2/3] w-full overflow-hidden">
        <img
          :src="book.cover"
          :alt="book.title"
          loading="lazy"
          class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
    </NuxtLink>

    <div class="flex flex-1 flex-col gap-3 p-4">
      <NuxtLink :to="`/book/${book.id}`" class="space-y-1">
        <h3 class="line-clamp-1 font-semibold tracking-tight">{{ book.title }}</h3>
        <p class="text-sm text-muted-foreground">{{ book.author }}</p>
      </NuxtLink>
      <div class="mt-auto flex items-center justify-between gap-2 pt-2">
        <template v-if="variant === 'borrowed'">
          <button
            @click="dashboard.returnBook(book.id)"
            class="flex w-full items-center justify-center gap-2 rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            <RotateCcw class="h-4 w-4" /> Return Book
          </button>
        </template>
        <template v-else-if="variant === 'purchased'">
          <button
            class="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <BookOpen class="h-4 w-4" /> Read Now
          </button>
        </template>
        <template v-else>
          <button
            @click="dashboard.buy(book.id)"
            class="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Buy ${{ book.price.toFixed(2) }}
          </button>
          <button
            @click="dashboard.borrow(book.id)"
            class="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            Borrow
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/BookCard.vue
git commit -m "feat: create BookCard component with variants"
```

---

### Task 9: Create AdminFab component

**Files:**

- Create: `frontend/components/AdminFab.vue`

- [ ] **Step 1: Create AdminFab.vue**

```vue
<script setup lang="ts">
import { Plus } from "lucide-vue-next";
import { useAuthStore } from "~/stores/auth";

const auth = useAuthStore();
</script>

<template>
  <button
    v-if="auth.adminMode"
    class="fixed bottom-8 right-8 z-40 flex h-14 items-center gap-2 rounded-full bg-primary px-5 text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105"
  >
    <Plus class="h-5 w-5" />
    <span class="font-medium">Add New Book</span>
  </button>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/AdminFab.vue
git commit -m "feat: create AdminFab component"
```

---

### Task 10: Migrate Landing page

**Files:**

- Create: `frontend/pages/index.vue`

- [ ] **Step 1: Create Landing page**

```vue
<script setup lang="ts">
import { ArrowRight } from "lucide-vue-next";

definePageMeta({
  title: "Read in Peace — A calmer way to read",
  description: "A quiet library to review, borrow, return, and buy books at your own pace.",
});
</script>

<template>
  <div
    class="relative flex h-screen w-full items-center justify-center overflow-hidden bg-animated-gradient"
  >
    <div
      class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/20"
    />
    <div class="absolute left-8 top-8 text-base font-semibold tracking-tight">
      Read<span class="text-primary"> in </span>Pace
    </div>

    <div class="relative z-10 flex max-w-2xl flex-col items-center px-6 text-center">
      <span
        class="mb-6 rounded-full glass px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-foreground/70"
      >
        A quieter library
      </span>
      <h1
        class="text-balance text-5xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-7xl"
      >
        Read at the pace<br />the book deserves.
      </h1>
      <p class="mt-6 max-w-md text-balance text-base text-foreground/60 sm:text-lg">
        Borrow, return, review, and own — without the noise. A place built for slow afternoons and
        long evenings.
      </p>

      <NuxtLink
        to="/feed"
        class="group mt-10 inline-flex items-center gap-3 rounded-full glass px-7 py-4 text-base font-medium text-foreground shadow-xl shadow-black/5 transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:shadow-primary/20"
      >
        Explore the Library
        <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </NuxtLink>
    </div>

    <div class="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-foreground/40">
      Scroll, sip, settle in.
    </div>
  </div>
</template>
```

- [ ] **Step 2: Verify the Landing page renders at `/`**

```bash
npm run dev --workspace=frontend
```

Open `http://localhost:3000`. Should show the animated gradient landing page with "Explore the Library" CTA.

- [ ] **Step 3: Commit**

```bash
git add frontend/pages/index.vue
git commit -m "feat: migrate Landing page"
```

---

### Task 11: Migrate Feed page

**Files:**

- Create: `frontend/pages/feed.vue`

- [ ] **Step 1: Create Feed page**

```vue
<script setup lang="ts">
import { Flame, ChevronLeft, ChevronRight } from "lucide-vue-next";
import { useBooksStore } from "~/stores/books";

const booksStore = useBooksStore();
const trending = booksStore.trendingBooks;
const page = ref(1);
const totalPages = 10;

definePageMeta({
  title: "Feed — Read in Peace",
  description: "Browse trending books and the full library on Read in Peace.",
});
</script>

<template>
  <Navbar />
  <main class="mx-auto max-w-7xl px-6 py-10">
    <section class="mb-14">
      <div class="mb-5 flex items-end justify-between">
        <div>
          <div
            class="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-primary"
          >
            <Flame class="h-3.5 w-3.5" /> Trending Now
          </div>
          <h2 class="text-3xl font-semibold tracking-tight">This week's quiet favorites</h2>
        </div>
        <span class="hidden text-sm text-muted-foreground sm:block">Updated daily</span>
      </div>

      <div class="grid grid-cols-1 gap-5 md:grid-cols-3">
        <article
          v-for="(b, i) in trending"
          :key="b.id"
          class="group relative overflow-hidden rounded-3xl border border-border bg-card transition-all hover:shadow-2xl hover:shadow-black/5"
          :class="i === 0 ? 'md:col-span-2 md:row-span-2' : ''"
        >
          <div
            class="relative overflow-hidden"
            :class="i === 0 ? 'aspect-[16/10]' : 'aspect-[16/11]'"
          >
            <img
              :src="b.cover"
              :alt="b.title"
              class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div
              class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"
            />
            <div class="absolute bottom-0 left-0 right-0 p-6 text-white">
              <span
                class="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider backdrop-blur"
              >
                #{{ i + 1 }} Trending
              </span>
              <h3
                class="mt-3 font-semibold tracking-tight"
                :class="i === 0 ? 'text-3xl' : 'text-xl'"
              >
                {{ b.title }}
              </h3>
              <p class="text-sm text-white/70">{{ b.author }}</p>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section>
      <div class="mb-5 flex items-end justify-between">
        <h2 class="text-2xl font-semibold tracking-tight">The full shelf</h2>
        <span class="text-sm text-muted-foreground">{{ booksStore.books.length }} titles</span>
      </div>

      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <BookCard v-for="b in booksStore.books" :key="b.id" :book="b" />
      </div>

      <div class="mt-14 flex items-center justify-center gap-1.5">
        <button
          @click="page = Math.max(1, page - 1)"
          :disabled="page === 1"
          class="flex h-9 w-9 items-center justify-center rounded-full border border-border transition-colors hover:bg-muted disabled:opacity-40"
        >
          <ChevronLeft class="h-4 w-4" />
        </button>
        <button
          v-for="n in [1, 2, 3]"
          :key="n"
          @click="page = n"
          class="h-9 min-w-9 rounded-full px-3 text-sm font-medium transition-colors"
          :class="page === n ? 'bg-foreground text-background' : 'hover:bg-muted'"
        >
          {{ n }}
        </button>
        <span class="px-2 text-muted-foreground">…</span>
        <button
          @click="page = totalPages"
          class="h-9 min-w-9 rounded-full px-3 text-sm font-medium transition-colors"
          :class="page === totalPages ? 'bg-foreground text-background' : 'hover:bg-muted'"
        >
          {{ totalPages }}
        </button>
        <button
          @click="page = Math.min(totalPages, page + 1)"
          :disabled="page === totalPages"
          class="flex h-9 w-9 items-center justify-center rounded-full border border-border transition-colors hover:bg-muted disabled:opacity-40"
        >
          <ChevronRight class="h-4 w-4" />
        </button>
      </div>
    </section>
  </main>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/pages/feed.vue
git commit -m "feat: migrate Feed page with trending and book grid"
```

---

### Task 12: Migrate Book Detail page

**Files:**

- Create: `frontend/pages/book/[id].vue`

- [ ] **Step 1: Create Book Detail page**

```vue
<script setup lang="ts">
import { ArrowLeft, Star, Heart, MessageSquare, Share2 } from "lucide-vue-next";
import { useBooksStore } from "~/stores/books";
import { useDashboardStore } from "~/stores/dashboard";

const route = useRoute();
const id = route.params.id as string;

const booksStore = useBooksStore();
const dashboard = useDashboardStore();

const book = computed(() => booksStore.getBook(id));
const reviews = ref(booksStore.getReviews(id));
const draft = ref("");

definePageMeta({
  title: "Book — Read in Peace",
});

function submitReview() {
  if (!draft.value.trim()) return;
  const newReview = { user: "You", avatar: "Y", rating: 5, text: draft.value.trim() };
  booksStore.addReview(id, newReview);
  reviews.value = booksStore.getReviews(id);
  draft.value = "";
}
</script>

<template>
  <Navbar />
  <main class="mx-auto max-w-6xl px-6 py-10">
    <NuxtLink
      to="/feed"
      class="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft class="h-4 w-4" /> Back to feed
    </NuxtLink>

    <template v-if="book">
      <div class="grid grid-cols-1 gap-12 md:grid-cols-2 md:items-start">
        <div class="flex justify-center md:sticky md:top-24">
          <div class="w-full max-w-sm">
            <div class="aspect-[2/3] overflow-hidden rounded-xl shadow-2xl shadow-black/20">
              <img :src="book.cover" :alt="book.title" class="h-full w-full object-cover" />
            </div>
          </div>
        </div>

        <div class="flex flex-col">
          <p class="mb-2 text-sm uppercase tracking-widest text-muted-foreground">
            {{ book.author }}
          </p>
          <h1 class="text-4xl font-semibold tracking-tight sm:text-5xl">
            {{ book.title }}
          </h1>

          <div class="mt-5 flex items-center gap-4">
            <span
              class="rounded-full bg-primary-soft px-4 py-1.5 text-sm font-semibold text-primary"
            >
              ${{ book.price.toFixed(2) }}
            </span>
            <div class="flex items-center gap-1 text-sm text-muted-foreground">
              <Star class="h-4 w-4 fill-foreground text-foreground" />
              {{ book.rating.toFixed(1) }} · {{ reviews.length }} reviews
            </div>
          </div>

          <p class="mt-6 text-base leading-relaxed text-muted-foreground">
            {{ book.synopsis }}
          </p>

          <div class="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              @click="dashboard.buy(book.id)"
              class="flex-1 rounded-xl bg-primary px-6 py-3.5 font-medium text-primary-foreground transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/30"
            >
              Buy Now — ${{ book.price.toFixed(2) }}
            </button>
            <button
              @click="dashboard.borrow(book.id)"
              class="flex-1 rounded-xl border border-border px-6 py-3.5 font-medium transition-colors hover:bg-muted"
            >
              Borrow
            </button>
          </div>

          <div class="mt-6 flex items-center gap-2">
            <button
              @click="booksStore.toggleLike(book.id)"
              class="flex h-11 w-11 items-center justify-center rounded-full border border-border transition-all hover:bg-muted"
              :class="booksStore.liked[book.id] ? 'text-destructive' : ''"
            >
              <Heart class="h-4 w-4" :class="booksStore.liked[book.id] ? 'fill-current' : ''" />
            </button>
            <button
              class="flex h-11 w-11 items-center justify-center rounded-full border border-border transition-colors hover:bg-muted"
            >
              <MessageSquare class="h-4 w-4" />
            </button>
            <button
              class="flex h-11 w-11 items-center justify-center rounded-full border border-border transition-colors hover:bg-muted"
            >
              <Share2 class="h-4 w-4" />
            </button>
          </div>

          <section class="mt-12 border-t border-border pt-10">
            <h2 class="text-2xl font-semibold tracking-tight">Reviews</h2>

            <form
              @submit.prevent="submitReview"
              class="mt-6 rounded-2xl border border-border bg-card p-4"
            >
              <textarea
                v-model="draft"
                placeholder="Leave a review…"
                rows="3"
                class="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <div class="flex justify-end">
                <button
                  type="submit"
                  class="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
                >
                  Post review
                </button>
              </div>
            </form>

            <div class="mt-8 space-y-6">
              <div v-for="(r, i) in reviews" :key="i" class="flex gap-4">
                <div
                  class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
                >
                  {{ r.avatar }}
                </div>
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <p class="font-medium">{{ r.user }}</p>
                    <div class="flex">
                      <Star
                        v-for="idx in 5"
                        :key="idx"
                        class="h-3.5 w-3.5"
                        :class="
                          idx <= r.rating
                            ? 'fill-foreground text-foreground'
                            : 'text-muted-foreground/30'
                        "
                      />
                    </div>
                  </div>
                  <p class="mt-1 text-sm text-muted-foreground">{{ r.text }}</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="mx-auto max-w-xl px-6 py-24 text-center">
        <p>Book not found.</p>
        <NuxtLink to="/feed" class="mt-4 inline-block text-primary underline">
          Back to feed
        </NuxtLink>
      </div>
    </template>
  </main>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/pages/book/
git commit -m "feat: migrate Book Detail page with reviews"
```

---

### Task 13: Migrate Dashboard page

**Files:**

- Create: `frontend/pages/dashboard.vue`

- [ ] **Step 1: Create Dashboard page**

```vue
<script setup lang="ts">
import { BookMarked, Library } from "lucide-vue-next";
import { useAuthStore } from "~/stores/auth";
import { useDashboardStore } from "~/stores/dashboard";
import { useBooksStore } from "~/stores/books";

const auth = useAuthStore();
const dashboard = useDashboardStore();
const booksStore = useBooksStore();
const tab = ref<"borrowed" | "purchased">("borrowed");

const borrowedBooks = computed(() =>
  booksStore.books.filter((b) => dashboard.borrowed.includes(b.id)),
);
const purchasedBooks = computed(() =>
  booksStore.books.filter((b) => dashboard.purchased.includes(b.id)),
);
const list = computed(() =>
  tab.value === "borrowed" ? borrowedBooks.value : purchasedBooks.value,
);

definePageMeta({
  title: "My Dashboard — Read in Peace",
});
</script>

<template>
  <Navbar />
  <main class="mx-auto max-w-7xl px-6 py-10">
    <div class="mb-10">
      <p class="text-sm text-muted-foreground">Welcome back</p>
      <h1 class="mt-1 text-4xl font-semibold tracking-tight">{{ auth.username }}</h1>
    </div>

    <div class="mb-8 inline-flex gap-1 rounded-full border border-border bg-card p-1">
      <button
        @click="tab = 'borrowed'"
        class="flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all"
        :class="
          tab === 'borrowed'
            ? 'bg-foreground text-background shadow'
            : 'text-muted-foreground hover:text-foreground'
        "
      >
        <BookMarked class="h-4 w-4" /> Borrowed · {{ borrowedBooks.length }}
      </button>
      <button
        @click="tab = 'purchased'"
        class="flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all"
        :class="
          tab === 'purchased'
            ? 'bg-foreground text-background shadow'
            : 'text-muted-foreground hover:text-foreground'
        "
      >
        <Library class="h-4 w-4" /> Purchased · {{ purchasedBooks.length }}
      </button>
    </div>

    <template v-if="list.length === 0">
      <div class="rounded-2xl border border-dashed border-border py-20 text-center">
        <p class="text-muted-foreground">Nothing here yet.</p>
        <NuxtLink
          to="/feed"
          class="mt-3 inline-block text-sm font-medium text-primary hover:underline"
        >
          Find something to read →
        </NuxtLink>
      </div>
    </template>
    <template v-else>
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <BookCard v-for="b in list" :key="b.id" :book="b" :variant="tab" />
      </div>
    </template>
  </main>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/pages/dashboard.vue
git commit -m "feat: migrate Dashboard page with tabs"
```

---

### Task 14: Set up Nuxt server proxy for auth backend

**Files:**

- Create: `frontend/server/api/auth/[...].ts`

- [ ] **Step 1: Create the proxy route**

Create `frontend/server/api/auth/[...].ts`:

```typescript
export default defineEventHandler(async (event) => {
  const backendUrl = useRuntimeConfig().public.backendUrl;
  const path = event.path.replace("/api/auth", "/auth");

  const response = await fetch(`${backendUrl}${path}`, {
    method: event.method,
    headers: {
      "Content-Type": "application/json",
    },
    body:
      event.method !== "GET" && event.method !== "HEAD"
        ? JSON.stringify(await readBody(event))
        : undefined,
  });

  return response.json();
});
```

This forwards `POST /api/auth/login`, `POST /api/auth/logout`, and `GET /api/auth/me` to the Nest backend on port 4000.

- [ ] **Step 2: Update auth store to use proxy path**

Update `frontend/stores/auth.ts` — change the `baseURL` usage: remove `baseURL` from `$fetch` calls since the proxy is now on the same origin. The auth store should just call `/api/auth/login` without a baseURL.

Edit the `toggleAuth` function:

```typescript
async function toggleAuth() {
  if (signedIn.value) {
    await $fetch("/api/auth/logout", { method: "POST" });
    signedIn.value = false;
  } else {
    await $fetch("/api/auth/login", {
      method: "POST",
      body: { username: username.value },
    });
    signedIn.value = true;
  }
}
```

Remove the `runtimeConfig` import and usage from the auth store since the proxy is on the same origin.

- [ ] **Step 3: Verify auth flow end-to-end**

Start both backend and frontend:

```bash
npm run dev:all
```

Open `http://localhost:3000`. Click the profile menu. Sign out → should call `POST /api/auth/logout` which proxies to Nest. Sign in → calls `POST /api/auth/login`.

- [ ] **Step 4: Commit**

```bash
git add frontend/server/ frontend/stores/auth.ts
git commit -m "feat: add Nuxt server proxy for auth API"
```

---

### Task 15: Verify the full app

- [ ] **Step 1: Run both services**

```bash
npm run dev:all
```

- [ ] **Step 2: Verify each page**

| Page        | URL                               | What to check                                                   |
| ----------- | --------------------------------- | --------------------------------------------------------------- |
| Landing     | `http://localhost:3000/`          | Animated gradient background, "Explore the Library" CTA         |
| Feed        | `http://localhost:3000/feed`      | 3 trending books in hero grid, 12 books in shelf, pagination    |
| Book Detail | `http://localhost:3000/book/1`    | Two-column layout, metadata, buy/borrow buttons, likes, reviews |
| Dashboard   | `http://localhost:3000/dashboard` | Welcome message, borrowed/purchased tabs, BookCard variants     |

- [ ] **Step 3: Verify interactions**

1. Click "Explore the Library" → navigates to `/feed`
2. Click a book card → navigates to `/book/{id}`
3. Click "Buy Now" or "Borrow" → book appears in Dashboard
4. Click heart icon → toggles liked state
5. Write a review → appears in reviews list
6. Open profile menu → sign out/in toggle works
7. Toggle admin mode → AdminFab appears, edit/delete buttons on book cards

- [ ] **Step 4: Verify backend auth endpoints**

```bash
curl http://localhost:4000/auth/me
{"username":"Alex Rivera","email":"alex@readinpace.com"}

curl -X POST http://localhost:4000/auth/login -H "Content-Type: application/json" -d '{"username":"Alex"}'
{"token":"mock-jwt-token","user":{...}}

curl -X POST http://localhost:4000/auth/logout
{"success":true}
```

- [ ] **Step 5: Commit any remaining fixes**

```bash
git add -A && git commit -m "fix: final adjustments after full verification"
```
