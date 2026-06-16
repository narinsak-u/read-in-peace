# Book Detail & Cart — Implementation Plan (Sub-project 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the book detail page with borrow/purchase cards and Reader Room, add a full `/cart` page with quantity controls and summary sidebar.

**Architecture:** Frontend-only changes. Cart store gains `quantity` field and new methods. New `/cart` page with standalone layout. Book detail page gets two-column layout with borrow/purchase cards and restyled review section. Existing drawer stays as mini-cart with a link to the full page.

**Tech Stack:** Nuxt 3, Vue 3 Composition API, Pinia, Tailwind CSS v4

---

### Task 1: Add Quantity to Cart Store

**Files:**
- Modify: `frontend/stores/cart.ts`

- [ ] **Step 1: Add quantity field and new methods**

Read `frontend/stores/cart.ts`. Make these changes:

**A) Add `quantity: number` to CartItem:**
```ts
export interface CartItem {
  bookId: string;
  title: string;
  author: string;
  cover: string;
  price: number;
  category: string;
  crop: number;
  quantity: number;
}
```

**B) Update `addItem`** to increment quantity if item already exists:
```ts
function addItem(item: Omit<CartItem, 'quantity'>) {
  const existing = items.value.find((i) => i.bookId === item.bookId);
  if (existing) {
    existing.quantity += 1;
  } else {
    items.value = [...items.value, { ...item, quantity: 1 }];
  }
  updateLocalStorage();
}
```

**C) Add new methods:**
```ts
function setQuantity(bookId: string, quantity: number) {
  if (quantity <= 0) {
    items.value = items.value.filter((i) => i.bookId !== bookId);
  } else {
    const item = items.value.find((i) => i.bookId === bookId);
    if (item) item.quantity = quantity;
  }
  updateLocalStorage();
}

function incrementQuantity(bookId: string) {
  const item = items.value.find((i) => i.bookId === bookId);
  if (item) {
    item.quantity += 1;
    updateLocalStorage();
  }
}

function decrementQuantity(bookId: string) {
  const item = items.value.find((i) => i.bookId === bookId);
  if (item && item.quantity > 1) {
    item.quantity -= 1;
    updateLocalStorage();
  } else {
    // quantity would go to 0 — remove
    items.value = items.value.filter((i) => i.bookId !== bookId);
    updateLocalStorage();
  }
}
```

**D) Update `itemCount` computed:**
```ts
const itemCount = computed(() =>
  items.value.reduce((sum, i) => sum + i.quantity, 0),
);
```

**E) Add to return:**
```ts
setQuantity, incrementQuantity, decrementQuantity,
```

**F) Update `saveToLocalStorage` / `loadFromLocalStorage`:** If localStorage exists, read the `quantity` field. The `CartItem` from local storage already has `quantity` as a field.

- [ ] **Step 2: Update all `addItem` callers**

Find all `cartStore.addItem(...)` calls in the codebase. They currently pass `CartItem` without `quantity`. Since the new signature is `Omit<CartItem, 'quantity'>`, all callers now pass the right shape (they don't include `quantity`). Verify this by building.

Run: `cd frontend && npm run build`
If there are type errors in callers that pass `CartItem` objects with a `quantity` field, update those callers to use `Omit` or remove the `quantity` field.

- [ ] **Step 3: Verify build**

```bash
cd frontend && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add frontend/stores/cart.ts
git commit -m "feat: add quantity field, setQuantity/increment/decrement to cart store"
```

---

### Task 2: Update CartIcon + CheckoutDrawer

**Files:**
- Modify: `frontend/components/CartIcon.vue`
- Modify: `frontend/components/CheckoutDrawer.vue`

- [ ] **Step 1: Update CartIcon badge**

Read `frontend/components/CartIcon.vue`. The badge already shows `cartStore.itemCount` — since `itemCount` is now quantity-based, the badge automatically reflects the total quantity. No code change needed. Verify the computed is correct.

### Step 2: Update CheckoutDrawer

Read `frontend/components/CheckoutDrawer.vue`. Add quantity display and "View full cart" link:

**A) Add quantity to each item row** (between price and remove button):

```vue
<div class="flex items-center justify-between mt-1.5">
  <div class="flex items-center gap-2">
    <span class="text-sm font-semibold">{{ formatPrice(item.price) }}</span>
    <span v-if="item.quantity > 1" class="text-xs text-muted-foreground">
      ×{{ item.quantity }}
    </span>
  </div>
  <Button
    variant="archivalGhost"
    size="sm"
    @click="cartStore.removeItem(item.bookId)"
  >
    Remove
  </Button>
</div>
```

**B) Add "View full cart" link** above the checkout button (or below the discount breakdown):

```vue
<div class="px-4 pb-1">
  <NuxtLink
    to="/cart"
    class="text-xs text-muted-foreground hover:text-primary transition-colors"
    @click="cartStore.closeDrawer()"
  >
    View full cart
  </NuxtLink>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/components/CheckoutDrawer.vue
git commit -m "feat: add quantity display and view full cart link to drawer"
```

---

### Task 3: Create Cart Layout + Page

**Files:**
- Create: `frontend/layouts/cart.vue`
- Create: `frontend/pages/cart.vue`

- [ ] **Step 1: Create layouts/cart.vue**

Minimal layout for cart page only:

```vue
<script setup lang="ts">
import { Toaster } from 'vue-sonner';
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <slot />
    <Toaster richColors position="top-center" />
  </div>
</template>
```

- [ ] **Step 2: Create pages/cart.vue**

Full cart page with quantity controls, summary sidebar, and empty state:

```vue
<script setup lang="ts">
import { ArrowLeft, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-vue-next';
import { useCartStore } from '~/stores/cart';
import { computeDiscount } from '~/utils/discount';

const cartStore = useCartStore();
const breakdown = computed(() => computeDiscount(cartStore.items));

function formatPrice(amount: number): string {
  return '$' + (amount / 100).toFixed(2);
}

definePageMeta({
  layout: 'cart',
  title: 'Your Cart — Read in Peace',
  description: 'Review the books in your cart before checkout.',
});
</script>

<template>
  <header class="border-b border-border bg-background/90">
    <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
      <NuxtLink to="/home" class="font-serif text-xl font-bold italic text-primary">
        Read in Peace
      </NuxtLink>
      <Button as-child variant="archivalGhost">
        <NuxtLink to="/explore"><ArrowLeft class="h-4 w-4 mr-1" /> Continue browsing</NuxtLink>
      </Button>
    </div>
  </header>

  <main class="mx-auto max-w-6xl px-4 py-10 md:px-6 lg:py-14">
    <div class="border-b border-border pb-5">
      <p class="font-mono text-[10px] uppercase tracking-widest text-primary">The book bag</p>
      <h1 class="mt-2 font-serif text-4xl font-bold md:text-5xl">Your cart</h1>
      <p class="mt-2 text-sm text-muted-foreground">
        {{ cartStore.itemCount }} {{ cartStore.itemCount === 1 ? 'volume' : 'volumes' }} selected
      </p>
    </div>

    <template v-if="cartStore.isEmpty">
      <section class="flex flex-col items-center py-24 text-center">
        <ShoppingCart class="h-10 w-10 text-muted-foreground" />
        <h2 class="mt-5 font-serif text-2xl">Your book bag is empty.</h2>
        <p class="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          Browse the stacks and keep a permanent copy of something worth returning to.
        </p>
        <Button as-child variant="archival" class="mt-6">
          <NuxtLink to="/explore">Explore the library</NuxtLink>
        </Button>
      </section>
    </template>

    <div v-else class="grid gap-12 py-10 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section class="divide-y divide-border">
        <article
          v-for="item in cartStore.items"
          :key="item.bookId"
          class="flex gap-5 py-6 first:pt-0"
        >
          <NuxtLink :to="`/book/${item.bookId}`" class="shrink-0">
            <div :class="`cover-crop cover-${item.crop}`" class="h-36 w-24 overflow-hidden shadow-md">
              <img :src="item.cover" :alt="item.title" />
            </div>
          </NuxtLink>
          <div class="flex min-w-0 flex-1 flex-col justify-between">
            <div>
              <NuxtLink
                :to="`/book/${item.bookId}`"
                class="font-serif text-xl font-bold transition-colors hover:text-primary"
              >
                {{ item.title }}
              </NuxtLink>
              <p class="mt-1 text-sm italic text-muted-foreground">by {{ item.author }}</p>
            </div>
            <div class="flex items-center gap-4">
              <span class="font-semibold">{{ formatPrice(item.price) }}</span>
              <div class="flex items-center gap-1">
                <Button
                  variant="archivalGhost"
                  size="icon"
                  class="h-7 w-7"
                  @click="cartStore.decrementQuantity(item.bookId)"
                >
                  <Minus class="h-3 w-3" />
                </Button>
                <span class="w-6 text-center text-sm font-mono">{{ item.quantity }}</span>
                <Button
                  variant="archivalGhost"
                  size="icon"
                  class="h-7 w-7"
                  @click="cartStore.incrementQuantity(item.bookId)"
                >
                  <Plus class="h-3 w-3" />
                </Button>
              </div>
              <Button
                variant="archivalGhost"
                size="sm"
                class="text-destructive"
                @click="cartStore.removeItem(item.bookId)"
              >
                <Trash2 class="h-3 w-3 mr-1" /> Remove
              </Button>
            </div>
          </div>
        </article>
      </section>

      <aside class="lg:sticky lg:top-24 lg:self-start">
        <div class="rounded-sm border border-border bg-card p-5 shadow-sm">
          <h3 class="mb-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Order Summary
          </h3>
          <div class="space-y-2 text-sm">
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
          <div class="mt-4 border-t border-border pt-4 flex justify-between font-semibold text-base">
            <span>Total</span>
            <span>{{ formatPrice(breakdown.total) }}</span>
          </div>
          <Button
            variant="archival"
            class="mt-4 w-full py-3"
            @click="cartStore.checkout()"
          >
            Proceed to Checkout — {{ formatPrice(breakdown.total) }}
          </Button>
        </div>
      </aside>
    </div>
  </main>
</template>
```

Note: The `as-child` prop on Button doesn't exist — use a wrapper pattern instead. Replace `<Button as-child variant="archivalGhost">` with the `NuxtLink` styled as a button. Use:

```vue
<NuxtLink
  to="/explore"
  class="inline-flex items-center gap-1 rounded-sm bg-transparent text-muted-foreground shadow-none transition-colors hover:text-primary text-sm h-9 px-4 py-2"
>
  <ArrowLeft class="h-4 w-4" /> Continue browsing
</NuxtLink>
```

And for the empty-state CTA:
```vue
<NuxtLink
  to="/explore"
  class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm bg-foreground text-background shadow-none hover:bg-primary text-sm font-medium h-9 px-4 py-2 mt-6"
>
  Explore the library
</NuxtLink>
```

- [ ] **Step 3: Verify build**

```bash
cd frontend && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add frontend/layouts/cart.vue frontend/pages/cart.vue
git commit -m "feat: create full cart page with quantity controls and summary sidebar"
```

---

### Task 4: Restyle Book Detail Page

**Files:**
- Modify: `frontend/pages/book/[id].vue`

- [ ] **Step 1: Replace book detail page**

Read the current file, then replace the template (keep script section as-is, only modify layout around the book content):

```vue
<template>
  <main class="animate-enter mx-auto max-w-5xl px-6 md:px-0 py-10">
    <NuxtLink
      to="/explore"
      class="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft class="h-4 w-4" /> Back to explore
    </NuxtLink>

    <template v-if="book">
      <div class="grid grid-cols-1 gap-12 md:grid-cols-2 md:items-start">
        <!-- Left: Cover -->
        <div class="flex justify-center md:sticky md:top-24">
          <div class="w-full max-w-md">
            <div
              :class="`cover-crop cover-${book.crop}`"
              class="w-full overflow-hidden rounded-sm border border-border/60 shadow-md"
            >
              <img
                :src="book.cover"
                :alt="book.title"
                class="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>

        <!-- Right: Details -->
        <div>
          <div class="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase text-muted-foreground">
            <span>Shelf: {{ book.id.slice(0, 8).toUpperCase() }}</span>
          </div>
          <h1 class="font-serif text-3xl font-bold">{{ book.title }}</h1>
          <p class="mb-6 italic text-muted-foreground">by {{ book.author }}</p>

          <div class="mb-4 flex items-center gap-1">
            <span class="text-lg text-primary">
              {{ '★★★★★'.slice(0, Math.round(Number(book.avgRating))) }}
            </span>
            <span class="text-lg text-foreground/10">
              {{ '★★★★★'.slice(Math.round(Number(book.avgRating))) }}
            </span>
            <span class="ml-2 text-sm text-muted-foreground">
              {{ Number(book.avgRating).toFixed(1) }}
            </span>
          </div>

          <p class="mb-8 text-sm leading-relaxed">{{ book.synopsis }}</p>

          <!-- Borrow Card -->
          <div class="mb-4 flex items-center justify-between rounded-sm border border-border bg-card p-4">
            <div>
              <p class="text-sm font-semibold">Borrow this book</p>
              <p class="text-xs text-muted-foreground">21-day loan from date of borrow</p>
            </div>
            <Button
              variant="archival"
              :disabled="book.inStock < 1 || hasBorrowed"
              @click="handleBorrow"
            >
              {{ hasBorrowed ? 'Already borrowed' : book.inStock < 1 ? 'Unavailable' : `Borrow (${book.inStock} available)` }}
            </Button>
          </div>

          <!-- Purchase Card -->
          <div class="flex items-center justify-between rounded-sm border border-border bg-card p-4">
            <div>
              <p class="text-sm font-semibold">Buy for ${{ Number(book.price).toFixed(2) }}</p>
              <p class="text-xs text-muted-foreground">Permanent copy</p>
            </div>
            <Button
              variant="archivalOutline"
              :disabled="book.inStock < 1"
              @click="handleBuy"
            >
              Purchase
            </Button>
          </div>
        </div>
      </div>

      <!-- Reader Room -->
      <div class="mt-16">
        <div class="mb-6 flex items-baseline justify-between border-b border-border pb-2">
          <h2 class="font-serif text-2xl">Reader Room</h2>
          <span class="font-mono text-[10px] uppercase text-muted-foreground">
            {{ comments.length }} {{ comments.length === 1 ? 'review' : 'reviews' }}
          </span>
        </div>

        <template v-if="comments.length === 0">
          <p class="py-12 text-center text-muted-foreground italic">
            No reviews yet. Be the first to share your thoughts.
          </p>
        </template>

        <div v-else class="space-y-6">
          <article
            v-for="comment in comments"
            :key="comment.id"
            class="border-l border-foreground/5 pl-4"
          >
            <div class="mb-1 flex items-center gap-2">
              <span class="flex size-6 items-center justify-center rounded-full bg-muted text-[8px] font-bold">
                {{ comment.user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() }}
              </span>
              <span class="text-[11px] font-bold uppercase">{{ comment.user.name }}</span>
              <span class="font-mono text-[10px] text-muted-foreground">
                {{ new Date(comment.createdAt).toLocaleDateString() }}
              </span>
            </div>
            <p class="text-sm leading-snug text-foreground/80">{{ comment.text }}</p>
          </article>
        </div>

        <!-- Review Form -->
        <div class="mt-8 rounded-sm border border-border bg-card p-5">
          <h3 class="mb-3 font-serif text-lg">Add your thoughts</h3>
          <div class="mb-3 flex gap-1">
            <button
              v-for="n in 5"
              :key="n"
              type="button"
              :aria-label="`Rate ${n} stars`"
              @click="reviewRating = n"
              class="cursor-pointer text-lg"
              :class="n <= reviewRating ? 'text-primary' : 'text-border'"
            >
              {{ n <= reviewRating ? '★' : '☆' }}
            </button>
          </div>
          <textarea
            v-model="reviewText"
            rows="3"
            placeholder="What did you think of this book?"
            class="mb-3 w-full resize-none rounded-sm border border-border bg-input p-3 text-sm placeholder-muted-foreground focus:ring-1 focus:ring-ring"
          />
          <Button
            variant="archival"
            :disabled="!reviewText.trim() || submitting"
            @click="submitReview"
          >
            {{ submitting ? 'Publishing' : 'Publish Review' }}
          </Button>
        </div>
      </div>
    </template>
  </main>
</template>
```

**Add to script section** (state for review form):

```ts
const reviewText = shallowRef('');
const reviewRating = shallowRef(0);
const submitting = shallowRef(false);

async function submitReview() {
  if (!reviewText.value.trim()) return;
  submitting.value = true;
  try {
    if (reviewRating.value > 0) {
      await booksStore.rateBook(id, reviewRating.value);
    }
    await booksStore.createComment(id, reviewText.value);
    reviewText.value = '';
    reviewRating.value = 0;
    await booksStore.fetchComments(id);
    await booksStore.fetchBook(id);
  } catch {
  } finally {
    submitting.value = false;
  }
}
```

- [ ] **Step 2: Verify build**

```bash
cd frontend && npm run build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/pages/book/\[id\].vue
git commit -m "feat: restyle book detail with borrow/purchase cards and Reader Room"
```

---

### Task 5: Final Verification

- [ ] **Step 1: Build frontend**

```bash
cd frontend && npm run build
```

Expected: Client + Server build succeeds.

- [ ] **Step 2: Run backend tests**

```bash
cd backend && npm test
```

Expected: Tests pass.

- [ ] **Step 3: Visual checklist**

- `/book/1` — Two-column layout, cover crop, metadata row, borrow card, purchase card, Reader Room reviews, review form
- `/cart` — Empty state renders, add items from drawer, quantity +/- works, summary calculates, checkout triggers Stripe
- Cart drawer — Quantity shown, "View full cart" link navigates to `/cart`
- CartIcon badge — Shows total quantity (sum of all item quantities)
