# Checkout Cart & Discount Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace single-item Stripe Checkout with a client-side cart + slide-over drawer + three-stage discount pipeline (quantity tier, category bonus, every-$100).

**Architecture:** Pinia cart store (localStorage-persisted) on frontend; discount engine runs on both frontend (display) and backend (verification). New `POST /api/cart/checkout` endpoint creates Stripe session with total. Modified `confirmPurchase` handles batch book recording.

**Tech Stack:** Nuxt 3, Pinia, `@pinia-plugin-persistedstate/nuxt`, `lucide-vue-next`, NestJS 11, Stripe, Jest

---

### Task 1: Install persistedstate plugin + Create cart store

**Files:**
- Modify: `frontend/nuxt.config.ts`
- Create: `frontend/stores/cart.ts`

- [ ] **Step 1: Install `@pinia-plugin-persistedstate/nuxt`**

Run from `frontend/`:
```bash
npm install @pinia-plugin-persistedstate/nuxt
```

- [ ] **Step 2: Register plugin in nuxt.config.ts**

Replace the modules array in `frontend/nuxt.config.ts`:
```typescript
  modules: [
   "@pinia/nuxt",
   "shadcn-nuxt",
   "@stefanobartoletti/nuxt-social-share",
   "@pinia-plugin-persistedstate/nuxt",
  ],
```

- [ ] **Step 3: Create the cart store**

Create `frontend/stores/cart.ts`:
```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { toast } from 'vue-sonner';

export interface CartItem {
  bookId: string;
  title: string;
  author: string;
  cover: string;
  price: number;
  category: string;
}

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([]);

  const itemCount = computed(() => items.value.length);
  const subtotal = computed(() =>
    items.value.reduce((sum, item) => sum + item.price, 0),
  );
  const isEmpty = computed(() => items.value.length === 0);

  function addItem(book: CartItem) {
    if (items.value.some((i) => i.bookId === book.bookId)) {
      toast.info('This book is already in your cart');
      return;
    }
    items.value.push(book);
  }

  function removeItem(bookId: string) {
    items.value = items.value.filter((i) => i.bookId !== bookId);
  }

  function clear() {
    items.value = [];
  }

  async function checkout() {
    const { $fetch } = useNuxtApp();
    try {
      const res = await $fetch<{ url: string }>('/api/cart/checkout', {
        method: 'POST',
        body: { bookIds: items.value.map((i) => i.bookId) },
      });
      window.location.href = res.url;
    } catch (e: any) {
      if (e?.statusCode === 401) {
        toast.error('Please sign in to checkout');
      } else if (e?.data?.message) {
        toast.error(e.data.message);
      } else {
        toast.error('Failed to start checkout');
      }
    }
  }

  return {
    items,
    itemCount,
    subtotal,
    isEmpty,
    addItem,
    removeItem,
    clear,
    checkout,
  };
});
```

Note: Pinia persistedstate auto-persists all state to localStorage. The `items` ref will survive page refreshes.

- [ ] **Step 4: Verify build**

Run from `frontend/`:
```bash
npm run build
```
Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/nuxt.config.ts frontend/stores/cart.ts frontend/package.json frontend/package-lock.json
git commit -m "feat: add cart store with localStorage persistence"
```

---

### Task 2: Create discount composable (frontend)

**Files:**
- Create: `frontend/composables/useDiscount.ts`

- [ ] **Step 1: Create the discount composable**

Create `frontend/composables/useDiscount.ts`:
```typescript
import { computed, type Ref } from 'vue';
import type { CartItem } from '~/stores/cart';

export interface DiscountBreakdown {
  subtotal: number;
  tierPercent: number;
  tierDiscount: number;
  categoryBonus: number;
  every100Discount: number;
  total: number;
}

interface CategorySubtotal {
  category: string;
  subtotal: number;
  count: number;
}

function getCategorySubtotals(items: CartItem[]): CategorySubtotal[] {
  const map = new Map<string, { subtotal: number; count: number }>();
  for (const item of items) {
    const existing = map.get(item.category) ?? { subtotal: 0, count: 0 };
    existing.subtotal += item.price;
    existing.count += 1;
    map.set(item.category, existing);
  }
  return Array.from(map.entries()).map(([category, { subtotal, count }]) => ({
    category,
    subtotal,
    count,
  }));
}

export function computeDiscount(items: CartItem[]): DiscountBreakdown {
  const subtotal = items.reduce((sum, i) => sum + i.price, 0);

  // Stage 1 — Quantity Tier
  const count = items.length;
  const tierPercent = count >= 4 ? 30 : count === 3 ? 20 : count === 2 ? 10 : 0;
  const tierDiscount = subtotal * (tierPercent / 100);
  let runningTotal = subtotal - tierDiscount;

  // Stage 2 — Category Bonus (on original category subtotals)
  const catSubtotals = getCategorySubtotals(items);
  const categoryBonus = catSubtotals.reduce((sum, cat) => {
    if (cat.count >= 2) {
      return sum + cat.subtotal * 0.1;
    }
    return sum;
  }, 0);
  runningTotal -= categoryBonus;

  // Stage 3 — Every $100
  const every100Discount = Math.floor(runningTotal / 100) * 1;
  runningTotal -= every100Discount;

  // Clamp to zero
  const total = Math.max(0, runningTotal);

  return {
    subtotal,
    tierPercent,
    tierDiscount,
    categoryBonus,
    every100Discount,
    total,
  };
}

export function useDiscount(items: Ref<CartItem[]>) {
  const breakdown = computed(() => computeDiscount(items.value));
  return { breakdown };
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/composables/useDiscount.ts
git commit -m "feat: add discount pipepine composable (qty tier + category + every-100)"
```

---

### Task 3: Create CheckoutDrawer component

**Files:**
- Create: `frontend/components/CheckoutDrawer.vue`

- [ ] **Step 1: Create the drawer component**

Create `frontend/components/CheckoutDrawer.vue`:
```vue
<script setup lang="ts">
import { ShoppingBag, X } from 'lucide-vue-next';
import { useCartStore } from '~/stores/cart';
import { useDiscount } from '~/composables/useDiscount';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const cartStore = useCartStore();
const { breakdown } = useDiscount(toRef(cartStore.items));

function formatPrice(amount: number): string {
  return '$' + amount.toFixed(2);
}
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="open" class="fixed inset-0 z-[100] flex">
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/30 backdrop-blur-sm"
          @click="emit('close')"
        />
        <!-- Panel -->
        <div
          class="absolute right-0 top-0 h-full w-full max-w-md bg-card shadow-xl border-l border-border overflow-y-auto"
        >
          <!-- Header -->
          <div class="flex items-center justify-between p-4 border-b border-border">
            <h2 class="text-lg font-semibold">
              Cart
              <span v-if="cartStore.itemCount > 0" class="text-muted-foreground text-sm font-normal">
                ({{ cartStore.itemCount }} {{ cartStore.itemCount === 1 ? 'item' : 'items' }})
              </span>
            </h2>
            <button
              @click="emit('close')"
              class="flex h-8 w-8 items-center justify-center rounded-lg cursor-pointer hover:bg-muted transition-colors"
            >
              <X class="h-4 w-4" />
            </button>
          </div>

          <!-- Empty state -->
          <div v-if="cartStore.isEmpty" class="flex flex-col items-center justify-center py-24 px-6 text-center">
            <ShoppingBag class="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p class="font-medium text-muted-foreground">Your cart is empty</p>
            <p class="text-sm text-muted-foreground/60 mt-1">
              Browse books and click "Buy" to add them
            </p>
          </div>

          <!-- Items -->
          <div v-else class="flex flex-col">
            <div class="divide-y divide-border/60">
              <div
                v-for="item in cartStore.items"
                :key="item.bookId"
                class="flex gap-3 p-4"
              >
                <NuxtLink :to="`/book/${item.bookId}`" class="shrink-0">
                  <div class="w-12 h-16 overflow-hidden rounded border border-border/60 bg-muted">
                    <img
                      :src="item.cover"
                      :alt="item.title"
                      class="h-full w-full object-cover"
                    />
                  </div>
                </NuxtLink>
                <div class="flex-1 min-w-0">
                  <NuxtLink
                    :to="`/book/${item.bookId}`"
                    class="text-sm font-medium truncate block hover:text-primary transition-colors"
                  >
                    {{ item.title }}
                  </NuxtLink>
                  <p class="text-xs text-muted-foreground truncate">{{ item.author }}</p>
                  <p class="text-xs text-muted-foreground">{{ item.category }}</p>
                  <div class="flex items-center justify-between mt-1.5">
                    <span class="text-sm font-semibold">{{ formatPrice(item.price) }}</span>
                    <button
                      @click="cartStore.removeItem(item.bookId)"
                      class="text-xs text-destructive/80 hover:text-destructive cursor-pointer transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Discount breakdown -->
            <div class="mx-4 mt-2 p-3 rounded-lg bg-muted/50 border border-border/60">
              <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Order Summary
              </p>
              <div class="space-y-1 text-sm">
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Subtotal ({{ cartStore.itemCount }} items)</span>
                  <span>{{ formatPrice(breakdown.subtotal) }}</span>
                </div>
                <div v-if="breakdown.tierDiscount > 0" class="flex justify-between text-green-600">
                  <span>− {{ breakdown.tierPercent }}% bundle discount</span>
                  <span>−{{ formatPrice(breakdown.tierDiscount) }}</span>
                </div>
                <div v-if="breakdown.categoryBonus > 0" class="flex justify-between text-green-600">
                  <span>− Category bonus</span>
                  <span>−{{ formatPrice(breakdown.categoryBonus) }}</span>
                </div>
                <div v-if="breakdown.every100Discount > 0" class="flex justify-between text-green-600">
                  <span>− Every $100 discount</span>
                  <span>−{{ formatPrice(breakdown.every100Discount) }}</span>
                </div>
              </div>
              <div class="mt-2 pt-2 border-t border-border/60 flex justify-between font-semibold text-base">
                <span>Total</span>
                <span>{{ formatPrice(breakdown.total) }}</span>
              </div>
            </div>

            <!-- Checkout button -->
            <div class="p-4">
              <button
                @click="cartStore.checkout()"
                class="w-full rounded-lg bg-primary py-3 font-medium text-primary-foreground cursor-pointer transition-all duration-200 hover:translate-y-[-1px] hover:shadow-md"
              >
                Proceed to Checkout — {{ formatPrice(breakdown.total) }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition: all 0.25s ease;
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}
.drawer-enter-from > div:last-child,
.drawer-leave-to > div:last-child {
  transform: translateX(100%);
}
.drawer-enter-active > div:last-child,
.drawer-leave-active > div:last-child {
  transition: transform 0.25s ease;
}
</style>
```

Note: `toRef` from Vue converts `cartStore.items` (a reactive ref from Pinia) into a `Ref` that `useDiscount` can watch. Since Pinia stores unwrap refs, we need `toRef(cartStore, 'items')` — but actually `cartStore.items` from a setup store is already a ref. We can use `computed(() => cartStore.items)` for the composable. Let me fix this:

Actually, in Pinia setup stores, `cartStore.items` returns the raw ref value (unwrapped). To pass it as a `Ref` to the composable, we should use `toRef(cartStore, 'items')`.

The component uses `computeDiscount` (pure function) directly with a `computed`, rather than the `useDiscount` wrapper.

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/CheckoutDrawer.vue
git commit -m "feat: add CheckoutDrawer component with cart items and discount breakdown"
```

---

### Task 4: Create CartIcon + Navbar integration

**Files:**
- Create: `frontend/components/CartIcon.vue`
- Modify: `frontend/components/Navbar.vue`

- [ ] **Step 1: Create CartIcon component**

Create `frontend/components/CartIcon.vue`:
```vue
<script setup lang="ts">
import { ShoppingBag } from 'lucide-vue-next';
import { useCartStore } from '~/stores/cart';

const emit = defineEmits<{ toggle: [] }>();
const cartStore = useCartStore();
</script>

<template>
  <button
    @click="emit('toggle')"
    class="relative flex h-9 w-9 items-center cursor-pointer justify-center rounded-full text-muted-foreground ring-1 ring-border transition-all duration-200 hover:bg-muted hover:text-foreground"
    aria-label="Open cart"
  >
    <ShoppingBag class="h-4 w-4" />
    <span
      v-if="cartStore.itemCount > 0"
      class="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground"
    >
      {{ cartStore.itemCount }}
    </span>
  </button>
</template>
```

- [ ] **Step 2: Add CartIcon to Navbar**

In `frontend/components/Navbar.vue`, add the CartIcon before the profile section:

After the `</NuxtLink>` closing the Dashboard link (line ~54 in the current file), add:
```vue
        <CartIcon
          @toggle="emit('toggleCart')"
          class="ml-2"
        />
```

Wait, Navbar doesn't have emits. Instead, let's use a shared open state. Actually, the simplest approach: have Navbar render CartIcon and emit an event to the layout, or have CartIcon directly control the drawer.

Better approach: Use a provide/inject or just have the Navbar emit an event to the layout via `emit`. But actually, Navbar doesn't have emits defined.

Simplest approach: Have the CartIcon emit toggle, and the Navbar forward it. But Navbar doesn't have emits.

Alternative: Use a simple show/hide approach. Add a `cartOpen` ref in the Navbar, and have CartIcon toggle it. Then the drawer (rendered in the layout) needs to know about it.

Actually, let me reconsider. The cleanest approach is:

1. Add a shared state in the layout or use a simple injection
2. Or: have CartIcon emit an event, and have the layout pass the `cartOpen` state to both CartIcon and CheckoutDrawer

Let me go with: Navbar emits `toggleCart`, and the layout has a `cartOpen` ref that it binds to both CartIcon and CheckoutDrawer.

But wait, Navbar is rendered by the page template or layout, not by layouts/default.vue directly... actually looking at the pages:

`pages/book/[id].vue` renders `<Navbar />` directly.
`pages/feed.vue` also renders `<Navbar />` directly.
`layouts/default.vue` doesn't render the Navbar — each page renders it.

OK so the approach should be different. Let me think about how to share the cart open state...

Options:
1. **Provide/inject**: Layout provides `cartOpen` through `provide`, Navbar/CheckoutDrawer inject it
2. **Pinia store**: Add `drawerOpen` to the cart store
3. **Event bus**: Use a simple mitt-based event bus

I think option 2 (add `drawerOpen` to the cart store) is simplest and most idiomatic for this project. The cart store already manages cart state. Adding `drawerOpen` there keeps everything in one place.

Let me update the plan:

Add to cart store:
```typescript
const drawerOpen = ref(false);
function openDrawer() { drawerOpen.value = true; }
function closeDrawer() { drawerOpen.value = false; }
function toggleDrawer() { drawerOpen.value = !drawerOpen.value; }
```

And `addItem` should call `openDrawer()` to auto-open on first add.

CartIcon: `@click="cartStore.toggleDrawer()"`
CheckoutDrawer: `:open="cartStore.drawerOpen" @close="cartStore.closeDrawer()"`

This is much cleaner. Let me update:

In the CheckoutDrawer template, remove `props.open` and use `cartStore.drawerOpen` directly:
Actually wait, it's cleaner to still pass it as a prop. Let me use the store directly.

OK let me revise my plan to incorporate this. I'll update the cart store to include drawer state, and then CartIcon and CheckoutDrawer both reference it directly.

- [ ] **Step 2: Add drawerOpen state to cart store**

In `frontend/stores/cart.ts`, add:
```typescript
  const drawerOpen = ref(false);

  function openDrawer() { drawerOpen.value = true; }
  function closeDrawer() { drawerOpen.value = false; }
  function toggleDrawer() { drawerOpen.value = !drawerOpen.value; }
```

And update `addItem` to auto-open:
```typescript
  function addItem(book: CartItem) {
    if (items.value.some((i) => i.bookId === book.bookId)) {
      toast.info('This book is already in your cart');
      return;
    }
    items.value.push(book);
    drawerOpen.value = true; // auto-open on first add
  }
```

Add to the return object:
```typescript
  return {
    items,
    itemCount,
    subtotal,
    isEmpty,
    drawerOpen,
    addItem,
    removeItem,
    clear,
    checkout,
    openDrawer,
    closeDrawer,
    toggleDrawer,
  };
```

- [ ] **Step 3: Update CheckoutDrawer to use cartStore directly**

Replace the `props.open` / `emit('close')` pattern with direct store access:

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { ShoppingBag, X } from 'lucide-vue-next';
import { useCartStore } from '~/stores/cart';
import { computeDiscount } from '~/composables/useDiscount';

const cartStore = useCartStore();
const breakdown = computed(() => computeDiscount(cartStore.items));

function formatPrice(amount: number): string {
  return '$' + amount.toFixed(2);
}
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="cartStore.drawerOpen" class="fixed inset-0 z-[100] flex">
        <div
          class="absolute inset-0 bg-black/30 backdrop-blur-sm"
          @click="cartStore.closeDrawer()"
        />
        <div class="absolute right-0 top-0 h-full w-full max-w-md bg-card shadow-xl border-l border-border overflow-y-auto">
          <!-- ... same content, but remove props.open and emit('close') ... -->
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
```

- [ ] **Step 4: Add CartIcon to Navbar**

In `frontend/components/Navbar.vue`, add CartIcon import and render it. Add after the Dashboard NuxtLink and before the profile section:

```vue
        <CartIcon class="ml-2" />
```

- [ ] **Step 5: Update the template section**

The Navbar template area around line 49-55 should look like:
```vue
        <NuxtLink
          to="/dashboard"
          class="hidden items-center gap-2 rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
        >
          <LayoutDashboard class="h-4 w-4" /> My Dashboard
        </NuxtLink>
        <CartIcon class="ml-2" />

        <!-- Profile -->
        <div class="relative ml-2">
```

- [ ] **Step 6: Verify build**

```bash
npm run build
```
Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add frontend/components/CartIcon.vue frontend/stores/cart.ts frontend/components/Navbar.vue frontend/components/CheckoutDrawer.vue
git commit -m "feat: add CartIcon to Navbar, wire drawer state through cart store"
```

---

### Task 5: Wire buy buttons to cart store

**Files:**
- Modify: `frontend/components/BookActions.vue`
- Modify: `frontend/components/BookCard.vue`
- Modify: `frontend/composables/useBookDetail.ts`

- [ ] **Step 1: Update BookActions to use cart store instead of emit**

In `frontend/components/BookActions.vue`:
```vue
<script setup lang="ts">
import { computed } from 'vue';
import { useCartStore } from '~/stores/cart';
import type { BookWithMeta } from '~/stores/books';

const props = defineProps<{
  book: BookWithMeta;
  hasBorrowed: boolean;
}>();

const emit = defineEmits<{
  borrow: [];
}>();

const cartStore = useCartStore();

const borrowBtnClass = computed(() => { /* same as before */ });
const borrowLabel = computed(() => { /* same as before */ });
const buyFullWidth = computed(() => props.book.inStock <= 1);

function handleBuy() {
  cartStore.addItem({
    bookId: props.book.id,
    title: props.book.title,
    author: props.book.author,
    cover: props.book.cover,
    price: Number(props.book.price),
    category: props.book.category,
  });
}
</script>

<template>
  <div class="mt-8 flex flex-col gap-3 sm:flex-row">
    <button
      v-if="book.inStock > 1"
      @click="handleBuy"
      class="flex-1 rounded-lg bg-primary cursor-pointer px-6 py-3.5 font-medium text-primary-foreground transition-all duration-200 hover:translate-y-[-1px] hover:shadow-md"
    >
      Buy Now — ${{ Number(book.price).toFixed(2) }}
    </button>
    <button
      @click="emit('borrow')"
      :disabled="!book.isAvailable || book.inStock < 1 || hasBorrowed"
      class="flex-1 rounded-lg border px-6 py-3.5 font-medium transition-colors"
      :class="[buyFullWidth ? 'w-full' : '', borrowBtnClass]"
    >
      {{ borrowLabel }}
    </button>
  </div>
</template>
```

- [ ] **Step 2: Update useBookDetail to remove the old buy handler**

In `frontend/composables/useBookDetail.ts`, remove the `handleBuy` function entirely and remove the `dashboard.buyBook()` call. The buy logic is now handled by BookActions directly:

```typescript
import { ref, shallowRef, onMounted } from 'vue';
import { toast } from 'vue-sonner';
import { useBooksStore } from '~/stores/books';
import { useDashboardStore } from '~/stores/dashboard';
import { useAuthStore } from '~/stores/auth';

export function useBookDetail(id: string) {
  const booksStore = useBooksStore();
  const dashboard = useDashboardStore();
  const auth = useAuthStore();

  const book = ref<import('~/stores/books').BookWithMeta | null>(null);
  const comments = ref<import('~/stores/books').Comment[]>([]);
  const hasBorrowed = shallowRef(false);

  onMounted(async () => {
    book.value = await booksStore.fetchBook(id);
    comments.value = await booksStore.fetchComments(id);

    if (auth.signedIn) {
      await Promise.all([
        dashboard.fetchBorrows(),
        booksStore.fetchLikeStatus(id),
        booksStore.fetchUserRating(id),
      ]);
      hasBorrowed.value = dashboard.borrowed.some((b) => b.borrow.bookId === id);
    }
  });

  async function submitReview(text: string) {
    if (!text.trim()) return;
    await booksStore.createComment(id, text.trim());
    comments.value = await booksStore.fetchComments(id);
  }

  async function handleLike() {
    await booksStore.toggleLike(id);
  }

  async function handleRate(rating: number) {
    await booksStore.rateBook(id, rating);
    if (book.value) {
      book.value.avgRating = (await booksStore.fetchBook(id)).avgRating;
    }
  }

  async function handleBorrow() {
    if (hasBorrowed.value) {
      toast.error('You have already borrowed this book');
      return;
    }
    if (!book.value?.isAvailable) {
      toast.error('Book is currently not available for borrowing');
      return;
    }
    await dashboard.borrowBook(id);
  }

  return {
    book,
    comments,
    hasBorrowed,
    handleLike,
    handleRate,
    handleBorrow,
    submitReview,
  };
}
```

- [ ] **Step 3: Update book/[id].vue template**

In `frontend/pages/book/[id].vue`, remove `handleBuy` from the destructured return and from `BookActions` `@buy`:

Replace:
```vue
const { book, comments, hasBorrowed, handleLike, handleRate, handleBuy, handleBorrow, submitReview } = useBookDetail(id);
```
With:
```vue
const { book, comments, hasBorrowed, handleLike, handleRate, handleBorrow, submitReview } = useBookDetail(id);
```

And replace:
```vue
<BookActions :book="book" :has-borrowed="hasBorrowed" @buy="handleBuy" @borrow="handleBorrow" />
```
With:
```vue
<BookActions :book="book" :has-borrowed="hasBorrowed" @borrow="handleBorrow" />
```

- [ ] **Step 4: Update BookCard buy button to use cart store**

In `frontend/components/BookCard.vue`, replace the `dashboard.buyBook(book.id)` call and update the buy handler:

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { Pencil, Trash2, RotateCcw, BookOpen } from "lucide-vue-next";
import type { Book } from "~/data/books";
import { useCartStore } from "~/stores/cart";
import { useDashboardStore } from "~/stores/dashboard";
import { useBooksStore } from "~/stores/books";
import { useAuthStore } from "~/stores/auth";

const props = withDefaults(
  defineProps<{
    book: Book;
    variant?: "default" | "borrowed" | "purchased";
  }>(),
  { variant: "default" },
);

const emit = defineEmits<{
  edit: [book: Book];
}>();

const cartStore = useCartStore();
const dashboard = useDashboardStore();
const booksStore = useBooksStore();
const auth = useAuthStore();

const formattedPrice = computed(() => Number(props.book.price).toFixed(2));

// ... same borrowBtnClass, borrowLabel, stockClass, stockLabel ...

function handleBuy() {
  cartStore.addItem({
    bookId: props.book.id,
    title: props.book.title,
    author: props.book.author,
    cover: props.book.cover,
    price: Number(props.book.price),
    category: props.book.category,
  });
}

async function handleDelete() {
  if (confirm("Delete this book?")) {
    await booksStore.deleteBook(props.book.id);
  }
}
</script>
```

And in the template replace:
```vue
@click="dashboard.buyBook(book.id)"
```
With:
```vue
@click="handleBuy()"
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add frontend/components/BookActions.vue frontend/components/BookCard.vue frontend/composables/useBookDetail.ts frontend/pages/book/\[id\].vue
git commit -m "feat: wire buy buttons to cart store instead of direct checkout"
```

---

### Task 6: Add CheckoutDrawer to default layout

**Files:**
- Modify: `frontend/layouts/default.vue`

- [ ] **Step 1: Render CheckoutDrawer in the layout**

In `frontend/layouts/default.vue`, add CheckoutDrawer after the Toaster:

```vue
<script setup lang="ts">
import { Toaster } from "vue-sonner";
import { useBooksStore } from "~/stores/books";

const route = useRoute();
const booksStore = useBooksStore();
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <main class="flex-1">
      <slot />
    </main>
    <Footer v-if="route.name !== 'index'" />
    <AdminFab v-if="route.name !== 'index'" />
    <BookFormModal
      v-if="route.name !== 'index' && booksStore.showForm"
      :book="booksStore.editingBook"
      @close="booksStore.closeForm()"
      @saved="booksStore.closeForm()"
    />
    <CheckoutDrawer v-if="route.name !== 'index'" />
    <Toaster richColors position="top-center" />
  </div>
</template>
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/layouts/default.vue
git commit -m "feat: add CheckoutDrawer to default layout, hidden on landing page"
```

---

### Task 7: Backend discount pipeline unit tests + implementation (TDD)

**Files:**
- Create: `backend/src/transactions/discount.spec.ts`
- Modify: `backend/src/transactions/transactions.service.ts`

The discount is computed from book prices. The Stripe session uses `unit_amount` in cents, so all prices are multiplied by 100.

- [ ] **Step 1: Write the failing test**

Create `backend/src/transactions/discount.spec.ts`:
```typescript
import { TransactionsService } from './transactions.service';

// The applyDiscounts method is a pure function operating on price data.
// We test it by calling the private method via prototype access
// (or by exposing a public method, see implementation step).

// For TDD we'll test through a public helper that wraps the private method.

describe('TransactionsService — discount pipeline', () => {
  let service: TransactionsService;

  beforeAll(async () => {
    // We need a minimal module with just the service injected
    // But since the service depends on DRIZZLE + STRIPE providers,
    // we extract the pure discount logic into a standalone function.
  });

  describe('applyDiscounts', () => {
    it('applies 0% tier for 1 item, no category bonus, no every-$100', () => {
      const books = [{ price: '25.00', category: 'Fiction' }];
      const result = TransactionsService.applyDiscounts(books);
      expect(result).toEqual({
        subtotal: 2500,
        tierPercent: 0,
        tierDiscount: 0,
        categoryBonus: 0,
        every100Discount: 0,
        total: 2500,
      });
    });

    it('applies 10% tier for 2 items, no category bonus if different categories', () => {
      const books = [
        { price: '20.00', category: 'Fiction' },
        { price: '30.00', category: 'Science' },
      ];
      const result = TransactionsService.applyDiscounts(books);
      const subtotal = 5000;
      const tierDiscount = subtotal * 0.1; // 500
      const runningAfterTier = subtotal - tierDiscount; // 4500
      expect(result).toEqual({
        subtotal,
        tierPercent: 10,
        tierDiscount: 500,
        categoryBonus: 0,
        every100Discount: 0,
        total: 4500,
      });
    });

    it('applies 20% tier for 3 items', () => {
      const books = [
        { price: '10.00', category: 'Fiction' },
        { price: '15.00', category: 'Fiction' },
        { price: '20.00', category: 'Science' },
      ];
      const result = TransactionsService.applyDiscounts(books);
      const subtotal = 4500;
      const tierDiscount = subtotal * 0.2; // 900
      const runningAfterTier = subtotal - tierDiscount; // 3600
      expect(result).toEqual({
        subtotal,
        tierPercent: 20,
        tierDiscount: 900,
        categoryBonus: 0,
        every100Discount: Math.floor(3600 / 10000) * 100,
        total: 3600,
      });
    });

    it('applies 30% tier for 4+ items', () => {
      const books = [
        { price: '10.00', category: 'Fiction' },
        { price: '15.00', category: 'Fiction' },
        { price: '20.00', category: 'Science' },
        { price: '25.00', category: 'Science' },
      ];
      const result = TransactionsService.applyDiscounts(books);
      const subtotal = 7000;
      const tierDiscount = subtotal * 0.3; // 2100
      const runningAfterTier = subtotal - tierDiscount; // 4900
      expect(result.tierPercent).toBe(30);
      expect(result.tierDiscount).toBe(2100);
      // Category bonus: Fiction (2500) * 0.1 + Science (4500) * 0.1 = 700
      expect(result.categoryBonus).toBe(700);
    });

    it('applies category bonus per qualifying category using original prices', () => {
      const books = [
        { price: '20.00', category: 'Fiction' },
        { price: '15.00', category: 'Fiction' },
        { price: '30.00', category: 'Science' },
        { price: '25.00', category: 'Science' },
      ];
      const result = TransactionsService.applyDiscounts(books);
      // Category bonus: Fiction (3500) * 0.1 = 350, Science (5500) * 0.1 = 550
      expect(result.categoryBonus).toBe(900);
    });

    it('applies every-$100 discount correctly above threshold', () => {
      const books = [
        { price: '50.00', category: 'Fiction' },
        { price: '60.00', category: 'Fiction' },
      ];
      const result = TransactionsService.applyDiscounts(books);
      // subtotal = 11000
      // tier 10% = 1100 discount, running = 9900
      // category bonus: Fiction (11000) * 0.1 = 1100, running = 8800
      // every $100 (in cents: every 10000) -> floor(8800 / 10000) * 100 = 0
      expect(result.every100Discount).toBe(0);
    });

    it('allows multiple every-$100 discounts', () => {
      const books = [
        { price: '70.00', category: 'Fiction' },
        { price: '80.00', category: 'Fiction' },
        { price: '90.00', category: 'Science' },
      ];
      const result = TransactionsService.applyDiscounts(books);
      // subtotal = 24000
      // tier 20% = 4800, running = 19200
      // category bonus: Fiction (15000) * 0.1 = 1500, running = 17700
      // every $100: floor(17700 / 10000) * 100 = 100
      expect(result.every100Discount).toBe(100);
    });

    it('never goes below zero', () => {
      const books = [{ price: '5.00', category: 'Fiction' }];
      // worst case: 1 item, no discounts
      const result = TransactionsService.applyDiscounts(books);
      expect(result.total).toBeGreaterThanOrEqual(0);
    });
  });
});
```

All amounts are in cents (Stripe convention). `every100Discount` is: floor(runningTotalInCents / 10000) * 100 (because $100 = 10000 cents, and $1 = 100 cents).

Wait, I need to reconsider the amounts. The spec says:
- Every $100 spent → $1 off
- Prices are in dollars (like $20.00)

So when prices come in as strings like "20.00", we need to:
- Convert to cents: $20 = 2000 cents
- Subtotal in cents
- Tier discount: percentage of subtotal in cents
- Category bonus: 10% of category subtotal in cents
- Every $100 discount: floor(runningTotalInCents / 10000) * 100 cents ($1 worth of cents)

Let me use dollars consistently within the function, then convert to cents for Stripe. Actually, let me make the function work in the same unit as input. If prices come in as strings like "20.00", I'll convert to number (dollars) internally, then multiply by 100 for cents.

Actually, looking at the existing service code:
```typescript
unit_amount: Math.round(Number(book.price) * 100),
```

So price is stored as a string like "20.00", and `Number("20.00")` gives 20.0. Multiply by 100 for cents.

For the discount function, let me work in cents throughout to make it consistent with Stripe. Input is `{ price: string, category: string }[]`. I'll convert `Number(price) * 100` for each book.

Let me simplify:
- Convert each book's price to cents via `Math.round(Number(price) * 100)`
- Subtotals in cents
- Discounts in cents
- Tier % applies to subtotal in cents
- Category bonus is 10% of category subtotal in cents
- Every $100: floor(runningCents / 10000) * 100 cents

OK, the test values need to be in cents then:
- $25.00 → 2500 cents
- $20.00 → 2000 cents

Let me recalculate test expectations:

Test 1: 1 item at $25.00 (2500 cents)
- subtotal = 2500
- tierPercent = 0, tierDiscount = 0
- categoryBonus = 0
- every100Discount = floor(2500 / 10000) * 100 = 0
- total = 2500

Test 2: 2 items, $20.00 (2000) + $30.00 (3000), different categories
- subtotal = 5000
- tierPercent = 10, tierDiscount = 500
- running = 4500
- categoryBonus = 0 (both have count 1)
- every100Discount = floor(4500 / 10000) * 100 = 0
- total = 4500

Test 3: 3 items, $10 (1000) + $15 (1500) + $20 (2000)
- categories: Fiction(2), Science(1)
- subtotal = 4500
- tierPercent = 20, tierDiscount = 900
- running = 3600
- categoryBonus: Fiction (2500) * 0.1 = 250
- running = 3350
- every100Discount = floor(3350 / 10000) * 100 = 0
- total = 3350

Wait, but the every $100 threshold. $100 in cents is 10000. `floor(3350 / 10000) = 0`. So $0.

Test 4: 4 items, $10 (1000) + $15 (1500) + $20 (2000) + $25 (2500)
- subtotal = 7000
- tierPercent = 30, tierDiscount = 2100
- running = 4900
- categoryBonus: Fiction(2): 2500 * 0.1 = 250, Science(2): 4500 * 0.1 = 450
- categoryBonus = 700
- running = 4200
- every100Discount = floor(4200 / 10000) * 100 = 0
- total = 4200

Test 5: $50 (5000) + $60 (6000), both Fiction
- subtotal = 11000
- tierPercent = 10, tierDiscount = 1100
- running = 9900
- categoryBonus = 11000 * 0.1 = 1100
- running = 8800
- every100Discount = floor(8800 / 10000) * 100 = 0
- total = 8800

Test 6: $70 (7000) + $80 (8000), Fiction + $90 (9000), Science
- subtotal = 24000
- tierPercent = 20, tierDiscount = 4800
- running = 19200
- categoryBonus: Fiction(2): 15000 * 0.1 = 1500
- running = 17700
- every100Discount = floor(17700 / 10000) * 100 = 100
- total = 17600

Let me update the test expectations.

Now, for making the private method testable, I have a few options:
1. Make `applyDiscounts` a static/standalone exported function
2. Use `// @ts-expect-error` to access private method
3. Use `prototype` access

For NestJS, the cleanest approach is to extract the discount logic into a standalone exported function in the transactions service file (or a separate file). Let me make it a static method on the class. Actually, simpler: export a standalone function from the transactions service.

Let me put it in the same file as a static method for simplicity, since the service already owns it. Actually, the simplest TDD approach: make `applyDiscounts` a `public static` method on the class.

Wait, actually the simplest is to just export a function from the file:

```typescript
export function applyDiscounts(books: { price: string; category: string }[]): DiscountResult {
  // ...
}
```

And call it from the service method. This way the test can import it directly without any module setup.

Let me do this. The test file imports `applyDiscounts` directly. No NestJS testing module needed — it's a pure function.

Let me rewrite the plan with this approach.

- [ ] **Step 1: Write the failing test**

Create `backend/src/transactions/discount.spec.ts`:
```typescript
import { applyDiscounts } from './transactions.service';

describe('applyDiscounts', () => {
  it('applies 0% tier for 1 item', () => {
    const result = applyDiscounts([{ price: '25.00', category: 'Fiction' }]);
    expect(result).toEqual({
      subtotal: 2500,
      tierPercent: 0,
      tierDiscount: 0,
      categoryBonus: 0,
      every100Discount: 0,
      total: 2500,
    });
  });

  it('applies 10% tier for 2 items, no category bonus if different categories', () => {
    const result = applyDiscounts([
      { price: '20.00', category: 'Fiction' },
      { price: '30.00', category: 'Science' },
    ]);
    expect(result).toEqual({
      subtotal: 5000,
      tierPercent: 10,
      tierDiscount: 500,
      categoryBonus: 0,
      every100Discount: 0,
      total: 4500,
    });
  });

  it('applies 20% tier for 3 items with category bonus', () => {
    const result = applyDiscounts([
      { price: '10.00', category: 'Fiction' },
      { price: '15.00', category: 'Fiction' },
      { price: '20.00', category: 'Science' },
    ]);
    expect(result).toEqual({
      subtotal: 4500,
      tierPercent: 20,
      tierDiscount: 900,
      categoryBonus: 250,
      every100Discount: 0,
      total: 3350,
    });
  });

  it('applies 30% tier for 4 items with per-category bonus', () => {
    const result = applyDiscounts([
      { price: '10.00', category: 'Fiction' },
      { price: '15.00', category: 'Fiction' },
      { price: '20.00', category: 'Science' },
      { price: '25.00', category: 'Science' },
    ]);
    expect(result).toEqual({
      subtotal: 7000,
      tierPercent: 30,
      tierDiscount: 2100,
      categoryBonus: 700,
      every100Discount: 0,
      total: 4200,
    });
  });

  it('applies every-$100 discount above $100 threshold', () => {
    const result = applyDiscounts([
      { price: '70.00', category: 'Fiction' },
      { price: '80.00', category: 'Fiction' },
      { price: '90.00', category: 'Science' },
    ]);
    expect(result).toEqual({
      subtotal: 24000,
      tierPercent: 20,
      tierDiscount: 4800,
      categoryBonus: 1500,
      every100Discount: 100,
      total: 17600,
    });
  });

  it('never goes below zero on heavy discounts', () => {
    // Ultra-cheap book with massive tier shouldn't go negative
    const result = applyDiscounts([{ price: '0.50', category: 'Fiction' }]);
    expect(result.total).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/transactions/discount.spec.ts
```
Expected: FAIL with "applyDiscounts is not defined" or similar.

- [ ] **Step 3: Implement applyDiscounts in transactions.service.ts**

Add the exported function at the top of `backend/src/transactions/transactions.service.ts`:

```typescript
export interface DiscountResult {
  subtotal: number;        // cents
  tierPercent: number;
  tierDiscount: number;    // cents
  categoryBonus: number;   // cents
  every100Discount: number; // cents
  total: number;           // cents
}

export function applyDiscounts(
  books: { price: string; category: string }[],
): DiscountResult {
  const subtotal = books.reduce(
    (sum, b) => sum + Math.round(Number(b.price) * 100),
    0,
  );

  // Stage 1 — Quantity Tier
  const count = books.length;
  const tierPercent = count >= 4 ? 30 : count === 3 ? 20 : count === 2 ? 10 : 0;
  const tierDiscount = Math.round(subtotal * (tierPercent / 100));
  let runningTotal = subtotal - tierDiscount;

  // Stage 2 — Category Bonus (on original prices)
  const catSubtotals = new Map<string, { subtotal: number; count: number }>();
  for (const book of books) {
    const price = Math.round(Number(book.price) * 100);
    const existing = catSubtotals.get(book.category) ?? { subtotal: 0, count: 0 };
    existing.subtotal += price;
    existing.count += 1;
    catSubtotals.set(book.category, existing);
  }

  let categoryBonus = 0;
  for (const { subtotal: catSubtotal, count } of catSubtotals.values()) {
    if (count >= 2) {
      categoryBonus += Math.round(catSubtotal * 0.1);
    }
  }
  runningTotal -= categoryBonus;

  // Stage 3 — Every $100 (10000 cents)
  const EVERY_X = 10000; // $100 in cents
  const DISCOUNT_Y = 100; // $1 in cents
  const every100Discount = Math.floor(runningTotal / EVERY_X) * DISCOUNT_Y;
  runningTotal -= every100Discount;

  // Clamp to zero
  const total = Math.max(0, runningTotal);

  return {
    subtotal,
    tierPercent,
    tierDiscount,
    categoryBonus,
    every100Discount,
    total,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest src/transactions/discount.spec.ts
```
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/transactions/transactions.service.ts backend/src/transactions/discount.spec.ts
git commit -m "feat: add discount pipeline (qty tier + category bonus + every-100)"
```

---

### Task 8: Backend cart checkout endpoint

**Files:**
- Modify: `backend/src/transactions/transactions.controller.ts`
- Modify: `backend/src/transactions/transactions.service.ts`

- [ ] **Step 1: Add cart checkout controller method**

In `backend/src/transactions/transactions.controller.ts`, add a new endpoint after `createCheckoutSession`:

```typescript
import { Controller, Post, Get, Param, Query, UseGuards, Body } from '@nestjs/common';

  @Post('api/cart/checkout')
  @UseGuards(AuthGuard)
  cartCheckout(
    @Body() body: { bookIds: string[] },
    @CurrentUser() user: { id: string },
  ) {
    return this.transactionsService.createCartCheckoutSession(body.bookIds, user.id);
  }
```

- [ ] **Step 2: Add createCartCheckoutSession method in the service**

In `backend/src/transactions/transactions.service.ts`, add the new method:

```typescript
  async createCartCheckoutSession(bookIds: string[], userId: string) {
    if (!bookIds || bookIds.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Fetch all books
    const books = await Promise.all(
      bookIds.map((id) => this.getBook(id)),
    );

    // Validate all exist and are purchasable
    const badBooks = books.filter((b) => b.inStock <= 1);
    if (badBooks.length > 0) {
      throw new BadRequestException(
        `Some books are no longer available for purchase: ${badBooks.map((b) => b.title).join(', ')}`,
      );
    }

    // Compute discount (pipeline needs category for category bonus)
    const discount = applyDiscounts(
      books.map((b) => ({ price: b.price, category: b.category })),
    );

    // Create Stripe session with the total amount
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Read in Pace — ${bookIds.length} book${bookIds.length > 1 ? 's' : ''}`,
            },
            unit_amount: discount.total,
          },
          quantity: 1,
        },
      ],
      metadata: {
        bookIds: JSON.stringify(bookIds),
        userId,
      },
      success_url: `${process.env.BETTER_AUTH_URL || 'http://localhost:3000'}/dashboard?tab=purchased&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BETTER_AUTH_URL || 'http://localhost:3000'}/feed`,
    });

    return { url: session.url };
  }
```

Wait, the category for category bonus is missing! I need to make sure `getBook` returns the category. Let me check the current `getBook` method — it doesn't include category. I need to add it.

Current `getBook`:
```typescript
  private async getBook(bookId: string) {
    const [book] = await this.db
      .select({
        id: schema.books.id,
        title: schema.books.title,
        price: schema.books.price,
        inStock: schema.books.inStock,
        isAvailable: schema.books.isAvailable,
      })
      .from(schema.books)
      .where(eq(schema.books.id, bookId));
    if (!book) throw new NotFoundException('Book not found');
    return book;
  }
```

I need to add `category: schema.books.category` to the select. Since this changes the return type of `getBook`, I need to update the method signature. The existing `createCheckoutSession` method uses `getBook` but only accesses `title`, `inStock`, and `price` — so adding `category` is backward-compatible.

- [ ] **Step 3: Update getBook to include category**

```typescript
  private async getBook(bookId: string) {
    const [book] = await this.db
      .select({
        id: schema.books.id,
        title: schema.books.title,
        price: schema.books.price,
        category: schema.books.category,
        inStock: schema.books.inStock,
        isAvailable: schema.books.isAvailable,
      })
      .from(schema.books)
      .where(eq(schema.books.id, bookId));
    if (!book) throw new NotFoundException('Book not found');
    return book;
  }
```

- [ ] **Step 4: Run existing tests**

```bash
npx jest src/transactions/discount.spec.ts
```
Expected: PASS (no existing tests broken, new tests pass).

- [ ] **Step 5: Commit**

```bash
git add backend/src/transactions/transactions.controller.ts backend/src/transactions/transactions.service.ts
git commit -m "feat: add POST /api/cart/checkout with Stripe session creation"
```

---

### Task 9: Backend batch confirm-purchase

**Files:**
- Modify: `backend/src/transactions/transactions.service.ts`

- [ ] **Step 1: Modify confirmPurchase to handle batch**

The current `confirmPurchase` reads `session.metadata!.bookId` (single). Change it to read `bookIds` (JSON string array) from metadata:

```typescript
  async confirmPurchase(sessionId: string, userId: string) {
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);
    if (
      session.payment_status !== 'paid' ||
      session.metadata?.userId !== userId
    ) {
      throw new BadRequestException('Invalid purchase confirmation');
    }

    const bookIdsRaw = session.metadata!.bookIds;
    if (!bookIdsRaw) {
      // Fallback to single bookId for backward compatibility
      const bookId = session.metadata!.bookId;
      if (!bookId) {
        throw new BadRequestException('No book IDs found in session metadata');
      }
      return this.recordSinglePurchase(bookId, userId);
    }

    const bookIds: string[] = JSON.parse(bookIdsRaw);
    return this.recordBatchPurchases(bookIds, userId);
  }

  private async recordSinglePurchase(bookId: string, userId: string) {
    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: schema.purchases.id })
        .from(schema.purchases)
        .where(
          and(
            eq(schema.purchases.bookId, bookId),
            eq(schema.purchases.userId, userId),
          ),
        );

      if (existing) return existing;

      const [purchase] = await tx
        .insert(schema.purchases)
        .values({ bookId, userId })
        .returning();

      await tx
        .update(schema.books)
        .set({ inStock: sql`${schema.books.inStock} - 1` })
        .where(gt(schema.books.inStock, 1));

      return purchase;
    });
  }

  private async recordBatchPurchases(bookIds: string[], userId: string) {
    return this.db.transaction(async (tx) => {
      const inserts = [];
      for (const bookId of bookIds) {
        const [existing] = await tx
          .select({ id: schema.purchases.id })
          .from(schema.purchases)
          .where(
            and(
              eq(schema.purchases.bookId, bookId),
              eq(schema.purchases.userId, userId),
            ),
          );

        if (existing) continue;

        inserts.push(
          tx.insert(schema.purchases).values({ bookId, userId }).returning(),
        );
      }

      // Batch decrement stock
      for (const bookId of bookIds) {
        await tx
          .update(schema.books)
          .set({ inStock: sql`${schema.books.inStock} - 1` })
          .where(gt(schema.books.inStock, 1));
      }

      const results = await Promise.all(inserts);
      return results.flat();
    });
  }
```

- [ ] **Step 2: Run tests**

```bash
npx jest src/transactions/discount.spec.ts
```
Expected: All PASS.

- [ ] **Step 3: Build check**

```bash
npm run build
```
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add backend/src/transactions/transactions.service.ts
git commit -m "feat: modify confirmPurchase for batch book purchase recording"
```

---

### Task 10: Full build verification

- [ ] **Step 1: Build frontend**

```bash
npm run build --workspace=frontend
```
Expected: BUILD SUCCESS.

- [ ] **Step 2: Build backend**

```bash
npm run build --workspace=backend
```
Expected: BUILD SUCCESS.

- [ ] **Step 3: Run backend tests**

```bash
npm run test --workspace=backend
```
Expected: All tests pass (including new discount tests).

- [ ] **Step 4: Run backend linter**

```bash
npm run lint --workspace=backend
```
Expected: Lint passes.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: verify full build and tests pass"
```
