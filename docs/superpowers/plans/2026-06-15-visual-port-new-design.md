# Visual Port — Ex Libris Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the frontend's visual design system (colors, fonts, radii, cover display, animations, button variants) with the Ex Libris design from `new_design/`.

**Architecture:** A CSS-first restyle. The theme file `assets/css/main.css` is replaced with the new_design's color palette and design tokens. Google Fonts are added via `nuxt.config.ts`. A cover crop CSS system is added, and a custom button component defines archival-style variants. Data model adds `crop` field. All existing pages, features, and data flow are untouched.

**Tech Stack:** Nuxt 3, Vue 3, Tailwind CSS v4, shadcn-vue, `class-variance-authority`, `tw-animate-css`

---

### Task 1: Replace CSS Theme File

**Files:**
- Modify: `frontend/assets/css/main.css`

- [ ] **Step 1: Write the new CSS file**

Replace the entire file content:

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:where(.dark, .dark *));

@theme inline {
  --font-serif: "Lora", serif;
  --font-sans: "Inter", sans-serif;
  --font-mono: "JetBrains Mono", monospace;
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

  --animate-float: float 6s ease-in-out infinite;
}

:root {
  --radius: 0.25rem;
  --background: oklch(0.975 0.008 88);
  --foreground: oklch(0.21 0 0);
  --card: oklch(0.995 0.004 88 / 70%);
  --card-foreground: oklch(0.21 0 0);
  --popover: oklch(0.99 0.006 88);
  --popover-foreground: oklch(0.21 0 0);
  --primary: oklch(0.39 0.145 25);
  --primary-foreground: oklch(0.975 0.008 88);
  --secondary: oklch(0.94 0.012 70);
  --secondary-foreground: oklch(0.21 0 0);
  --muted: oklch(0.93 0.008 88);
  --muted-foreground: oklch(0.48 0.01 35);
  --accent: oklch(0.93 0.02 28);
  --accent-foreground: oklch(0.39 0.145 25);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.984 0.003 247.858);
  --border: oklch(0.21 0 0 / 10%);
  --input: oklch(0.21 0 0 / 8%);
  --ring: oklch(0.39 0.145 25 / 40%);
}

.dark {
  --background: oklch(0.129 0.042 264.695);
  --foreground: oklch(0.984 0.003 247.858);
  --card: oklch(0.208 0.042 265.755);
  --card-foreground: oklch(0.984 0.003 247.858);
  --popover: oklch(0.208 0.042 265.755);
  --primary: oklch(0.929 0.013 255.508);
  --primary-foreground: oklch(0.208 0.042 265.755);
  --secondary: oklch(0.279 0.041 260.031);
  --secondary-foreground: oklch(0.984 0.003 247.858);
  --muted: oklch(0.279 0.041 260.031);
  --muted-foreground: oklch(0.704 0.04 256.788);
  --accent: oklch(0.279 0.041 260.031);
  --accent-foreground: oklch(0.984 0.003 247.858);
  --destructive: oklch(0.704 0.191 22.216);
  --destructive-foreground: oklch(0.984 0.003 247.858);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.551 0.027 264.364);
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-enter {
  animation: slide-up 600ms cubic-bezier(0.19, 1, 0.22, 1) both;
}

.cover-crop {
  position: relative;
  overflow: hidden;
}
.cover-crop img {
  position: absolute;
  width: 300%;
  max-width: none;
  height: 200%;
  object-fit: fill;
}
.cover-0 img { left: 0; top: 0; }
.cover-1 img { left: -100%; top: 0; }
.cover-2 img { left: -200%; top: 0; }
.cover-3 img { left: 0; top: -100%; }
.cover-4 img { left: -100%; top: -100%; }
.cover-5 img { left: -200%; top: -100%; }

@layer utilities {
  .glass {
    backdrop-filter: blur(20px) saturate(140%);
    background: color-mix(in oklab, white 55%, transparent);
    border: 1px solid color-mix(in oklab, white 70%, transparent);
  }
}

@layer base {
  * {
    border-color: var(--border);
  }
  body {
    background-color: var(--background);
    color: var(--foreground);
    font-family: var(--font-sans, "Inter", ui-sans-serif, system-ui, sans-serif);
    -webkit-font-smoothing: antialiased;
  }
  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-serif, "Lora", serif);
    letter-spacing: -0.02em;
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 2: Verify dev server starts**

Run: `npm run dev`
Expected: Nuxt dev server starts on port 3000 with no errors. Page loads with new blue-slate colors.

- [ ] **Step 3: Commit**

```bash
git add frontend/assets/css/main.css frontend/package.json frontend/package-lock.json
git commit -m "feat: replace CSS theme with Ex Libris design tokens, install tw-animate-css and cva"
```

---

### Task 2: Add Google Fonts

**Files:**
- Modify: `frontend/nuxt.config.ts`

- [ ] **Step 1: Update nuxt.config.ts**

Add font preconnect and stylesheet links inside the existing config object:

```ts
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  ssr: true,
  devtools: { enabled: true },
  css: ["~/assets/css/main.css"],
  modules: [
    "@pinia/nuxt",
    "shadcn-nuxt",
    "@stefanobartoletti/nuxt-social-share",
  ],
  socialShare: {
    baseUrl: process.env.NUXT_PUBLIC_SITE_URL || "http://localhost:3000",
  },
  devServer: {
    port: 3000,
  },
  runtimeConfig: {
    public: {
      backendUrl: "http://localhost:4000",
    },
  },
  compatibilityDate: "2026-06-03",
  experimental: {
    appManifest: false,
  },
  vite: {
    plugins: [tailwindcss()],
  },
  app: {
    head: {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono&family=Lora:wght@400;500;600&display=swap', rel: 'stylesheet' },
      ],
    },
  },
});
```

- [ ] **Step 2: Verify fonts load**

Run: `npm run dev`
Expected: Dev server starts. In browser devtools → Network tab, verify Google Fonts CSS + woff2 files are loading. Text renders in Lora (headings) + Inter (body).

- [ ] **Step 3: Commit**

```bash
git add frontend/nuxt.config.ts
git commit -m "feat: add Google Fonts (Lora, Inter, JetBrains Mono) via nuxt config"
```

---

### Task 3: Add `crop` Field to Data Model

**Files:**
- Modify: `frontend/data/books.ts`
- Modify: `frontend/stores/cart.ts`

- [ ] **Step 1: Add `crop` to Book interface and seed data**

In `data/books.ts`, add `crop: number` to the `Book` interface and assign crop positions (0-5) to each seed book:

```ts
export interface Book {
  id: string;
  title: string;
  author: string;
  price: number;
  cover: string;
  synopsis: string;
  rating: number;
  category: string;
  crop: number;
  trending?: boolean;
}
```

Also update the `books` array map:

```ts
export const books: Book[] = titles.map(([title, author], i) => ({
  id: String(i + 1),
  title,
  author,
  price: Math.round((9 + i * 1.7) * 100) / 100,
  cover: covers[i % covers.length],
  synopsis,
  rating: 3.8 + ((i * 0.13) % 1.2),
  category: categories[i],
  crop: i % 6,
  trending: i < 3,
}));
```

- [ ] **Step 2: Add `crop` to CartItem in cart store**

In `stores/cart.ts`, add `crop: number` to the `CartItem` interface:

```ts
export interface CartItem {
  bookId: string;
  title: string;
  author: string;
  cover: string;
  price: number;
  category: string;
  crop: number;
}
```

- [ ] **Step 3: Update addItem callers to pass crop**

In `stores/books.ts`, find all `cartStore.addItem(...)` calls. The store action is called from `BookActions.vue` and `BookCard.vue`. Check the `handleBuy` function in both:

In `BookCard.vue:48-56`:
```ts
function handleBuy() {
  cartStore.addItem({
    bookId: props.book.id,
    title: props.book.title,
    author: props.book.author,
    cover: props.book.cover,
    price: Number(props.book.price),
    category: props.book.category,
    crop: props.book.crop,
  });
}
```

In `BookActions.vue:32-41`:
```ts
function handleBuy() {
  cartStore.addItem({
    bookId: props.book.id,
    title: props.book.title,
    author: props.book.author,
    cover: props.book.cover,
    price: Number(props.book.price),
    category: props.book.category,
    crop: props.book.crop,
  });
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npm run build`
Expected: No TypeScript errors related to missing `crop` property.

- [ ] **Step 5: Commit**

```bash
git add frontend/data/books.ts frontend/stores/cart.ts frontend/components/BookCard.vue frontend/components/BookActions.vue
git commit -m "feat: add crop field to Book and CartItem data models"
```

---

### Task 4: Create Button Component with Custom Variants

**Files:**
- Create: `frontend/components/ui/button/Button.vue`

- [ ] **Step 1: Create Button.vue with archival variants**

Create the file at `frontend/components/ui/button/Button.vue`:

```vue
<script setup lang="ts">
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        archival: 'rounded-sm bg-foreground text-background shadow-none hover:bg-primary',
        archivalOutline:
          'rounded-sm border border-border bg-transparent text-foreground shadow-none hover:border-primary/40 hover:bg-card',
        archivalGhost:
          'rounded-sm bg-transparent text-muted-foreground shadow-none hover:text-primary',
        archivalDock:
          'h-auto flex-col gap-0.5 rounded-none bg-transparent p-0 text-background shadow-none hover:text-primary',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline:
          'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

type ButtonVariants = VariantProps<typeof buttonVariants>;

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariants['variant'];
    size?: ButtonVariants['size'];
    class?: string;
  }>(),
  {
    variant: 'default',
    size: 'default',
  },
);
</script>

<template>
  <button
    :class="buttonVariants({ variant, size, className: props.class })"
  >
    <slot />
  </button>
</template>
```

- [ ] **Step 2: Create component barrel export**

Create `frontend/components/ui/button/index.ts`:

```ts
export { default as Button } from './Button.vue';
```

Nuxt auto-imports from `components/ui/`, so `Button` will be available globally.

- [ ] **Step 3: Verify component auto-imports**

In any page template, temporarily add:
```vue
<Button variant="archivalGhost">Test</Button>
```
Run: `npm run dev`
Expected: Button renders with archivalGhost styling (transparent bg, muted text, no shadow).

Remove the test markup after verification.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/ui/button/
git commit -m "feat: create Button component with archival variants"
```

---

### Task 5: Add Cover Crop Wrappers to Book Display Components

**Files:**
- Modify: `frontend/components/BookCard.vue`
- Modify: `frontend/components/BookDetails.vue`
- Modify: `frontend/components/CheckoutDrawer.vue`

- [ ] **Step 1: Update BookCard.vue cover image**

Replace the cover image block (lines 87-96) with a crop wrapper:

```vue
<NuxtLink :to="`/book/${book.id}`" class="block overflow-hidden bg-muted">
  <div class="cover-crop cover-{{ String(book.crop) }} aspect-2/3 w-full overflow-hidden">
    <img
      :src="book.cover"
      :alt="book.title"
      loading="lazy"
      class="transition-transform duration-500 group-hover:scale-105"
    />
  </div>
</NuxtLink>
```

Note: Use `:class="`cover-crop cover-${book.crop}`"` for dynamic class binding:

```vue
<NuxtLink :to="`/book/${book.id}`" class="block overflow-hidden bg-muted">
  <div
    :class="`cover-crop cover-${book.crop}`"
    class="aspect-2/3 w-full overflow-hidden"
  >
    <img
      :src="book.cover"
      :alt="book.title"
      loading="lazy"
      class="transition-transform duration-500 group-hover:scale-105"
    />
  </div>
</NuxtLink>
```

- [ ] **Step 2: Update BookDetails.vue cover image**

In `pages/book/[id].vue`, replace the cover image block (lines 34-44) with a crop wrapper:

```vue
<div class="flex justify-center md:sticky md:top-24">
  <div class="w-full max-w-md">
    <div
      :class="`cover-crop cover-${book.crop}`"
      class="w-full overflow-hidden rounded-lg border border-border/60 shadow-md"
    >
      <img
        :src="book.cover"
        :alt="book.title"
        class="h-full w-full object-cover"
      />
    </div>
  </div>
</div>
```

- [ ] **Step 3: Update CheckoutDrawer.vue cart item thumbnails**

Replace the thumbnail wrapper (lines 61-69):

```vue
<NuxtLink :to="`/book/${item.bookId}`" class="shrink-0">
  <div
    :class="`cover-crop cover-${item.crop}`"
    class="w-12 h-16 overflow-hidden rounded border border-border/60 bg-muted"
  >
    <img
      :src="item.cover"
      :alt="item.title"
      class="h-full w-full object-cover"
    />
  </div>
</NuxtLink>
```

- [ ] **Step 4: Verify visually**

Run: `npm run dev`
Expected: Book covers display with crop positioning. Open browser to /feed and verify cover images render correctly inside cover-crop containers.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/BookCard.vue frontend/pages/book/\[id\].vue frontend/components/CheckoutDrawer.vue
git commit -m "feat: add cover crop system to book image displays"
```

---

### Task 6: Migrate Button Variants Across Components

**Files:**
- Modify: `frontend/components/CartIcon.vue`
- Modify: `frontend/components/CheckoutDrawer.vue`
- Modify: `frontend/components/BookActions.vue`
- Modify: `frontend/components/AdminFab.vue`
- Modify: `frontend/components/BookFormModal.vue`
- Modify: `frontend/components/AuthModal.vue`
- Modify: `frontend/components/BookShelf.vue`
- Modify: `frontend/components/Navbar.vue`

- [ ] **Step 1: Update CartIcon.vue**

Replace the button with `Button` component using `archivalGhost` variant and `font-mono` on the badge:

```vue
<script setup lang="ts">
import { ShoppingBag } from 'lucide-vue-next';
import { useCartStore } from '~/stores/cart';

const cartStore = useCartStore();
</script>

<template>
  <Button
    variant="archivalGhost"
    size="icon"
    class="relative"
    @click="cartStore.toggleDrawer()"
    aria-label="Open cart"
  >
    <ShoppingBag class="h-4 w-4" />
    <span
      v-if="cartStore.itemCount > 0"
      class="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-mono text-primary-foreground"
    >
      {{ cartStore.itemCount }}
    </span>
  </Button>
</template>
```

- [ ] **Step 2: Update CheckoutDrawer.vue**

Replace the close button (line 36-42) with `Button variant="archivalGhost" size="icon"`.
Replace the main checkout button (lines 123-128) with `Button variant="archival" class="w-full"`.
Replace the Remove buttons (lines 81-86) with `Button variant="archivalGhost" size="sm"`.

```vue
<!-- Close button -->
<Button
  variant="archivalGhost"
  size="icon"
  @click="cartStore.closeDrawer()"
>
  <X class="h-4 w-4" />
</Button>
```

```vue
<!-- Remove button -->
<Button
  variant="archivalGhost"
  size="sm"
  @click="cartStore.removeItem(item.bookId)"
>
  Remove
</Button>
```

```vue
<!-- Checkout button -->
<Button
  variant="archival"
  class="w-full py-3"
  @click="cartStore.checkout()"
>
  Proceed to Checkout — {{ formatPrice(breakdown.total) }}
</Button>
```

- [ ] **Step 3: Update BookActions.vue**

Replace Buy button (lines 46-52) with `Button variant="archival"`.
Replace Borrow button (lines 53-58) with `Button variant="archivalOutline"`.

```vue
<Button
  v-if="book.inStock > 1"
  variant="archival"
  class="flex-1"
  @click="handleBuy"
>
  Buy Now — ${{ Number(book.price).toFixed(2) }}
</Button>
<Button
  variant="archivalOutline"
  class="flex-1"
  :disabled="!book.isAvailable || book.inStock < 1 || hasBorrowed"
  @click="emit('borrow')"
>
  {{ borrowLabel }}
</Button>
```

Remove the now-unused `borrowBtnClass` and `buyFullWidth` computed properties.

- [ ] **Step 4: Update AdminFab.vue**

Replace the button with `Button variant="archival"`:

```vue
<Button
  v-if="auth.adminMode"
  variant="archival"
  class="fixed bottom-8 right-8 z-40 flex h-14 items-center gap-2 px-5 shadow-lg shadow-primary/30 transition-all duration-200 hover:scale-105 hover:-translate-y-px"
  @click="booksStore.openCreateForm()"
>
  <Plus class="h-5 w-5" />
  <span class="font-medium">Add New Book</span>
</Button>
```

- [ ] **Step 5: Update BookFormModal.vue**

Replace Cancel button (lines 118-124) with `Button variant="archivalGhost"`.
Replace Submit button (lines 125-131) with `Button variant="archival"`.

```vue
<Button variant="archivalGhost" @click="emit('close')">
  Cancel
</Button>
<Button
  variant="archival"
  :disabled="saving"
  @click="handleSubmit"
>
  {{ saving ? 'Saving' : props.book ? 'Save Changes' : 'Create Book' }}
</Button>
```

- [ ] **Step 6: Update AuthModal.vue**

Replace the Submit button (lines 114-120) with `Button variant="archival" class="w-full"`:

```vue
<Button
  variant="archival"
  class="w-full"
  :disabled="submitting"
  @click="handleSubmit"
>
  {{ submitting ? 'Please wait...' : tab === 'sign-in' ? 'Sign in' : 'Create account' }}
</Button>
```

- [ ] **Step 7: Update BookShelf.vue**

Replace the "+ New Book" button (lines 27-32) with `Button variant="archivalGhost"`:

```vue
<Button
  v-if="adminMode"
  variant="archivalGhost"
  @click="emit('addBook')"
>
  + New Book
</Button>
```

- [ ] **Step 8: Update Navbar.vue**

Keep the avatar trigger as a native `<button>` (needed for `ref` for click-outside detection), but update its classes to match archivalGhost styling:

```vue
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
```

Migrate dropdown action items to `Button variant="archivalGhost"`:

```vue
<template v-if="auth.signedIn">
  <div class="px-3 py-2">
    <p class="text-sm font-medium">{{ auth.user?.name }}</p>
    <p class="text-xs text-muted-foreground">{{ auth.user?.email }}</p>
  </div>
  <div class="my-1 h-px bg-border" />
  <Button
    variant="archivalGhost"
    class="w-full justify-start"
    @mousedown="navigate('/dashboard')"
  >
    <LayoutDashboard class="h-4 w-4" /> Dashboard
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
```

- [ ] **Step 9: Verify all buttons render with correct styles**

Run: `npm run dev`
Expected: All buttons across the app display with archival styling (sharp corners, muted text, primary hover).

- [ ] **Step 10: Commit**

```bash
git add frontend/components/CartIcon.vue frontend/components/CheckoutDrawer.vue frontend/components/BookActions.vue frontend/components/AdminFab.vue frontend/components/BookFormModal.vue frontend/components/AuthModal.vue frontend/components/BookShelf.vue frontend/components/Navbar.vue
git commit -m "feat: migrate buttons to archival variant system"
```

---

### Task 7: Add Entrance Animations to Pages

**Files:**
- Modify: `frontend/pages/feed.vue`
- Modify: `frontend/pages/book/[id].vue`
- Modify: `frontend/pages/dashboard.vue`

- [ ] **Step 1: Add `animate-enter` classes to feed page sections**

In `pages/feed.vue`, wrap the main sections with animated enter:

```vue
<main class="mx-auto max-w-5xl px-6 md:px-0 py-10">
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
</main>
```

- [ ] **Step 2: Add `animate-enter` to book detail page**

```vue
<main class="mx-auto max-w-5xl px-6 md:px-0 py-10">
  <div class="animate-enter">
    <NuxtLink
      to="/feed"
      class="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft class="h-4 w-4" /> Back to feed
    </NuxtLink>
  </div>

  <template v-if="book">
    <div class="animate-enter [animation-delay:100ms] grid grid-cols-1 gap-12 md:grid-cols-2 md:items-start">
      <!-- rest of existing content -->
    </div>
  </template>
</main>
```

- [ ] **Step 3: Add `animate-enter` to dashboard page**

```vue
<main class="mx-auto max-w-5xl px-6 md:px-0 py-10">
  <div class="animate-enter">
    <p class="text-sm text-muted-foreground">Welcome back</p>
    <h1 class="mt-1 text-4xl font-semibold tracking-tight">
      {{ auth.user?.name || 'Reader' }}
    </h1>
  </div>

  <div class="animate-enter [animation-delay:100ms] mb-8 flex gap-6 border-b border-border/60">
    <!-- existing tabs -->
  </div>

  <div class="animate-enter [animation-delay:200ms]">
    <!-- existing book grid -->
  </div>
</main>
```

- [ ] **Step 4: Verify animations play**

Run: `npm run dev`
Expected: Page content fades in and slides up with staggered delay on page load. `prefers-reduced-motion: reduce` disables animations.

- [ ] **Step 5: Commit**

```bash
git add frontend/pages/feed.vue frontend/pages/book/\[id\].vue frontend/pages/dashboard.vue
git commit -m "feat: add staggered entrance animations to pages"
```

---

### Task 8: Final Verification

- [ ] **Step 1: Build the frontend**

Run: `npm run build`
Expected: Build succeeds with no errors. Verify the output doesn't have obvious visual regressions.

- [ ] **Step 2: Visual checklist**

Navigate to each page and verify:
- Landing page: video plays, overlay gradient looks correct, text is readable
- Feed: Trending section loads, books display with crop covers, category pills look correct
- Book detail: Cover renders in crop container, metadata stacks correctly, buttons use archival variants
- Dashboard: Tabs switch, books load, buttons correct
- Cart drawer: Opens/closes smoothly, items show crop covers, discount breakdown renders
- Auth modal: Tabs switch, buttons correct
- Both light and dark modes render correctly

- [ ] **Step 3: Commit final verification fixes**

If any fixes needed, commit them.
