# Frontend Design Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the amber + warm neutral palette and refined card-based design system across all frontend pages and components.

**Architecture:** Update CSS design tokens first (foundation), then update each component to use the new tokens, then polish pages. No structural or layout changes — purely visual refinement.

**Tech Stack:** Tailwind CSS v4 (CSS-first config), Nuxt 3, Vue 3 Composition API

**Files modified:** 18 files (1 CSS, 4 pages, 13 components)

---

### Task 1: CSS design tokens — amber palette, shadows, remove gradient

**Files:**
- Modify: `frontend/assets/css/main.css`

- [ ] **Step 1: Replace light palette (`:root`) with amber + warm neutral**

  Replace lines 41-63:

```css
:root {
  --radius: 0.75rem;
  --background: oklch(0.99 0.005 85);
  --foreground: oklch(0.18 0.01 70);
  --card: oklch(1 0.003 85);
  --card-foreground: oklch(0.18 0.01 70);
  --popover: oklch(1 0.003 85);
  --popover-foreground: oklch(0.18 0.01 70);
  --primary: oklch(0.7 0.14 75);
  --primary-foreground: oklch(0.99 0 0);
  --primary-soft: oklch(0.92 0.04 75);
  --secondary: oklch(0.95 0.008 80);
  --secondary-foreground: oklch(0.18 0.01 70);
  --muted: oklch(0.95 0.008 80);
  --muted-foreground: oklch(0.5 0.015 70);
  --accent: oklch(0.85 0.04 75);
  --accent-foreground: oklch(0.35 0.08 75);
  --destructive: oklch(0.6 0.2 25);
  --destructive-foreground: oklch(0.99 0 0);
  --border: oklch(0.9 0.008 80);
  --input: oklch(0.92 0.008 80);
  --ring: oklch(0.7 0.14 75);
}
```

- [ ] **Step 2: Replace dark palette (`.dark`) with warm dark neutral**

  Replace lines 65-84:

```css
.dark {
  --background: oklch(0.18 0.01 70);
  --foreground: oklch(0.96 0.005 85);
  --card: oklch(0.22 0.012 70);
  --card-foreground: oklch(0.96 0.005 85);
  --popover: oklch(0.22 0.012 70);
  --popover-foreground: oklch(0.96 0.005 85);
  --primary: oklch(0.75 0.14 75);
  --primary-foreground: oklch(0.18 0.01 70);
  --primary-soft: oklch(0.3 0.05 75);
  --secondary: oklch(0.26 0.012 70);
  --secondary-foreground: oklch(0.96 0.005 85);
  --muted: oklch(0.25 0.012 70);
  --muted-foreground: oklch(0.65 0.01 70);
  --accent: oklch(0.3 0.04 75);
  --accent-foreground: oklch(0.88 0.04 75);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.75 0.14 75);
}
```

- [ ] **Step 3: Remove `gradient-shift` keyframes and animation token, add shadow tokens**

  Replace the `@theme` block animation section and keyframes:

```css
@theme {
  /* ... existing radius tokens ... */
  /* ... existing color tokens ... */

  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;

  --animate-float: float 6s ease-in-out infinite;
  --animate-fade-up: fade-up 0.5s ease-out;

  --shadow-sm: 0 1px 2px oklch(0.2 0.02 70 / 0.06);
  --shadow-md: 0 4px 12px oklch(0.2 0.02 70 / 0.08);
  --shadow-lg: 0 8px 24px oklch(0.2 0.02 70 / 0.1);
}
```

  Remove the `gradient-shift` keyframes block entirely. Keep `float` and `fade-up`.

- [ ] **Step 4: Remove `bg-animated-gradient` utility, update `.glass`**

  Replace the `@layer utilities` block:

```css
@layer utilities {
  .glass {
    backdrop-filter: blur(20px) saturate(140%);
    background: color-mix(in oklab, white 55%, transparent);
    border: 1px solid color-mix(in oklab, white 70%, transparent);
  }
}
```

- [ ] **Step 5: Verify no broken references**

  Run: `npm run dev` (from frontend/) and check the browser console for missing class errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/assets/css/main.css
git commit -m "feat: update design tokens to amber + warm neutral palette"
```

---

### Task 2: Landing page — warm overlay, amber badge, amber CTA

**Files:**
- Modify: `frontend/pages/index.vue`

- [ ] **Step 1: Update the gradient overlay to warm amber**

```vue
<div
  class="absolute inset-0 bg-linear-to-b from-amber-900/30 via-transparent to-background"
/>
```

  Note: `amber-900` is an existing Tailwind v4 color; Tailwind v4's `color-mix` with OKLCH handles it fine with our custom `--color-background`.

- [ ] **Step 2: Update the badge to warm amber pill (not glass)**

```vue
<span
  class="mb-6 rounded-full bg-amber-50 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
>
  A quieter library
</span>
```

- [ ] **Step 3: Update CTA button to amber filled (not glass)**

```vue
<NuxtLink
  to="/feed"
  class="group mt-10 inline-flex items-center gap-3 rounded-lg bg-primary px-7 py-4 text-base font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:translate-y-[-1px] hover:shadow-md"
>
  Explore the Library
  <ArrowRight
    class="h-4 w-4 transition-transform group-hover:translate-x-1"
  />
</NuxtLink>
```

- [ ] **Step 4: Commit**

```bash
git add frontend/pages/index.vue
git commit -m "feat: update landing page with warm amber palette"
```

---

### Task 3: Navbar + Footer

**Files:**
- Modify: `frontend/components/Navbar.vue`
- Modify: `frontend/components/Footer.vue`

- [ ] **Step 1: Update Navbar — thin bottom border, amber logo accent, elevated dropdown**

  Replace the current header and nav link classes in `Navbar.vue`:

  Header stays `border-b border-border/60 bg-background/70 backdrop-blur-xl` (already clean).

  Update logo to use amber primary:
```vue
<NuxtLink to="/" class="text-lg font-semibold tracking-tight">
  Read<span class="text-primary"> in </span>Pace
</NuxtLink>
```
  (This already uses `text-primary`, which now resolves to amber — no change needed for logo.)

  Update dropdown to elevated card style (line 71):
```vue
<div
  v-if="open"
  class="absolute right-0 mt-2 w-60 origin-top-right rounded-xl border border-border bg-card p-2 shadow-md"
>
```
  Change `shadow-lg` to `shadow-md` and `bg-popover` to `bg-card`.

  Update the profile avatar button (line 61):
```vue
<button
  @click="open = !open"
  @blur="setTimeout(() => (open = false), 150)"
  class="flex h-9 w-9 items-center cursor-pointer justify-center rounded-full bg-primary/10 text-primary ring-1 ring-border transition-all duration-200 hover:scale-105 hover:ring-primary/30"
  aria-label="Profile menu"
>
```

- [ ] **Step 2: Update Footer — amber divider, warm muted text**

```vue
<template>
  <footer
    class="border-t border-border/60 py-8 text-center text-xs text-muted-foreground"
  >
    <p>&copy; 2026 Read in Peace &middot; Built with 💚 Nuxt &amp; Nest</p>
  </footer>
</template>
```

  Changed `border-border` to `border-border/60` for subtler line.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/Navbar.vue frontend/components/Footer.vue
git commit -m "feat: update navbar and footer with amber palette"
```

---

### Task 4: Modal surfaces — AuthModal, BookFormModal, AdminFab

**Files:**
- Modify: `frontend/components/AuthModal.vue`
- Modify: `frontend/components/BookFormModal.vue`
- Modify: `frontend/components/AdminFab.vue`

- [ ] **Step 1: AuthModal — swap tab active to amber, submit button to amber, warm input focus**

  Tab active state (lines 60-68): `bg-card` stays, change `shadow` is fine. Already uses `text-primary` for links (now amber). Good.

  Input focus (lines 89, 100, 111): Change `focus:border-primary` stays — now amber. Good.

  Submit button (line 119): Change from `bg-foreground text-background` to amber:
```vue
<button
  @click="handleSubmit"
  :disabled="submitting"
  class="w-full rounded-lg bg-primary px-4 py-2 cursor-pointer text-sm font-semibold text-primary-foreground transition-all duration-200 hover:translate-y-[-1px] hover:shadow-md disabled:opacity-50"
>
```

- [ ] **Step 2: BookFormModal — swap surface to warm card, inputs to amber focus**

  Line 61: Modal surface already uses `bg-card` — fine.

  Line 77, 81, 88, 92, 102, 107: Input focus from `focus:border-foreground` to amber:
```vue
class="... focus:border-primary"
```
  Apply to all 6 input/select/textarea elements.

  Save button (line 128): Change to amber primary:
```vue
<button
  type="submit"
  :disabled="saving"
  class="rounded-lg bg-primary cursor-pointer px-4 py-2 text-sm font-medium text-primary-foreground transition-all duration-200 hover:translate-y-[-1px] disabled:opacity-50"
>
```

  Cancel button (line 121): Add border and hover:
```vue
<button
  type="button"
  @click="emit('close')"
  class="rounded-lg border cursor-pointer border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
>
```
(Already done — no change needed.)

- [ ] **Step 3: AdminFab — amber accent stays, add hover lift**

  Line 11: Already uses `bg-primary` and `shadow-lg shadow-primary/30`. Add `hover:translate-y-[-1px]`:
```vue
<button
  v-if="auth.adminMode"
  class="fixed bottom-8 right-8 z-40 flex h-14 items-center gap-2 rounded-lg cursor-pointer bg-primary px-5 text-primary-foreground shadow-lg shadow-primary/30 transition-all duration-200 hover:scale-105 hover:translate-y-[-1px]"
>
```

- [ ] **Step 4: Commit**

```bash
git add frontend/components/AuthModal.vue frontend/components/BookFormModal.vue frontend/components/AdminFab.vue
git commit -m "feat: update modal surfaces with amber palette"
```

---

### Task 5: BookCard — elevated card, amber stock badge, amber buttons

**Files:**
- Modify: `frontend/components/BookCard.vue`

- [ ] **Step 1: Update card container to elevated style**

  Line 53-54: Change card container:
```vue
<div
  class="group relative flex flex-col overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm transition-all duration-200 hover:shadow-md"
>
```
  Removed `hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5`, added `shadow-sm` and `hover:shadow-md`, thinner border `border-border/60`.

- [ ] **Step 2: Update admin action buttons**

  Lines 62, 68: Keep as-is (they're clean `bg-background/90` buttons).

- [ ] **Step 3: Update stock badge to use amber/red instead of green/red**

  Line 38: Change the stockClass computed:
```ts
const stockClass = computed(() => {
  return props.book.inStock >= 1 ? "bg-primary-soft text-primary" : "bg-red-500/10 text-red-500";
});
```

- [ ] **Step 4: Update borrow button to amber outline**

  Line 27-31: Change borrow button class:
```ts
const borrowBtnClass = computed(() => {
  return props.book.isAvailable && props.book.inStock >= 1
    ? "cursor-pointer border-primary/30 text-primary hover:bg-primary-soft hover:border-primary"
    : "cursor-not-allowed border-dashed border-muted-foreground/30 text-muted-foreground/50";
});
```

  Line 127-128: Add `transition-all duration-200`:
```vue
<button
  @click="dashboard.borrowBook(book.id)"
  :disabled="!book.isAvailable || book.inStock < 1"
  class="flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-200"
  :class="borrowBtnClass"
>
```

- [ ] **Step 5: Update Buy button to amber primary**

  Line 120: Already uses `bg-primary text-primary-foreground` — now amber. Good.

  Line 104: Return button — change to amber outline:
```vue
<button
  @click="dashboard.returnBook(book.id)"
  class="flex w-full items-center cursor-pointer justify-center gap-2 rounded-lg border border-primary/30 px-3 py-2 text-sm font-medium text-primary transition-all duration-200 hover:bg-primary-soft"
>
```

  Line 111: Read Now button — already uses `bg-primary`. Good.

- [ ] **Step 6: Commit**

```bash
git add frontend/components/BookCard.vue
git commit -m "feat: update BookCard with elevated card and amber palette"
```

---

### Task 6: BookShelf — amber category pills, amber pagination

**Files:**
- Modify: `frontend/components/BookShelf.vue`

- [ ] **Step 1: Update category pills to amber**

  Lines 41-45: Replace the class logic for category pills:
```vue
<button
  v-for="cat in categories"
  :key="cat"
  @click="emit('categoryChange', cat)"
  class="rounded-full cursor-pointer px-4 py-1.5 text-sm font-medium transition-all duration-200"
  :class="
    activeCategory === cat
      ? 'bg-primary text-primary-foreground shadow-sm'
      : 'border border-border/60 text-muted-foreground hover:text-foreground hover:border-border'
  "
>
```

- [ ] **Step 2: Update pagination to amber**

  Lines 60-95: Update pagination buttons to use amber active state:

  Arrow buttons (lines 64, 92): Keep `border border-border transition-colors hover:bg-muted disabled:opacity-40`.

  Page number active (line 74): Change from `bg-foreground text-background` to amber:
```vue
page === n ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted'
```

  Same change for line 84 (ellipsis end page).

- [ ] **Step 3: Commit**

```bash
git add frontend/components/BookShelf.vue
git commit -m "feat: update BookShelf with amber pills and pagination"
```

---

### Task 7: TrendingSection — amber accent, refined cards

**Files:**
- Modify: `frontend/components/TrendingSection.vue`

- [ ] **Step 1: Update "Trending Now" header to amber**

  Line 14: Already uses `text-primary` — now amber. Good.

- [ ] **Step 2: Update trending cards to elevated style with amber accent on featured**

  Line 28: Update the card class:
```vue
<a
  v-for="(b, i) in trending"
  :key="b.id"
  :href="'/book/' + b.id"
  class="group relative overflow-hidden max-h-117.5 rounded-lg border shadow-sm bg-card transition-all duration-200 hover:shadow-md"
  :class="[
    i === 0 ? 'md:col-span-2 md:row-span-2' : '',
    i === 0 ? 'border-primary/20' : 'border-border/60'
  ]"
>
```
  Note: Replace `NuxtLink` with `<a>` to avoid SSR issues with `v-for` + dynamic `:to` — actually keep `NuxtLink` with `:to`:
```vue
<NuxtLink
  v-for="(b, i) in trending"
  :key="b.id"
  :to="'/book/' + b.id"
  class="group relative overflow-hidden max-h-117.5 rounded-lg border bg-card transition-all duration-200 hover:shadow-md"
  :class="[i === 0 ? 'md:col-span-2 md:row-span-2 border-primary/20 shadow-sm' : 'border-border/60 shadow-sm']"
>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/components/TrendingSection.vue
git commit -m "feat: update TrendingSection with elevated cards"
```

---

### Task 8: BookDetails + BookActions + BookRating

**Files:**
- Modify: `frontend/components/BookDetails.vue`
- Modify: `frontend/components/BookActions.vue`
- Modify: `frontend/components/BookRating.vue`

- [ ] **Step 1: BookDetails — amber price badge, amber star**

  Line 31: Price badge already uses `bg-primary-soft text-primary` — now amber. Good.

  Line 35: Star fill — change to amber:
```vue
<Star class="h-4 w-4 fill-amber-400 text-amber-400" />
```

  Line 13: Stock badge — change green to amber/primary:
```ts
const stockBadgeClass = computed(() =>
  props.book.inStock >= 1 ? 'bg-primary-soft text-primary' : 'bg-red-500/10 text-red-500'
);
```

- [ ] **Step 2: BookActions — amber buy button, amber outline borrow**

  Line 36: Buy button already uses `bg-primary text-primary-foreground`. Update to use the new transitions:
```vue
<button
  v-if="book.inStock > 1"
  @click="emit('buy')"
  class="flex-1 rounded-lg bg-primary cursor-pointer px-6 py-3.5 font-medium text-primary-foreground transition-all duration-200 hover:translate-y-[-1px] hover:shadow-md"
>
```

  Line 17-19: Borrow button — amber outline:
```ts
const borrowBtnClass = computed(() => {
  const canBorrow = props.book.isAvailable && props.book.inStock >= 1 && !props.hasBorrowed;
  return canBorrow
    ? 'cursor-pointer border-primary/30 text-primary hover:bg-primary-soft hover:border-primary'
    : 'cursor-not-allowed border-dashed border-muted-foreground/30 text-muted-foreground/50';
});
```

- [ ] **Step 3: BookRating — already uses `text-amber-400` (no change needed)**

  Verify lines 28-29: already `hover:text-amber-400` and `text-amber-400`. No changes needed.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/BookDetails.vue frontend/components/BookActions.vue frontend/components/BookRating.vue
git commit -m "feat: update book detail sub-components with amber palette"
```

---

### Task 9: BookComments + BookShare

**Files:**
- Modify: `frontend/components/BookComments.vue`
- Modify: `frontend/components/BookShare.vue`

- [ ] **Step 1: BookComments — card per comment, warm divider**

  Line 53: Comment items — make each a warm card:
```vue
<div v-for="c in comments" :key="c.id" class="rounded-lg border border-border/60 bg-card p-4 shadow-sm">
  <div class="flex gap-4">
    <div
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary"
    >
      {{ getInitials(c.user.name) }}
    </div>
    <div class="flex-1">
      <div class="flex items-center gap-2">
        <p class="font-medium">{{ c.user.name }}</p>
        <span class="text-xs text-muted-foreground">{{ new Date(c.createdAt).toLocaleDateString() }}</span>
      </div>
      <p class="mt-1 text-sm text-muted-foreground">{{ c.text }}</p>
    </div>
  </div>
</div>
```

  Line 34: Comment form — already uses `rounded-lg border border-border bg-card p-4`. Update submit button to amber:
```vue
<button
  type="submit"
  class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all duration-200 hover:translate-y-[-1px]"
>
  Post comment
</button>
```

- [ ] **Step 2: BookShare — elevated popover card**

  Line 18: Update share popover surface:
```vue
<div
  v-if="showShare"
  class="absolute left-full top-0 ml-3 flex flex-col gap-1 rounded-lg border border-border/60 bg-card p-2 shadow-md whitespace-nowrap"
>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/components/BookComments.vue frontend/components/BookShare.vue
git commit -m "feat: update BookComments and BookShare with card style"
```

---

### Task 10: Page-level polish — Feed, Book Detail, Dashboard

**Files:**
- Modify: `frontend/pages/feed.vue`
- Modify: `frontend/pages/book/[id].vue`
- Modify: `frontend/pages/dashboard.vue`

- [ ] **Step 1: Feed page — no component-level changes needed**

  The feed page just composes `TrendingSection`, `BookShelf`, `BookFormModal` — all already updated.

- [ ] **Step 2: Book Detail page — amber back link, action buttons, cover shadow**

  Line 26: Back link — already uses `text-muted-foreground hover:text-foreground`. Fine.

  Line 36: Cover container — update shadow to warm:
```vue
<div class="w-full overflow-hidden rounded-lg border border-border/60 shadow-md">
```

  Line 54-55: Heart button — no change needed (already clean).

  Line 64-65: Comment toggle button — no change needed.

- [ ] **Step 3: Dashboard page — underline tabs with amber active indicator**

  Replace the current pill-style tab bar (lines 50-75) with underline-style tabs:

```vue
<div class="mb-8 flex gap-6 border-b border-border/60">
  <button
    @click="tab = 'borrowed'"
    class="flex items-center gap-2 pb-3 cursor-pointer text-sm font-medium transition-all duration-200 border-b-2 -mb-[1px]"
    :class="
      tab === 'borrowed'
        ? 'border-primary text-foreground'
        : 'border-transparent text-muted-foreground hover:text-foreground'
    "
  >
    <BookMarked class="h-4 w-4" /> Borrowed {{ borrowedBooks.length }}
  </button>
  <button
    @click="tab = 'purchased'"
    class="flex items-center gap-2 pb-3 cursor-pointer text-sm font-medium transition-all duration-200 border-b-2 -mb-[1px]"
    :class="
      tab === 'purchased'
        ? 'border-primary text-foreground'
        : 'border-transparent text-muted-foreground hover:text-foreground'
    "
  >
    <Library class="h-4 w-4" /> Purchased {{ purchasedBooks.length }}
  </button>
</div>
```

  Update empty state dashed border to be subtler:
```vue
<div
  class="rounded-2xl border border-dashed border-border/60 py-20 text-center"
>
```

- [ ] **Step 4: Commit**

```bash
git add frontend/pages/feed.vue frontend/pages/book/\[id\].vue frontend/pages/dashboard.vue
git commit -m "feat: update pages with amber palette and underline tabs"
```

---

### Task 11: Verify the build

- [ ] **Step 1: Run dev server and check for errors**

```bash
npm run build
```

  Run from `frontend/` directory. Expected: clean build with no errors.

- [ ] **Step 2: Fix any issues found**

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve design refresh build issues"
```
