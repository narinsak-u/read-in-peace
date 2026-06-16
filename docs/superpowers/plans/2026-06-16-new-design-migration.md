# New Design Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strip frontend down to 4 pages (landing, dashboard, book detail, cart) matching `new_design/` pixel-perfectly. Remove all unused UI.

**Architecture:** All pages are self-contained (inline navbars, no shared app layout). Home page is a single-page scrollable dashboard with sections. Book detail uses 3-column layout. Cart page with discounts preserved. Auth/Stripe/API proxy kept.

**Tech Stack:** Nuxt 3, Vue 3 Composition API, Tailwind v4, Pinia, Better Auth, lucide-vue-next, vue-sonner

---

## File Structure

### Create
- `frontend/pages/home.vue` — Dashboard (port of `new_design/src/routes/index.tsx`)
- `frontend/pages/book/[id].vue` — Book detail (port of `new_design/src/routes/book.$bookId.tsx`)
- `frontend/pages/cart.vue` — Cart (port of `new_design/src/routes/cart.tsx`)
- `frontend/components/CoverImage.vue` — Renders cover (direct image or sprite crop)
- `frontend/error.vue` — 404/error page (port of new_design NotFoundComponent)

### Delete
- `frontend/pages/explore.vue`, `frontend/pages/shelf.vue`, `frontend/pages/social.vue`, `frontend/pages/dashboard.vue`, `frontend/pages/feed.vue`
- `frontend/layouts/app.vue`, `frontend/layouts/cart.vue`
- `frontend/components/AppNavbar.vue`, `frontend/components/Navbar.vue`, `frontend/components/AppSidebar.vue`, `frontend/components/BottomDock.vue`
- `frontend/components/BookCard.vue`, `frontend/components/BookShelf.vue`, `frontend/components/TrendingSection.vue`, `frontend/components/BookDetails.vue`, `frontend/components/BookActions.vue`, `frontend/components/BookRating.vue`, `frontend/components/BookComments.vue`, `frontend/components/BookShare.vue`, `frontend/components/BookFormModal.vue`, `frontend/components/AdminFab.vue`
- `frontend/components/FeedPost.vue`, `frontend/components/CompactFeedPosts.vue`, `frontend/components/YearlyProgressCard.vue`
- `frontend/components/CheckoutDrawer.vue`, `frontend/components/CartIcon.vue`, `frontend/components/Footer.vue`
- `frontend/stores/books.ts`, `frontend/stores/dashboard.ts`, `frontend/stores/social.ts`, `frontend/stores/readingGoal.ts`
- `frontend/composables/useBookDetail.ts`, `frontend/composables/useShelf.ts`
- `frontend/data/books.ts`
- `frontend/plugins/cart-persist.client.ts`

### Modify
- `frontend/stores/cart.ts` — Refactor CartItem type: remove `category`, rename `bookId` to `id`, keep quantity + discount + checkout
- `frontend/components/AuthModal.vue` — Restyle to new_design visual language
- `frontend/app.vue` — Keep as `<NuxtLayout><NuxtPage /></NuxtLayout>` (verify no changes needed)

### Copy asset files
- `new_design/src/assets/book-cover-sheet.png` → `frontend/public/images/book-cover-sheet.png`
- `new_design/src/assets/architecture-memory.png` → `frontend/public/images/architecture-memory.png`

---

### Task 1: Cleanup — Remove unused files

**Files:**
- Delete: All files listed in "Delete" section above

- [ ] **Step 1: Delete all unused pages**

Run:
```bash
rm -f frontend/pages/explore.vue frontend/pages/shelf.vue frontend/pages/social.vue frontend/pages/dashboard.vue frontend/pages/feed.vue
```

- [ ] **Step 2: Delete unused layouts**

Run:
```bash
rm -f frontend/layouts/app.vue frontend/layouts/cart.vue
```

- [ ] **Step 3: Delete unused components**

Run:
```bash
rm -f frontend/components/AppNavbar.vue frontend/components/Navbar.vue frontend/components/AppSidebar.vue frontend/components/BottomDock.vue frontend/components/BookCard.vue frontend/components/BookShelf.vue frontend/components/TrendingSection.vue frontend/components/BookDetails.vue frontend/components/BookActions.vue frontend/components/BookRating.vue frontend/components/BookComments.vue frontend/components/BookShare.vue frontend/components/BookFormModal.vue frontend/components/AdminFab.vue frontend/components/FeedPost.vue frontend/components/CompactFeedPosts.vue frontend/components/YearlyProgressCard.vue frontend/components/CheckoutDrawer.vue frontend/components/CartIcon.vue frontend/components/Footer.vue
```

- [ ] **Step 4: Delete unused stores, composables, data, plugins**

Run:
```bash
rm -f frontend/stores/books.ts frontend/stores/dashboard.ts frontend/stores/social.ts frontend/stores/readingGoal.ts frontend/composables/useBookDetail.ts frontend/composables/useShelf.ts frontend/data/books.ts frontend/plugins/cart-persist.client.ts
```

- [ ] **Step 5: Verify nothing is left that imports deleted files**

Run:
```bash
cd frontend && npx nuxi typecheck 2>&1 | head -30
```
Expected: Type errors from deleted imports are OK — they'll be resolved by later tasks.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: remove unused frontend files for new_design migration"
```

---

### Task 2: Copy assets

**Files:**
- Copy: `new_design/src/assets/book-cover-sheet.png` → `frontend/public/images/book-cover-sheet.png`
- Copy: `new_design/src/assets/architecture-memory.png` → `frontend/public/images/architecture-memory.png`

- [ ] **Step 1: Create images directory and copy assets**

```bash
mkdir -p frontend/public/images && cp new_design/src/assets/book-cover-sheet.png frontend/public/images/book-cover-sheet.png && cp new_design/src/assets/architecture-memory.png frontend/public/images/architecture-memory.png
```

- [ ] **Step 2: Verify files exist**

```bash
ls -la frontend/public/images/
```
Expected: `book-cover-sheet.png` and `architecture-memory.png` present.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: copy new_design sprite sheet and cover assets"
```

---

### Task 3: Create CoverImage component

**Files:**
- Create: `frontend/components/CoverImage.vue`

This is a reusable component that renders a book cover either as a direct image (when `crop` is null) or as a sprite-sheet crop (when `crop` is 0-5).

- [ ] **Step 1: Write CoverImage.vue**

Create `frontend/components/CoverImage.vue`:

```vue
<script setup lang="ts">
import coverSheet from '~/public/images/book-cover-sheet.png'

withDefaults(defineProps<{
  crop: number | null
  src?: string | null
  alt?: string
  class?: string
}>(), {
  src: null,
  alt: 'Book cover',
  class: '',
})
</script>

<template>
  <div v-if="crop !== null" :class="`cover-crop cover-${crop} ${class}`">
    <img :src="coverSheet" :alt="alt" width="1536" height="1536" loading="lazy" />
  </div>
  <img v-else :src="src" :alt="alt" width="768" height="1152" loading="lazy" :class="class" />
</template>
```

Actually, Nuxt auto-imports from `~/` path. But `public/` files are served as static assets. The image path should be relative to the `public/` directory. So we should reference `/images/book-cover-sheet.png` directly, not import it.

Let me fix:

```vue
<script setup lang="ts">
withDefaults(defineProps<{
  crop: number | null
  src?: string
  alt?: string
  class?: string
}>(), {
  src: '',
  alt: 'Book cover',
  class: '',
})
</script>

<template>
  <div v-if="crop !== null" :class="`cover-crop cover-${crop} ${class}`">
    <img src="/images/book-cover-sheet.png" :alt="alt" width="1536" height="1536" loading="lazy" />
  </div>
  <img v-else :src="src" :alt="alt" width="768" height="1152" loading="lazy" :class="class" />
</template>
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add CoverImage component for book covers"
```

---

### Task 4: Refactor cart store

**Files:**
- Modify: `frontend/stores/cart.ts`

- [ ] **Step 1: Read current cart store**

Read `frontend/stores/cart.ts` to understand current structure.

- [ ] **Step 2: Rewrite cart store to match new_design CartItem shape**

The new_design `CartItem` type is:
```ts
interface CartItem {
  id: string
  title: string
  author: string
  price: number
  cover: string
  crop: number | null
  quantity: number
}
```

Keep from current store:
- `itemCount` (sum of quantities)
- `subtotal`
- `addItem` (increment quantity if exists)
- `removeItem`
- `setQuantity`
- `checkout()` (Stripe redirect)
- Discount pipeline integration

Simplify:
- Rename `bookId` → `id`
- Remove `category` field
- Remove drawer-related state (`drawerOpen`, `openDrawer`, `closeDrawer`, `toggleDrawer`) — no CheckoutDrawer anymore
- Keep manual localStorage persistence (call `hydrateFromStorage` in store setup)

Write the refactored store:

```ts
import { defineStore } from 'pinia'
import type { DatabaseBook } from '~/types'

export interface CartItem {
  id: string
  title: string
  author: string
  price: number
  cover: string
  crop: number | null
  quantity: number
}

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])

  const itemCount = computed(() =>
    items.value.reduce((sum, item) => sum + item.quantity, 0),
  )

  const subtotal = computed(() =>
    items.value.reduce((sum, item) => sum + item.price * item.quantity, 0),
  )

  const isEmpty = computed(() => items.value.length === 0)

  function addItem(item: Omit<CartItem, 'quantity'>) {
    const existing = items.value.find((i) => i.id === item.id)
    if (existing) {
      existing.quantity++
    } else {
      items.value.push({ ...item, quantity: 1 })
    }
    persist()
  }

  function removeItem(id: string) {
    items.value = items.value.filter((i) => i.id !== id)
    persist()
  }

  function setQuantity(id: string, quantity: number) {
    if (quantity <= 0) {
      removeItem(id)
      return
    }
    const item = items.value.find((i) => i.id === id)
    if (item) {
      item.quantity = quantity
    }
    persist()
  }

  function clear() {
    items.value = []
    persist()
  }

  function hydrateFromStorage() {
    try {
      const stored = localStorage.getItem('read-in-pace-cart')
      if (stored) {
        items.value = JSON.parse(stored)
      }
    } catch {
      // ignore
    }
  }

  function persist() {
    localStorage.setItem('read-in-pace-cart', JSON.stringify(items.value))
  }

  hydrateFromStorage()
  watch(items, persist, { deep: true })

  return {
    items,
    itemCount,
    subtotal,
    isEmpty,
    addItem,
    removeItem,
    setQuantity,
    clear,
    hydrateFromStorage,
  }
})
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: refactor cart store to new_design CartItem shape"
```

---

### Task 5: Write the home page (dashboard)

**Files:**
- Create: `frontend/pages/home.vue`

- [ ] **Step 1: Write the home page**

Port `new_design/src/routes/index.tsx` (562 lines) pixel-perfectly to Vue.

The Vue page must:
- Be fully self-contained (its own navbar, sections, sidebar, bottom dock, review modal, toast)
- Use `definePageMeta({ title: 'Ex Libris — Social Library', description: '...' })`
- Use static data matching new_design's 5-book catalog
- Import and use `CoverImage` component for cover crops
- Use `lucide-vue-next` icons: `BookOpen`, `Home`, `Library`, `MessageCircle`, `Search`, `Settings`, `ShoppingBag`, `Star`
- Use Button component with archival variants
- Implement scroll-to-section with `scrollIntoView({ behavior: 'smooth' })`
- Implement flash toast with `setTimeout` 2400ms
- Implement review modal with backdrop click-to-close
- Connect cart store for Buy buttons
- Use `useRouter` for navigation (Nuxt auto-imports)

Key mapping from React to Vue:
- `useState` → `ref`
- `useMemo` → `computed`
- `onClick` → `@click`
- `className` → `class`
- JSX → `<template>` with `v-if`, `v-for`, `:class`

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  BookOpen, Home, Library, MessageCircle, Search, Settings, ShoppingBag, Star,
} from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import CoverImage from '~/components/CoverImage.vue'
import { useCartStore } from '~/stores/cart'

definePageMeta({
  title: 'Ex Libris — Social Library',
  description: 'Borrow, return, buy, review, rate, and discuss books with fellow readers.',
  layout: 'default',
})

const router = useRouter()
const cart = useCartStore()

const arrivals = [
  { id: 'the-hidden-sea', title: 'The Hidden Sea', author: 'Eliot Harbor', crop: 2, rating: 4.7, price: 18.5 },
  { id: 'logic-and-form', title: 'Logic & Form', author: 'Adrian Wakefield', crop: 3, rating: 4.3, price: 24 },
  { id: 'paper-shadows', title: 'Paper Shadows', author: 'Maeve Lincoln', crop: 4, rating: 4.8, price: 16 },
  { id: 'the-long-night', title: 'The Long Night', author: 'Daniel Hastings', crop: 5, rating: 4.1, price: 19.99 },
]

const query = ref('')
const returned = ref<string[]>([])
const borrowed = ref<string[]>([])
const liked = ref(false)
const reviewOpen = ref(false)
const rating = ref(0)
const reviewText = ref('')
const notice = ref('')

const filtered = computed(() =>
  arrivals.filter((book) =>
    `${book.title} ${book.author}`.toLowerCase().includes(query.value.toLowerCase()),
  ),
)

function flash(message: string) {
  notice.value = message
  window.setTimeout(() => { notice.value = '' }, 2400)
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<template>
  <div class="min-h-screen bg-background pb-28 text-foreground selection:bg-primary/10 selection:text-primary">
    <nav
      aria-label="Primary navigation"
      class="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur-md md:px-6"
    >
      <div class="flex items-center gap-8">
        <button
          @click="scrollTo('loans')"
          class="font-serif text-xl font-bold italic tracking-tight text-primary"
        >
          Read in Peace
        </button>
        <div class="hidden items-center gap-6 text-xs font-medium uppercase tracking-wider text-muted-foreground md:flex">
          <button @click="scrollTo('loans')" class="border-b border-primary text-foreground">Dashboard</button>
          <button @click="scrollTo('arrivals')" class="transition-colors hover:text-foreground">Discover</button>
          <button @click="scrollTo('loans')" class="transition-colors hover:text-foreground">The Stacks</button>
          <button @click="scrollTo('feed')" class="transition-colors hover:text-foreground">Archive</button>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <label class="relative hidden sm:block">
          <span class="sr-only">Search books</span>
          <Search class="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <input
            v-model="query"
            placeholder="Search titles, authors..."
            class="w-56 rounded-sm border-0 bg-input py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:ring-1 focus:ring-ring lg:w-64"
          />
        </label>
        <Button variant="archivalGhost" size="icon" @click="router.push('/cart')" :aria-label="`Cart with ${cart.itemCount} items`" class="relative">
          <ShoppingBag />
          <span v-if="cart.itemCount > 0" class="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[8px] text-primary-foreground">{{ cart.itemCount }}</span>
        </Button>
        <Button size="icon" variant="archival" aria-label="Open reader profile" class="rounded-full text-xs italic">JS</Button>
      </div>
    </nav>

    <main class="mx-auto grid max-w-7xl grid-cols-12 gap-10 px-4 py-8 md:px-6">
      <div class="col-span-12 space-y-12 lg:col-span-8">
        <section id="loans" class="animate-enter scroll-mt-24">
          <div class="mb-6 flex items-baseline justify-between border-b border-border pb-2">
            <h1 class="font-serif text-2xl">Active Loans</h1>
            <span class="font-mono text-[10px] uppercase text-muted-foreground">{{ 3 - returned.length }} items currently on desk</span>
          </div>

          <article v-if="!returned.includes('memory')" class="group flex flex-col gap-8 rounded-sm border border-border bg-card p-5 md:flex-row md:p-6">
            <div class="shrink-0 self-center shadow-xl transition-transform duration-500 group-hover:-translate-y-1 md:self-auto">
              <img
                src="/images/architecture-memory.png"
                alt="The Architecture of Memory book cover"
                width="768"
                height="1152"
                class="h-[270px] w-[180px] object-cover"
              />
            </div>
            <div class="flex flex-1 flex-col justify-between py-2">
              <div>
                <div class="mb-2 flex flex-wrap items-center gap-2">
                  <span class="rounded-sm bg-primary px-2 py-0.5 font-mono text-[10px] text-primary-foreground">DUE IN 2 DAYS</span>
                  <span class="font-mono text-[10px] uppercase text-muted-foreground">Shelf: 720.1 ARC</span>
                </div>
                <h2 class="mb-1 font-serif text-3xl font-bold">
                  <NuxtLink to="/book/architecture-of-memory" class="transition-colors hover:text-primary">The Architecture of Memory</NuxtLink>
                </h2>
                <p class="mb-4 italic text-muted-foreground">by Elena Rossi-Vaughn</p>
                <div class="mb-6 flex items-center gap-1" aria-label="Rated 4.2 out of 5">
                  <span class="text-lg text-primary">★★★★</span>
                  <span class="text-lg text-foreground/10">★</span>
                  <span class="ml-2 text-[11px] font-medium tracking-tight text-muted-foreground">4.2 AVG RATING</span>
                </div>
                <div class="h-1.5 w-full overflow-hidden rounded-full bg-foreground/5">
                  <div class="h-full w-[64%] bg-primary" />
                </div>
                <p class="mt-2 font-mono text-[11px] text-muted-foreground">PAGE 218 OF 340 (64%)</p>
              </div>
              <div class="mt-6 flex flex-wrap gap-3">
                <Button variant="archival" @click="() => { returned.push('memory'); flash('Book returned. Thank you!') }">Return Book</Button>
                <Button variant="archivalOutline" @click="reviewOpen = true">Write Review</Button>
                <Button variant="archivalGhost" @click="() => { cart.addItem({ id: 'architecture-of-memory', title: 'The Architecture of Memory', author: 'Elena Rossi-Vaughn', price: 21, cover: '/images/architecture-memory.png', crop: null }); flash('The Architecture of Memory added to your cart.') }">
                  <ShoppingBag /> Buy $21.00
                </Button>
              </div>
            </div>
          </article>

          <div class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <template v-for="book in [
              { key: 'springs', title: 'Silent Springs Revisited', author: 'Marissa Langford', crop: 0 as const, due: 'DUE: JUN 22' },
              { key: 'urbanism', title: 'Urbanism 2050', author: 'Lena Parker', crop: 1 as const, due: 'OVERDUE (3D)' },
            ].filter(b => !returned.includes(b.key))" :key="book.key">
              <article class="group flex gap-4 rounded-sm border border-border bg-card p-4 transition-colors hover:border-primary/30">
                <CoverImage :crop="book.crop" class="h-24 w-16 shrink-0 shadow-sm" />
                <div class="flex min-w-0 flex-1 flex-col justify-center">
                  <h3 class="font-serif text-sm font-bold leading-tight">{{ book.title }}</h3>
                  <p class="mb-2 text-xs italic text-muted-foreground">{{ book.author }}</p>
                  <div class="flex items-center justify-between gap-2">
                    <span :class="`font-mono text-[10px] ${book.key === 'urbanism' ? 'font-bold text-primary' : 'text-muted-foreground'}`">{{ book.due }}</span>
                    <Button size="sm" variant="archivalGhost" @click="() => { returned.push(book.key); flash(`${book.title} returned.`) }">Return</Button>
                  </div>
                </div>
              </article>
            </template>
          </div>
        </section>

        <section id="arrivals" class="animate-enter scroll-mt-24 [animation-delay:150ms]">
          <div class="mb-6 flex items-baseline justify-between border-b border-border pb-2">
            <h2 class="font-serif text-2xl">New Arrivals</h2>
            <span class="font-mono text-[10px] uppercase text-muted-foreground">Curated this week</span>
          </div>
          <div class="mb-5 sm:hidden">
            <input
              v-model="query"
              placeholder="Search new arrivals..."
              class="w-full rounded-sm bg-input px-4 py-2 text-sm"
            />
          </div>
          <div v-if="filtered.length > 0" class="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-4">
            <article v-for="book in filtered" :key="book.id" class="group">
              <NuxtLink :to="`/book/${book.id}`" :aria-label="`View ${book.title}`">
                <CoverImage :crop="book.crop" class="mb-3 aspect-[2/3] shadow-md transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl" />
              </NuxtLink>
              <h3 class="font-serif text-sm font-bold transition-colors group-hover:text-primary">
                <NuxtLink :to="`/book/${book.id}`">{{ book.title }}</NuxtLink>
              </h3>
              <p class="text-xs text-muted-foreground">{{ book.author }}</p>
              <div class="mt-1 flex items-center gap-1 text-[10px] text-primary">
                <Star class="size-3 fill-current" /> {{ book.rating }}
              </div>
              <div class="mt-3 flex gap-1">
                <Button
                  size="sm"
                  :variant="borrowed.includes(book.title) ? 'archivalOutline' : 'archival'"
                  :disabled="borrowed.includes(book.title)"
                  @click="() => { borrowed.push(book.title); flash(`${book.title} borrowed for 21 days.`) }"
                >
                  {{ borrowed.includes(book.title) ? 'Borrowed' : 'Borrow' }}
                </Button>
                <Button
                  size="icon"
                  variant="archivalGhost"
                  :aria-label="`Buy ${book.title}`"
                  @click="() => { cart.addItem({ id: book.id, title: book.title, author: book.author, price: book.price, cover: '/images/book-cover-sheet.png', crop: book.crop }); flash(`${book.title} added to your cart.`) }"
                >
                  <ShoppingBag />
                </Button>
              </div>
            </article>
          </div>
          <p v-else class="border-y border-border py-12 text-center font-serif italic text-muted-foreground">
            No volumes match "{{ query }}". Try another title or author.
          </p>
        </section>
      </div>

      <aside class="col-span-12 space-y-10 lg:col-span-4">
        <section class="animate-enter relative overflow-hidden border border-border bg-card p-6 shadow-sm [animation-delay:250ms]">
          <div class="absolute inset-y-0 left-0 w-1 bg-primary" />
          <h2 class="mb-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Yearly Progress</h2>
          <div class="mb-1 flex items-baseline gap-2">
            <span class="font-serif text-4xl font-bold">24</span>
            <span class="text-sm italic text-muted-foreground">of 50 books</span>
          </div>
          <div class="mb-4 h-1 w-full bg-foreground/5">
            <div class="h-full w-[48%] bg-foreground" />
          </div>
          <p class="text-[11px] leading-relaxed text-muted-foreground">
            You are <span class="text-primary">2 books behind</span> your 2026 reading goal. A short essay collection might be perfect this weekend.
          </p>
        </section>

        <section id="feed" class="animate-enter scroll-mt-24 [animation-delay:300ms]">
          <div class="mb-4 flex items-baseline justify-between border-b border-border pb-2">
            <h2 class="font-serif text-xl">Reader Feed</h2>
            <span class="size-2 rounded-full bg-primary" />
          </div>
          <div class="space-y-6">
            <article class="border-l border-foreground/5 pl-4">
              <div class="mb-1 flex items-center gap-2">
                <span class="flex size-6 items-center justify-center rounded-full bg-muted text-[8px] font-bold">AM</span>
                <span class="text-[11px] font-bold uppercase">Aris M.</span>
                <span class="font-mono text-[10px] text-muted-foreground">14m ago</span>
              </div>
              <p class="text-sm leading-snug text-foreground/80">
                "Rossi-Vaughn's chapter on brutalist memorials is devastating. Did anyone else catch the reference to Rossi's own cemetery design?"
              </p>
              <div class="mt-2 flex items-center gap-3">
                <Button variant="archivalGhost" size="sm" @click="flash('Reply composer opened.')"><MessageCircle /> Reply</Button>
                <Button variant="archivalGhost" size="sm" @click="liked = !liked" :class="liked ? 'text-primary' : ''">{{ liked ? 'Liked' : 'Like' }} ({{ liked ? 13 : 12 }})</Button>
              </div>
            </article>
            <article class="border-l border-foreground/5 pl-4">
              <div class="mb-1 flex items-center gap-2">
                <span class="flex size-6 items-center justify-center rounded-full bg-muted text-[8px] font-bold">LW</span>
                <span class="text-[11px] font-bold uppercase">Leo Wang</span>
                <span class="font-mono text-[10px] text-muted-foreground">2h ago</span>
              </div>
              <p class="text-sm leading-snug text-foreground/80">
                Just finished <span class="italic underline decoration-primary/30 underline-offset-2">Paper Shadows</span>. A little quiet in the middle, but the ending is worth it.
              </p>
              <p class="mt-2 text-xs text-primary" aria-label="3 out of 5 stars">★★★<span class="text-foreground/10">★★</span></p>
            </article>
            <article class="border-l border-foreground/5 pl-4">
              <div class="mb-1 flex items-center gap-2">
                <span class="flex size-6 items-center justify-center rounded-full bg-muted text-[8px] font-bold">SS</span>
                <span class="text-[11px] font-bold uppercase">Sarah S.</span>
                <span class="font-mono text-[10px] text-muted-foreground">Yesterday</span>
              </div>
              <p class="text-sm leading-snug text-foreground/80">Looking for recommendations on mid-century urban design. Any classics I'm missing?</p>
              <Button class="mt-2" variant="archivalGhost" size="sm" @click="flash('Discussion saved to your archive.')">View discussion</Button>
            </article>
          </div>
        </section>

        <section class="animate-enter rounded-sm border-2 border-dashed border-border p-6 text-center [animation-delay:350ms]">
          <p class="mb-4 font-serif text-sm italic">Join the literary circles in your neighborhood.</p>
          <Button class="w-full uppercase tracking-widest" variant="archivalOutline" @click="flash('We found 8 active clubs near you.')">Find a Book Club</Button>
        </section>
      </aside>
    </main>

    <div class="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-8 rounded-full border border-background/10 bg-foreground px-8 py-3 text-background shadow-2xl">
      <Button variant="archivalDock" @click="scrollTo('loans')"><Home /><span class="font-mono text-[8px] uppercase opacity-60">Home</span></Button>
      <Button variant="archivalDock" @click="scrollTo('arrivals')"><Library /><span class="font-mono text-[8px] uppercase opacity-60">Shelf</span></Button>
      <Button variant="archivalDock" @click="scrollTo('feed')"><MessageCircle /><span class="font-mono text-[8px] uppercase opacity-60">Social</span></Button>
      <Button variant="archivalDock" @click="flash('Reading preferences are up to date.')"><Settings /><span class="font-mono text-[8px] uppercase opacity-60">Prefs</span></Button>
    </div>

    <Teleport to="body">
      <div v-if="reviewOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="review-title" @mousedown="reviewOpen = false">
        <div class="w-full max-w-lg border border-border bg-background p-6 shadow-2xl" @mousedown.stop>
          <div class="mb-6 flex gap-4">
            <img src="/images/architecture-memory.png" alt="" width="768" height="1152" class="h-24 w-16 object-cover shadow" />
            <div>
              <p class="font-mono text-[10px] uppercase text-primary">Reader review</p>
              <h2 id="review-title" class="font-serif text-2xl font-bold">The Architecture of Memory</h2>
              <p class="text-sm text-muted-foreground">What stayed with you?</p>
            </div>
          </div>
          <div class="mb-4 flex gap-1" :aria-label="`Your rating: ${rating} out of 5`">
            <button v-for="value in 5" :key="value" :aria-label="`Rate ${value} stars`" @click="rating = value">
              <Star :class="`size-7 ${value <= rating ? 'fill-current text-primary' : 'text-border'}`" />
            </button>
          </div>
          <label class="text-sm font-medium" for="review">Your review</label>
          <textarea id="review" v-model="reviewText" rows="5" placeholder="Write from the margins..." class="mt-2 w-full resize-none rounded-sm border border-border bg-card p-3 text-sm focus:ring-1 focus:ring-ring" />
          <div class="mt-5 flex justify-end gap-2">
            <Button variant="archivalGhost" @click="reviewOpen = false">Cancel</Button>
            <Button variant="archival" :disabled="!rating || !reviewText.trim()" @click="() => { reviewOpen = false; reviewText = ''; flash('Your review was published to the reader feed.') }">Publish Review</Button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="notice" role="status" class="fixed right-5 top-20 z-50 border border-border bg-foreground px-4 py-3 text-sm text-background shadow-xl">
        {{ notice }}
      </div>
    </Teleport>
  </div>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add home dashboard page ported from new_design"
```

---

### Task 6: Write the book detail page

**Files:**
- Create: `frontend/pages/book/[id].vue`

- [ ] **Step 1: Write the book detail page**

Port `new_design/src/routes/book.$bookId.tsx` (499 lines) pixel-perfectly to Vue.

The Vue page must:
- Be fully self-contained (its own header, 3-column layout, discussion section, toast)
- Use `definePageMeta({ title, description })` computed from route params
- Use static book data dictionary matching new_design (5 books)
- Import and use `CoverImage` component
- Use Button with archival variants
- Connect cart store for Purchase button
- Implement review/reply system with local state
- Implement flash toast with 2400ms auto-dismiss
- Implement inline reply input
- Show 404-style error for unknown book ID

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, BookOpen, Check, Heart, MessageCircle, ShoppingBag, Star } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import CoverImage from '~/components/CoverImage.vue'
import { useCartStore } from '~/stores/cart'

const route = useRoute()
const router = useRouter()
const cart = useCartStore()

const books: Record<string, {
  title: string
  author: string
  cover: string
  crop: number | null
  rating: number
  ratings: number
  price: string
  available: number
  shelf: string
  pages: number
  year: number
  description: string
}> = {
  'architecture-of-memory': {
    title: 'The Architecture of Memory', author: 'Elena Rossi-Vaughn', cover: '/images/architecture-memory.png', crop: null,
    rating: 4.2, ratings: 384, price: '21.00', available: 3, shelf: '720.1 ARC', pages: 340, year: 2026,
    description: 'A luminous inquiry into the buildings we remember and the rooms we cannot forget. Moving between memorials, family homes, and imagined cities, Rossi-Vaughn asks how architecture becomes an archive of private and collective life.',
  },
  'the-hidden-sea': {
    title: 'The Hidden Sea', author: 'Eliot Harbor', cover: '/images/book-cover-sheet.png', crop: 2,
    rating: 4.7, ratings: 612, price: '18.50', available: 5, shelf: '551.46 HAR', pages: 288, year: 2026,
    description: 'A journey beneath the surface of the world\'s oceans, blending natural history, human curiosity, and the strange beauty of the deep into an unforgettable work of narrative nonfiction.',
  },
  'logic-and-form': {
    title: 'Logic & Form', author: 'Adrian Wakefield', cover: '/images/book-cover-sheet.png', crop: 3,
    rating: 4.3, ratings: 271, price: '24.00', available: 1, shelf: '160 WAK', pages: 312, year: 2025,
    description: 'Selected essays on reason, beauty, and the hidden structures that shape how we think. Precise without being austere, Wakefield makes philosophy feel wonderfully close at hand.',
  },
  'paper-shadows': {
    title: 'Paper Shadows', author: 'Maeve Lincoln', cover: '/images/book-cover-sheet.png', crop: 4,
    rating: 4.8, ratings: 908, price: '16.00', available: 0, shelf: 'FIC LIN', pages: 224, year: 2026,
    description: 'Seven short fictions about the stories we tell, the selves we leave behind, and the quiet thresholds between memory and invention.',
  },
  'the-long-night': {
    title: 'The Long Night', author: 'Daniel Hastings', cover: '/images/book-cover-sheet.png', crop: 5,
    rating: 4.1, ratings: 447, price: '19.99', available: 2, shelf: 'FIC HAS', pages: 368, year: 2025,
    description: 'When the world holds its breath, a remote household must decide what they owe one another. An atmospheric novel of isolation, loyalty, and the first light after darkness.',
  },
}

const bookId = route.params.id as string
const book = books[bookId]

definePageMeta({
  title: book ? `${book.title} by ${book.author} — Read in Peace` : 'Book — Read in Peace',
  description: book?.description ?? 'Discover this book and join its reader discussion.',
})

const borrowed = ref(false)
const saved = ref(false)
const rating = ref(0)
const reviewText = ref('')

interface Review {
  id: number
  initials: string
  name: string
  time: string
  rating: number
  text: string
  likes: number
  replies: string[]
}

const reviews = ref<Review[]>([
  { id: 1, initials: 'AM', name: 'Aris M.', time: '14m ago', rating: 5, text: 'The chapter on brutalist memorials is devastating. I kept returning to its idea that a building can remember on our behalf.', likes: 12, replies: ['That was the passage that stayed with me too. — Mina K.'] },
  { id: 2, initials: 'LW', name: 'Leo Wang', time: '2h ago', rating: 4, text: 'Measured, elegant, and full of unexpected connections. The middle essays wander, but the final one brings everything home.', likes: 8, replies: [] },
])

const replyingTo = ref<number | null>(null)
const replyText = ref('')
const notice = ref('')

function flash(message: string) {
  notice.value = message
  window.setTimeout(() => { notice.value = '' }, 2400)
}

function publishReview() {
  if (!rating.value || !reviewText.value.trim()) return
  reviews.value.unshift({
    id: Date.now(),
    initials: 'JS',
    name: 'Jamie S.',
    time: 'Just now',
    rating: rating.value,
    text: reviewText.value.trim(),
    likes: 0,
    replies: [],
  })
  rating.value = 0
  reviewText.value = ''
  flash('Your review is now part of the discussion.')
}

function publishReply(reviewId: number) {
  if (!replyText.value.trim()) return
  reviews.value = reviews.value.map((r) =>
    r.id === reviewId ? { ...r, replies: [...r.replies, `${replyText.value.trim()} — Jamie S.`] } : r,
  )
  replyText.value = ''
  replyingTo.value = null
}

function addLike(item: Review) {
  item.likes++
}
</script>

<template>
  <div v-if="!book" class="flex min-h-screen items-center justify-center bg-background px-6 text-center">
    <div>
      <p class="font-mono text-xs uppercase text-primary">Catalog note 404</p>
      <h1 class="mt-2 font-serif text-4xl">This volume isn't on the shelf.</h1>
      <Button as-child variant="archival" class="mt-6">
        <NuxtLink to="/home">Return to library</NuxtLink>
      </Button>
    </div>
  </div>

  <div v-else class="min-h-screen bg-background pb-16 text-foreground">
    <header class="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
      <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        <NuxtLink to="/home" class="font-serif text-xl font-bold italic text-primary">Read in Peace</NuxtLink>
        <div class="flex items-center gap-2">
          <Button as-child variant="archivalGhost">
            <NuxtLink to="/home"><ArrowLeft /> Back to the stacks</NuxtLink>
          </Button>
          <Button variant="archivalGhost" size="icon" @click="router.push('/cart')" class="relative">
            <ShoppingBag />
            <span v-if="cart.itemCount > 0" class="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[8px] text-primary-foreground">{{ cart.itemCount }}</span>
          </Button>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-10 md:px-6 lg:py-14">
      <section class="animate-enter grid gap-10 border-b border-border pb-14 lg:grid-cols-[300px_1fr_280px] lg:gap-14">
        <div class="mx-auto w-full max-w-[300px]">
          <CoverImage :crop="book.crop" :src="book.cover" :alt="`${book.title} book cover`" class="aspect-[2/3] w-full shadow-2xl" />
        </div>

        <div class="flex flex-col justify-center">
          <div class="mb-5 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>{{ book.year }}</span><span>•</span><span>{{ book.pages }} pages</span><span>•</span><span>Shelf {{ book.shelf }}</span>
          </div>
          <h1 class="max-w-2xl font-serif text-4xl font-bold leading-tight md:text-6xl">{{ book.title }}</h1>
          <p class="mt-3 font-serif text-xl italic text-muted-foreground">by {{ book.author }}</p>
          <div class="mt-7 flex items-center gap-3">
            <span class="text-lg text-primary">★★★★<span class="text-foreground/10">★</span></span>
            <strong>{{ book.rating }}</strong>
            <span class="text-sm text-muted-foreground">from {{ book.ratings }} reader ratings</span>
          </div>
          <p class="mt-8 max-w-2xl text-base leading-7 text-foreground/75">{{ book.description }}</p>
          <div class="mt-8 flex flex-wrap gap-3">
            <Button variant="archivalGhost" @click="saved = !saved"><Heart :class="saved ? 'fill-current text-primary' : ''" /> {{ saved ? 'Saved to list' : 'Save to list' }}</Button>
            <Button variant="archivalGhost" @click="document.getElementById('discussion')?.scrollIntoView({ behavior: 'smooth' })"><MessageCircle /> Read discussion</Button>
          </div>
        </div>

        <aside class="self-center border border-border bg-card p-6 shadow-sm">
          <p class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Borrowing status</p>
          <div class="mt-4 flex items-start gap-3">
            <span :class="`mt-1 size-2 rounded-full ${book.available > 0 ? 'bg-primary' : 'bg-muted-foreground'}`" />
            <div>
              <p class="font-medium">{{ borrowed ? 'On your desk' : book.available > 0 ? 'Available now' : 'Currently checked out' }}</p>
              <p class="mt-1 text-xs leading-5 text-muted-foreground">{{ borrowed ? 'Due July 5, 2026 · 21-day loan' : book.available > 0 ? `${book.available} ${book.available === 1 ? 'copy' : 'copies'} ready to borrow` : 'Join the waitlist to be notified' }}</p>
            </div>
          </div>
          <Button class="mt-6 w-full" variant="archival" :disabled="borrowed" @click="() => { borrowed = true; flash(`${book.title} is now on your desk.`) }">
            <BookOpen /> {{ borrowed ? 'Borrowed' : book.available > 0 ? 'Borrow for 21 days' : 'Join waitlist' }}
          </Button>
          <div v-if="borrowed" class="mt-3 flex items-center gap-2 bg-accent px-3 py-2 text-xs text-accent-foreground">
            <Check class="size-4" /> Loan confirmed
          </div>
          <div class="my-6 border-t border-border" />
          <p class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Keep a copy</p>
          <p class="mt-2 font-serif text-3xl font-bold">${{ book.price }}</p>
          <p class="mt-1 text-xs text-muted-foreground">Hardcover · Ships in 2–3 days</p>
          <Button class="mt-4 w-full" variant="archivalOutline" @click="() => { cart.addItem({ id: bookId, title: book.title, author: book.author, price: Number(book.price), cover: book.cover, crop: book.crop }); flash(`${book.title} added to your basket.`) }">
            <ShoppingBag /> Purchase copy
          </Button>
        </aside>
      </section>

      <section id="discussion" class="scroll-mt-24 py-14">
        <div class="grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <div class="mb-8 flex items-end justify-between border-b border-border pb-3">
              <div>
                <p class="font-mono text-[10px] uppercase tracking-widest text-primary">Reader room</p>
                <h2 class="mt-1 font-serif text-3xl">Reviews & discussion</h2>
              </div>
              <span class="text-sm text-muted-foreground">{{ reviews.length }} conversations</span>
            </div>
            <div class="divide-y divide-border">
              <article v-for="item in reviews" :key="item.id" class="py-7 first:pt-0">
                <div class="flex gap-4">
                  <span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold">{{ item.initials }}</span>
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <strong class="text-sm">{{ item.name }}</strong>
                      <span class="font-mono text-[10px] text-muted-foreground">{{ item.time }}</span>
                      <span class="ml-auto text-sm text-primary" :aria-label="`${item.rating} out of 5 stars`">
                        {{ '★'.repeat(item.rating) }}<span class="text-foreground/10">{{ '★'.repeat(5 - item.rating) }}</span>
                      </span>
                    </div>
                    <p class="mt-3 max-w-3xl leading-7 text-foreground/80">{{ item.text }}</p>
                    <div class="mt-3 flex gap-2">
                      <Button size="sm" variant="archivalGhost" @click="addLike(item)">Like ({{ item.likes }})</Button>
                      <Button size="sm" variant="archivalGhost" @click="replyingTo = replyingTo === item.id ? null : item.id">Reply ({{ item.replies.length }})</Button>
                    </div>
                    <div v-if="item.replies.length > 0" class="mt-4 space-y-3 border-l border-primary/20 pl-4">
                      <p v-for="(text, i) in item.replies" :key="i" class="text-sm leading-6 text-muted-foreground">{{ text }}</p>
                    </div>
                    <div v-if="replyingTo === item.id" class="mt-4">
                      <textarea v-model="replyText" rows="2" placeholder="Write your reply..." class="w-full resize-none rounded-sm border border-border bg-card p-3 text-sm focus:ring-1 focus:ring-ring" />
                      <div class="mt-2 flex justify-end gap-2">
                        <Button size="sm" variant="archivalGhost" @click="() => { replyingTo = null; replyText = '' }">Cancel</Button>
                        <Button size="sm" variant="archival" :disabled="!replyText.trim()" @click="publishReply(item.id)">Post Reply</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>

          <aside class="lg:sticky lg:top-28 lg:self-start">
            <div class="border border-border bg-card p-6">
              <p class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Add your voice</p>
              <h3 class="mt-2 font-serif text-lg">What did you think of this volume?</h3>
              <div class="mb-4 mt-4 flex gap-1" :aria-label="`Your rating: ${rating} out of 5`">
                <button v-for="value in 5" :key="value" :aria-label="`Rate ${value} stars`" @click="rating = value">
                  <Star :class="`size-6 ${value <= rating ? 'fill-current text-primary' : 'text-border'}`" />
                </button>
              </div>
              <textarea v-model="reviewText" rows="4" placeholder="Write from the margins..." class="w-full resize-none rounded-sm border border-border bg-card p-3 text-sm focus:ring-1 focus:ring-ring" />
              <Button class="mt-4 w-full" variant="archival" :disabled="!rating || !reviewText.trim()" @click="publishReview">Publish review</Button>
            </div>
          </aside>
        </div>
      </section>
    </main>

    <Teleport to="body">
      <div v-if="notice" role="status" class="fixed right-5 top-20 z-50 border border-border bg-foreground px-4 py-3 text-sm text-background shadow-xl">
        {{ notice }}
      </div>
    </Teleport>
  </div>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add book detail page ported from new_design"
```

---

### Task 7: Write the cart page

**Files:**
- Create: `frontend/pages/cart.vue`

- [ ] **Step 1: Write the cart page**

Port `new_design/src/routes/cart.tsx` (89 lines) plus keep discount pipeline.

The Vue page must:
- Be fully self-contained (header, cart items, order summary)
- Use `definePageMeta({ title: 'Your Cart — Read in Peace' })`
- Show empty state when cart is empty
- Show items with quantity controls, cover images, Remove button
- Show order summary with Subtotal, Shipping, Estimated total
- Keep discount breakdown from current `utils/discount.ts`
- Connect to cart store

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { ArrowLeft, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import CoverImage from '~/components/CoverImage.vue'
import { useCartStore } from '~/stores/cart'

definePageMeta({
  title: 'Your Cart — Read in Peace',
  description: 'Review the books in your cart.',
})

const cart = useCartStore()

const subtotal = computed(() =>
  cart.items.reduce((total, item) => total + item.price * item.quantity, 0),
)
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <header class="border-b border-border bg-background/90">
      <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <NuxtLink to="/home" class="font-serif text-xl font-bold italic text-primary">Read in Peace</NuxtLink>
        <Button as-child variant="archivalGhost">
          <NuxtLink to="/home"><ArrowLeft /> Continue browsing</NuxtLink>
        </Button>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-10 md:px-6 lg:py-14">
      <div class="border-b border-border pb-5">
        <p class="font-mono text-[10px] uppercase tracking-widest text-primary">The book bag</p>
        <h1 class="mt-2 font-serif text-4xl font-bold md:text-5xl">Your cart</h1>
        <p class="mt-2 text-sm text-muted-foreground">{{ cart.itemCount }} {{ cart.itemCount === 1 ? 'volume' : 'volumes' }} selected</p>
      </div>

      <div v-if="cart.isEmpty" class="flex flex-col items-center py-24 text-center">
        <ShoppingCart class="size-10 text-muted-foreground" />
        <h2 class="mt-5 font-serif text-2xl">Your book bag is empty.</h2>
        <p class="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Browse the stacks and keep a permanent copy of something worth returning to.</p>
        <Button as-child variant="archival" class="mt-6">
          <NuxtLink to="/home">Explore the library</NuxtLink>
        </Button>
      </div>

      <div v-else class="grid gap-12 py-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section class="divide-y divide-border">
          <article v-for="item in cart.items" :key="item.id" class="flex gap-5 py-6 first:pt-0">
            <CoverImage :crop="item.crop" :src="item.cover" :alt="`${item.title} book cover`" class="h-36 w-24 shrink-0 shadow-md" />
            <div class="flex min-w-0 flex-1 flex-col justify-between">
              <div>
                <h2 class="font-serif text-xl font-bold">{{ item.title }}</h2>
                <p class="mt-1 text-sm italic text-muted-foreground">by {{ item.author }}</p>
                <p class="mt-3 font-mono text-xs text-primary">${{ item.price.toFixed(2) }}</p>
              </div>
              <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-center border border-border">
                  <Button size="icon" variant="archivalGhost" :aria-label="`Decrease ${item.title} quantity`" @click="cart.setQuantity(item.id, item.quantity - 1)"><Minus /></Button>
                  <span class="w-8 text-center font-mono text-xs">{{ item.quantity }}</span>
                  <Button size="icon" variant="archivalGhost" :aria-label="`Increase ${item.title} quantity`" @click="cart.setQuantity(item.id, item.quantity + 1)"><Plus /></Button>
                </div>
                <Button size="sm" variant="archivalGhost" @click="cart.removeItem(item.id)"><Trash2 /> Remove</Button>
              </div>
            </div>
          </article>
        </section>

        <aside class="h-fit border border-border bg-card p-6 lg:sticky lg:top-8">
          <p class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Order summary</p>
          <div class="mt-5 flex justify-between border-b border-border pb-5 text-sm">
            <span>Subtotal</span>
            <strong>${{ subtotal.toFixed(2) }}</strong>
          </div>
          <div class="flex justify-between border-b border-border py-5 text-sm">
            <span>Shipping</span>
            <span class="text-muted-foreground">Calculated at checkout</span>
          </div>
          <div class="flex items-end justify-between pt-5">
            <span class="font-serif text-lg">Estimated total</span>
            <strong class="font-serif text-3xl">${{ subtotal.toFixed(2) }}</strong>
          </div>
          <Button class="mt-6 w-full" variant="archival">Proceed to checkout</Button>
          <p class="mt-3 text-center text-[11px] leading-5 text-muted-foreground">Secure checkout will be available when payments are enabled.</p>
        </aside>
      </div>
    </main>
  </div>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add cart page ported from new_design"
```

---

### Task 8: Restyle auth modal

**Files:**
- Modify: `frontend/components/AuthModal.vue`

- [ ] **Step 1: Read current auth modal**

Read `frontend/components/AuthModal.vue` to understand current structure.

- [ ] **Step 2: Restyle to match new_design visual language**

Apply these visual changes to the auth modal:
- Background: `bg-background` (not a different color)
- Border: `border border-border`
- Buttons: Use `archival` variant for submit, `archivalGhost` for cancel/switch
- Fonts: Inter for body, Lora for headings, JetBrains Mono for labels
- Radii: Use `rounded-sm` (matching new_design's 0.25rem base)
- Inputs: `rounded-sm border border-border bg-card p-3 text-sm focus:ring-1 focus:ring-ring`
- Overlay: `bg-foreground/40 backdrop-blur-sm`

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: restyle auth modal to match new_design visual language"
```

---

### Task 9: Add 404/error page

**Files:**
- Create: `frontend/error.vue`

- [ ] **Step 1: Write error.vue**

Port `new_design/__root.tsx` NotFoundComponent and ErrorComponent:

```vue
<script setup lang="ts">
import { Button } from '~/components/ui/button'

defineProps<{
  error?: { statusCode?: number; message?: string }
}>()
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background px-4">
    <div class="max-w-md text-center">
      <p v-if="error?.statusCode === 404" class="font-mono text-xs uppercase text-primary">Catalog note</p>
      <h1 class="text-7xl font-bold text-foreground">{{ error?.statusCode ?? 404 }}</h1>
      <h2 v-if="error?.statusCode === 404" class="mt-4 text-xl font-semibold text-foreground">This page isn't on the shelf.</h2>
      <h2 v-else class="mt-4 text-xl font-semibold text-foreground">This page didn't load</h2>
      <p class="mt-2 text-sm text-muted-foreground">
        {{ error?.statusCode === 404
          ? 'The page you\'re looking for doesn\'t exist or has been moved.'
          : 'Something went wrong on our end. You can try refreshing or head back home.'
        }}
      </p>
      <div class="mt-6 flex flex-wrap justify-center gap-2">
        <Button as-child variant="archival">
          <NuxtLink to="/home">Go home</NuxtLink>
        </Button>
        <Button as-child variant="archivalOutline" v-if="error?.statusCode !== 404" @click="window.location.reload()">
          Try again
        </Button>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Update nuxt.config.ts to use the error page**

Read `frontend/nuxt.config.ts` and verify no special error page config needed (Nuxt auto-detects `error.vue`).

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add 404/error page ported from new_design"
```

---

### Task 10: Verify build

- [ ] **Step 1: Run Nuxt build**

```bash
cd frontend && npm run build
```

Expected: Client + Server + Nitro all build successfully.

If there are errors, fix them and repeat.

- [ ] **Step 2: Final commit**

```bash
git add -A && git commit -m "fix: resolve build errors after new_design migration"
```
