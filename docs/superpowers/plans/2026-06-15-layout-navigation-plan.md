# Layout & Navigation — Implementation Plan (Sub-project 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure frontend layout with top navbar, sidebar grid, and bottom dock navigation — matching the Ex Libris design.

**Architecture:** Create a new `layouts/app.vue` with full app chrome (AppNavbar + content grid + AppSidebar + BottomDock), strip `layouts/default.vue` to minimal, create new page files for /home, /explore, /shelf, /social, and redirect old pages.

**Tech Stack:** Nuxt 3, Vue 3 Composition API, Tailwind CSS v4, Lucide-vue-next

---

### Task 1: Strip `layouts/default.vue` to Minimal

**Files:**
- Modify: `frontend/layouts/default.vue`

- [ ] **Step 1: Replace default.vue content**

Read the current file, then replace with:

```vue
<script setup lang="ts">
import { Toaster } from 'vue-sonner';
</script>

<template>
  <div>
    <slot />
    <Toaster richColors position="top-center" />
  </div>
</template>
```

Removes: Footer, AdminFab, BookFormModal, CheckoutDrawer (these move to the app layout). Removes the `useBooksStore` import and `isNotIndex` computed.

- [ ] **Step 2: Verify landing page renders**

Run: `npm run dev` (from `frontend/`)
Expected: Landing page (`/`) renders with video background, no navbar, no footer. Toaster still works.

- [ ] **Step 3: Commit**

```bash
git add frontend/layouts/default.vue
git commit -m "refactor: strip default layout to minimal for landing page only"
```

---

### Task 2: Create `layouts/app.vue` with Full App Chrome

**Files:**
- Create: `frontend/layouts/app.vue`

- [ ] **Step 1: Create app.vue layout**

```vue
<script setup lang="ts">
import { Toaster } from 'vue-sonner';
import { useBooksStore } from '~/stores/books';

const booksStore = useBooksStore();
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <AppNavbar />
    <main class="mx-auto grid max-w-7xl grid-cols-12 gap-10 px-4 py-8 md:px-6">
      <div class="col-span-12 space-y-12 lg:col-span-8">
        <slot />
      </div>
      <aside class="col-span-12 lg:col-span-4">
        <slot name="sidebar">
          <AppSidebar />
        </slot>
      </aside>
    </main>
    <BottomDock />
    <AdminFab />
    <BookFormModal
      v-if="booksStore.showForm"
      :book="booksStore.editingBook"
      @close="booksStore.closeForm()"
      @saved="booksStore.closeForm()"
    />
    <CheckoutDrawer />
    <Toaster richColors position="top-center" />
  </div>
</template>
```

Body gets `selection:bg-primary/10 selection:text-primary` via the already-defined Tailwind utility (add a wrapper div with these classes if needed — the `bg-background text-foreground` handles the base). Add `pb-28` to provide space for the bottom dock.

```vue
<template>
  <div class="min-h-screen bg-background pb-28 text-foreground selection:bg-primary/10 selection:text-primary">
    <AppNavbar />
    <main class="mx-auto grid max-w-7xl grid-cols-12 gap-10 px-4 py-8 md:px-6">
      <div class="col-span-12 space-y-12 lg:col-span-8">
        <slot />
      </div>
      <aside class="col-span-12 lg:col-span-4">
        <slot name="sidebar">
          <AppSidebar />
        </slot>
      </aside>
    </main>
    <BottomDock />
    <AdminFab />
    <BookFormModal
      v-if="booksStore.showForm"
      :book="booksStore.editingBook"
      @close="booksStore.closeForm()"
      @saved="booksStore.closeForm()"
    />
    <CheckoutDrawer />
    <Toaster richColors position="top-center" />
  </div>
</template>
```

- [ ] **Step 2: Verify build compiles (components not yet created)**

Run: `npm run build` (from `frontend/`)
Expected: Build will fail because AppNavbar, AppSidebar, BottomDock don't exist yet — that's expected. Continue to next tasks.

- [ ] **Step 3: Commit**

```bash
git add frontend/layouts/app.vue
git commit -m "feat: create app layout shell with sidebar grid and bottom dock slot"
```

---

### Task 3: Create `components/AppNavbar.vue`

**Files:**
- Create: `frontend/components/AppNavbar.vue`

- [ ] **Step 1: Create AppNavbar.vue**

```vue
<script setup lang="ts">
import {
  User,
  LogOut,
  Shield,
  Search,
} from 'lucide-vue-next';
import { useAuthStore } from '~/stores/auth';

const auth = useAuthStore();
const open = shallowRef(false);
const dropdownRef = shallowRef<HTMLElement | null>(null);
const buttonRef = shallowRef<HTMLElement | null>(null);
const router = useRouter();
const route = useRoute();

function onClickOutside(e: MouseEvent) {
  if (!open.value) return;
  const target = e.target as Node;
  if (dropdownRef.value?.contains(target) || buttonRef.value?.contains(target)) return;
  open.value = false;
}

onMounted(() => document.addEventListener('click', onClickOutside));
onUnmounted(() => document.removeEventListener('click', onClickOutside));

const userInitials = computed(() => {
  if (!auth.user) return '';
  return auth.user.name
    .split(' ')
    .map((n: string) => n[0])
    .join('');
});

function navigate(path: string) {
  open.value = false;
  router.push(path);
}

const isActive = (path: string): boolean => route.path.startsWith(path);
</script>

<template>
  <nav
    aria-label="Primary navigation"
    class="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur-md md:px-6"
  >
    <div class="flex items-center gap-8">
      <NuxtLink to="/home" class="font-serif text-xl font-bold italic tracking-tight text-primary">
        Read<span class="text-foreground"> in </span>Pace
      </NuxtLink>
      <div class="hidden items-center gap-6 text-xs font-medium uppercase tracking-wider text-muted-foreground md:flex">
        <NuxtLink
          to="/home"
          class="transition-colors hover:text-foreground"
          :class="isActive('/home') ? 'border-b border-primary text-foreground' : ''"
        >
          Home
        </NuxtLink>
        <NuxtLink
          to="/explore"
          class="transition-colors hover:text-foreground"
          :class="isActive('/explore') ? 'border-b border-primary text-foreground' : ''"
        >
          Explore
        </NuxtLink>
        <NuxtLink
          to="/shelf"
          class="transition-colors hover:text-foreground"
          :class="isActive('/shelf') ? 'border-b border-primary text-foreground' : ''"
        >
          Shelf
        </NuxtLink>
        <NuxtLink
          to="/social"
          class="transition-colors hover:text-foreground"
          :class="isActive('/social') ? 'border-b border-primary text-foreground' : ''"
        >
          Social
        </NuxtLink>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <label class="relative hidden sm:block">
        <span class="sr-only">Search books</span>
        <Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Search titles, authors..."
          class="w-56 rounded-sm border-0 bg-input py-2 pl-9 pr-3 text-sm placeholder-muted-foreground focus:ring-1 focus:ring-ring lg:w-64"
        />
      </label>
      <CartIcon />
      <div class="relative">
        <button
          ref="buttonRef"
          @click="open = !open"
          class="flex h-9 w-9 items-center cursor-pointer justify-center rounded-sm bg-transparent text-muted-foreground transition-colors hover:text-primary"
          aria-label="Profile menu"
        >
          <span v-if="auth.signedIn && auth.user" class="text-sm font-semibold">
            {{ userInitials }}
          </span>
          <User v-else class="h-4 w-4" />
        </button>
        <div
          v-if="open"
          ref="dropdownRef"
          class="absolute right-0 mt-2 w-60 origin-top-right rounded-xl border border-border bg-card p-2 shadow-md"
        >
          <template v-if="auth.signedIn">
            <div class="px-3 py-2">
              <p class="text-sm font-medium">{{ auth.user?.name }}</p>
              <p class="text-xs text-muted-foreground">{{ auth.user?.email }}</p>
            </div>
            <div class="my-1 h-px bg-border" />
            <Button
              variant="archivalGhost"
              class="w-full justify-start"
              @mousedown="navigate('/shelf')"
            >
              Shelf
            </Button>
            <Button
              variant="archivalGhost"
              class="w-full justify-between"
              @mousedown="auth.toggleAdmin()"
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
            </Button>
            <Button
              variant="archivalGhost"
              class="w-full justify-start text-destructive"
              @mousedown="auth.signOut()"
            >
              <LogOut class="h-4 w-4" /> Sign out
            </Button>
          </template>
          <template v-else>
            <Button
              variant="archivalGhost"
              class="w-full justify-start"
              @mousedown="auth.openAuthModal()"
            >
              Sign in
            </Button>
          </template>
        </div>
      </div>
    </div>
  </nav>
  <AuthModal v-if="auth.showAuthModal" @close="auth.closeAuthModal()" />
</template>
```

- [ ] **Step 2: Verify component renders**

Run: `npm run dev` (from `frontend/`)
Expected: Dev server starts. AppNavbar shows on any page using the `app` layout (none yet — so no visual change yet).

- [ ] **Step 3: Commit**

```bash
git add frontend/components/AppNavbar.vue
git commit -m "feat: create AppNavbar with logo, tab nav, search, cart, profile dropdown"
```

---

### Task 4: Create `components/BottomDock.vue`

**Files:**
- Create: `frontend/components/BottomDock.vue`

- [ ] **Step 1: Create BottomDock.vue**

```vue
<script setup lang="ts">
import { Home, Search, Library, MessageCircle } from 'lucide-vue-next';

const route = useRoute();

const tabs = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/explore', icon: Search, label: 'Explore' },
  { to: '/shelf', icon: Library, label: 'Shelf' },
  { to: '/social', icon: MessageCircle, label: 'Social' },
];
</script>

<template>
  <div class="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-8 rounded-full border border-background/10 bg-foreground px-8 py-3 shadow-2xl">
    <NuxtLink
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      class="flex h-auto flex-col items-center gap-0.5 rounded-none bg-transparent p-0 text-background shadow-none transition-colors hover:text-primary"
      :class="route.path === tab.to ? 'text-primary' : ''"
    >
      <component :is="tab.icon" class="h-4 w-4" />
      <span class="font-mono text-[8px] uppercase opacity-60">{{ tab.label }}</span>
    </NuxtLink>
  </div>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/BottomDock.vue
git commit -m "feat: create BottomDock with Home/Explore/Shelf/Social floating pill nav"
```

---

### Task 5: Create `components/AppSidebar.vue`

**Files:**
- Create: `frontend/components/AppSidebar.vue`

- [ ] **Step 1: Create AppSidebar.vue**

```vue
<template>
  <div class="space-y-10">
    <section class="relative border border-border bg-card p-6 shadow-sm">
      <div class="absolute inset-y-0 left-0 w-1 bg-primary" />
      <h2 class="mb-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Yearly Progress
      </h2>
      <slot name="yearly-progress">
        <p class="text-sm italic text-muted-foreground">Set a reading goal to get started.</p>
      </slot>
    </section>

    <section>
      <div class="mb-4 flex items-baseline justify-between border-b border-border pb-2">
        <h2 class="font-serif text-xl">Reader Feed</h2>
        <span class="size-2 rounded-full bg-primary" />
      </div>
      <div class="space-y-6">
        <slot name="reader-feed">
          <p class="text-sm italic text-muted-foreground">No recent activity. Join the conversation.</p>
        </slot>
      </div>
    </section>

    <section class="rounded-sm border-2 border-dashed border-border p-6 text-center">
      <p class="mb-4 font-serif text-sm italic">
        Join the literary circles in your neighborhood.
      </p>
      <slot name="book-club">
        <Button variant="archivalOutline" class="w-full uppercase tracking-widest">
          Find a Book Club
        </Button>
      </slot>
    </section>
  </div>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/AppSidebar.vue
git commit -m "feat: create AppSidebar with Yearly Progress, Reader Feed, Book Club slots"
```

---

### Task 6: Create Page Shells (home, explore, shelf, social)

**Files:**
- Create: `frontend/pages/home.vue`
- Create: `frontend/pages/explore.vue`
- Create: `frontend/pages/shelf.vue`
- Create: `frontend/pages/social.vue`

- [ ] **Step 1: Create pages/home.vue**

```vue
<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Home — Read in Peace',
  description: 'Your personal library dashboard.',
});
</script>

<template>
  <section>
    <div class="mb-6 flex items-baseline justify-between border-b border-border pb-2">
      <h1 class="font-serif text-2xl">Active Loans</h1>
    </div>
    <p class="text-muted-foreground italic">You don't have any active loans yet. Find something in the Explore tab.</p>
  </section>
</template>
```

- [ ] **Step 2: Create pages/explore.vue**

Copy content from `pages/feed.vue`, remove the `<Navbar />` from the template, and update the SEO meta:

```vue
<script setup lang="ts">
import { useBooksStore } from '~/stores/books';
import { useAuthStore } from '~/stores/auth';

const booksStore = useBooksStore();
const auth = useAuthStore();

const { page, activeCategory, categories, totalPages, setPage, setCategory } = useShelf();

const booksList = computed(() => [...booksStore.books]);
const trendingList = computed(() => [...booksStore.trending]);

function handleEdit(book: import('~/stores/books').BookWithMeta) {
  booksStore.openEditForm(book);
}

function handleAddBook() {
  booksStore.openCreateForm();
}

watch(() => booksStore.showForm, (showing) => {
  if (!showing) {
    booksStore.fetchBooks(page.value, 12, activeCategory.value === 'All' ? undefined : activeCategory.value);
  }
});

definePageMeta({
  layout: 'app',
  title: 'Explore — Read in Peace',
  description: 'Browse trending books and the full library on Read in Peace.',
});
</script>

<template>
  <div class="animate-enter">
    <TrendingSection :trending="trendingList" />
  </div>

  <div class="animate-enter [animation-delay:150ms]">
    <BookShelf
      :books="booksList"
      :categories="categories"
      :active-category="activeCategory"
      :page="page"
      :total-pages="totalPages"
      :admin-mode="auth.adminMode"
      @edit="handleEdit"
      @add-book="handleAddBook"
      @category-change="setCategory"
      @page-change="setPage"
    />
  </div>
</template>
```

- [ ] **Step 3: Create pages/shelf.vue**

Copy content from `pages/dashboard.vue`, remove the `<Navbar />`, change the "Find something to read" link to `/explore`, update SEO:

```vue
<script setup lang="ts">
import { BookMarked, Library } from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import { useAuthStore } from '~/stores/auth';
import { useDashboardStore } from '~/stores/dashboard';
import { useCartStore } from '~/stores/cart';
import type { BookWithMeta } from '~/stores/books';

const auth = useAuthStore();
const dashboard = useDashboardStore();
const cartStore = useCartStore();
const route = useRoute();
const tab = shallowRef<'borrowed' | 'purchased'>(
  (route.query.tab as 'borrowed' | 'purchased') || 'borrowed',
);

const borrowedBooks = computed(() => dashboard.borrowed);
const purchasedBooks = computed(() => dashboard.purchased);
const list = computed(() =>
  tab.value === 'borrowed' ? dashboard.borrowed : dashboard.purchased,
);

function setTab(t: 'borrowed' | 'purchased') {
  tab.value = t;
  navigateTo({ query: { tab: t } }, { replace: true });
}

onMounted(async () => {
  if (route.query.session_id) {
    try {
      await dashboard.confirmPurchase(route.query.session_id as string);
      cartStore.clear();
      toast.success('Purchase complete!');
    } catch {
      toast.error('Purchase confirmation failed');
    }
  }
  await Promise.all([dashboard.fetchBorrows(), dashboard.fetchPurchases()]);
});

definePageMeta({
  layout: 'app',
  title: 'My Shelf — Read in Peace',
});
</script>

<template>
  <div class="animate-enter">
    <p class="text-sm text-muted-foreground">Welcome back</p>
    <h1 class="mt-1 text-4xl font-semibold tracking-tight">
      {{ auth.user?.name || 'Reader' }}
    </h1>
  </div>

  <div class="animate-enter [animation-delay:100ms] flex gap-6 border-b border-border/60">
    <button
      @click="setTab('borrowed')"
      class="flex items-center gap-2 pb-3 cursor-pointer text-sm font-medium transition-all duration-200 border-b-2 -mb-px"
      :class="
        tab === 'borrowed'
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      "
    >
      <BookMarked class="h-4 w-4" /> Borrowed {{ borrowedBooks.length }}
    </button>
    <button
      @click="setTab('purchased')"
      class="flex items-center gap-2 pb-3 cursor-pointer text-sm font-medium transition-all duration-200 border-b-2 -mb-px"
      :class="
        tab === 'purchased'
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      "
    >
      <Library class="h-4 w-4" /> Purchased {{ purchasedBooks.length }}
    </button>
  </div>

  <div class="animate-enter [animation-delay:200ms]">
    <template v-if="list.length === 0">
      <div class="rounded-2xl border border-dashed border-border/60 py-20 text-center">
        <p class="text-muted-foreground">Nothing here yet.</p>
        <NuxtLink to="/explore" class="mt-3 inline-block text-sm font-medium text-primary hover:underline">
          Find something to read
        </NuxtLink>
      </div>
    </template>
    <template v-else>
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <BookCard
          v-for="item in list"
          :key="'borrow' in item ? item.borrow.id : item.purchase.id"
          :book="item.book as BookWithMeta"
          :variant="tab"
        />
      </div>
    </template>
  </div>
</template>
```

- [ ] **Step 4: Create pages/social.vue**

```vue
<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Social — Read in Peace',
  description: 'Reader feed and community discussions.',
});
</script>

<template>
  <section>
    <div class="mb-6 flex items-baseline justify-between border-b border-border pb-2">
      <h1 class="font-serif text-2xl">Reader Feed</h1>
    </div>
    <p class="text-muted-foreground italic">Community features coming soon.</p>
  </section>
</template>
```

- [ ] **Step 5: Commit**

```bash
git add frontend/pages/home.vue frontend/pages/explore.vue frontend/pages/shelf.vue frontend/pages/social.vue
git commit -m "feat: create page shells for home, explore, shelf, social with app layout"
```

---

### Task 7: Redirect Old Pages and Fix Layout References

**Files:**
- Modify: `frontend/pages/feed.vue`
- Modify: `frontend/pages/dashboard.vue`
- Modify: `frontend/pages/book/[id].vue`
- Modify: `frontend/pages/index.vue`

- [ ] **Step 1: Redirect feed.vue to /explore**

Replace the entire `pages/feed.vue`:

```vue
<script setup lang="ts">
definePageMeta({
  redirect: '/explore',
});
</script>
```

- [ ] **Step 2: Redirect dashboard.vue to /shelf**

Replace the entire `pages/dashboard.vue`:

```vue
<script setup lang="ts">
definePageMeta({
  redirect: '/shelf',
});
</script>
```

- [ ] **Step 3: Update book/[id].vue to use app layout**

Add `layout: 'app'` to the existing `definePageMeta`:

```ts
definePageMeta({
  layout: 'app',
  title: 'Book — Read in Peace',
});
```

Also remove the `<Navbar />` from the template (it was at the top of the template block).

- [ ] **Step 4: Add explicit layout to index.vue**

Add `layout: 'default'` to the existing `definePageMeta`:

```ts
definePageMeta({
  layout: 'default',
  title: "Read in Peace — A calmer way to read",
  description:
    "A quiet library to review, borrow, return, and buy books at your own pace.",
});
```

- [ ] **Step 5: Verify navigation works**

Run: `npm run dev` (from `frontend/`)
Expected:
- `/` → Landing page (video, no nav)
- `/home` → Dashboard placeholder with AppNavbar + BottomDock
- `/explore` → Book browsing with sidebar
- `/shelf` → Borrowed/purchased
- `/social` → Social placeholder
- `/feed` → Redirects to /explore
- `/dashboard` → Redirects to /shelf
- `/book/1` → Book detail (no more Navbar in template, uses app layout)

- [ ] **Step 6: Commit**

```bash
git add frontend/pages/feed.vue frontend/pages/dashboard.vue frontend/pages/book/\[id\].vue frontend/pages/index.vue
git commit -m "feat: redirect old pages, update layout references for new app layout"
```

---

### Task 8: Final Verification Build

- [ ] **Step 1: Build the frontend**

Run from `frontend/`: `npm run build`
Expected: Client + server build succeeds with no errors (Tailwind sourcemap warnings are pre-existing and OK).

- [ ] **Step 2: Visual checklist**

Start dev server and verify:
1. Landing page (`/`): video background, CTA button, no navbar or dock
2. Home page (`/home`): AppNavbar visible, "Active Loans" heading, BottomDock visible
3. Explore page (`/explore`): Trending section + BookShelf render, sidebar visible
4. Shelf page (`/shelf`): Borrowed/purchased tabs, book cards, sidebar
5. Social page (`/social`): "Reader Feed" heading, sidebar
6. Book detail (`/book/1`): cover, details, comments, sidebar
7. Old `/feed` → redirects to `/explore`
8. Old `/dashboard` → redirects to `/shelf`
9. Bottom dock active state: correct tab highlighted per route
10. Cart drawer opens/closes
11. Auth modal opens/closes
12. AdminFab visible in admin mode

- [ ] **Step 3: Commit any fixes**

If verification reveals issues, fix and commit them.
