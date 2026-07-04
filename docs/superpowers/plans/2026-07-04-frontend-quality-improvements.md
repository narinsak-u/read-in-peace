# Frontend Quality Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address 12 findings from a Vue/Nuxt best-practice review — dead code, SSR safety, accessibility, Tailwind v4 idiomatic usage, and extracted utility functions.

**Architecture:** Each task is self-contained touching 1-4 files. Tasks 3 and 4 are the most impactful (SSR fix + utility extraction). Tasks 5-7 add shadcn Dialog and retrofit modals. Tasks 1, 2, 8, 9 are targeted cleanups.

**Tech Stack:** Nuxt 3, Vue 3 Composition API, shadcn-vue, Tailwind v4

---

## File Structure

| Task | Files | Change |
|------|-------|--------|
| 1 | `BookHero.vue`, `BookBorrowCard.vue`, `cart.vue` | Dead code + ClientOnly scope |
| 2 | `cart.vue` | computed extraction |
| 3 | `utils/comment.ts` (create), `composables/useBookComments.ts`, `composables/useBorrows.ts`, `composables/useFeed.ts`, test files | relocate pure functions |
| 4 | `composables/useBorrows.ts` | SSR singleton fix |
| 5 | `components/ui/dialog/` (create) | shadcn Dialog |
| 6 | `components/book/BookCard.vue` | Dialog retrofit |
| 7 | `layouts/default.vue` | skip link |
| 8 | `utils/comment.ts`, test files | timeAgo test update |
| 9 | `components/book/BookBorrowCard.vue` | window.confirm → modal |
| 10 | `AuthModal.vue` | focus trap |

---

### Task 1: Remove dead code and ClientOnly scope

**Files:**
- Modify: `frontend/components/book/BookHero.vue:16-18`
- Modify: `frontend/components/book/BookBorrowCard.vue:47-51`
- Modify: `frontend/pages/cart.vue:58,60`

- [ ] **Step 1: BookHero.vue — remove unused destructuring and add aria-hidden to video**

Remove unused `toggleLike` and `setRating` from the `useBook` destructuring. The button in the template uses `flash('coming soon')` instead.

```vue
<!-- BEFORE: line 16-18 -->
const { liked, likeCount, userRating, toggleLike, setRating } = useBook(
  () => props.bookId,
);

<!-- AFTER: -->
const { liked, likeCount, userRating } = useBook(
  () => props.bookId,
);
```

In `frontend/pages/index.vue`, add `aria-hidden="true"` to the background video element (it's decorative, not content-bearing):

```vue
    <video
      autoplay
      loop
      muted
      playsinline
      aria-hidden="true"
      class="absolute inset-0 h-full w-full object-cover"
    >
```

- [ ] **Step 2: BookBorrowCard.vue — remove duplicate onMounted**

The `useBorrows` composable already triggers a fetch on auth change via `onInvalidate('borrows', ...)`. The explicit `onMounted` call is redundant.

```vue
<!-- BEFORE: lines 47-51 -->
onMounted(() => {
  if (auth.signedIn) {
    borrowList.fetchBorrows(1);
  }
});

<!-- AFTER: -->
<!-- (remove entirely) -->
```

Also remove the `onMounted` import from the script section if it becomes unused after this change. Check if `onMounted` is used elsewhere in the file — if not, remove `import { onMounted } from 'vue'` (it's auto-imported by Nuxt anyway).

- [ ] **Step 3: cart.vue — narrow ClientOnly scope**

Wrap only the interpolated value that causes hydration mismatch instead of the entire cart body:

```vue
<!-- BEFORE: line 58 -->
      <ClientOnly>
        <div
          v-if="cart.isEmpty"
          ...
        >
          ...entire cart body...
        </div>
      </ClientOnly>

<!-- AFTER: -->
      <div
        v-if="cart.isEmpty"
        ...
      >
        ...entire cart body...
      </div>
```

The `ClientOnly` wrapper at line 50-54 around `cart.itemCount` is sufficient — the cart body itself doesn't use browser-only APIs that would cause hydration mismatches.

- [ ] **Step 4: Verify the changes run**

Run: `npm run dev`
Navigate to the book detail page, cart, and landing page. Verify no console errors and all interactive elements work.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/book/BookHero.vue \
       frontend/components/book/BookBorrowCard.vue \
       frontend/pages/cart.vue \
       frontend/pages/index.vue
git commit -m "fix: remove dead code, narrow ClientOnly scope, add video aria-hidden"
```

---

### Task 2: Extract repeated cart formatting to computed

**Files:**
- Modify: `frontend/pages/cart.vue:32-34`

- [ ] **Step 1: Add formattedDiscount computed**

Replace the single `discount` computed with an extended version that pre-formats all cent values:

```ts
// AFTER line 34, add:
const fmt = computed(() => ({
  subtotal: (discount.value.subtotal / 100).toFixed(2),
  tier: (discount.value.tierDiscount / 100).toFixed(2),
  category: (discount.value.categoryBonus / 100).toFixed(2),
  every100: (discount.value.every100Discount / 100).toFixed(2),
  plan: (discount.value.planDiscount / 100).toFixed(2),
  total: (discount.value.total / 100).toFixed(2),
}));
```

- [ ] **Step 2: Replace inline expressions in template**

Replace:

```diff
- <strong>${{ (discount.subtotal / 100).toFixed(2) }}</strong>
+ <strong>${{ fmt.subtotal }}</strong>
```

```diff
- <span>-${{ (discount.tierDiscount / 100).toFixed(2) }}</span>
+ <span>-${{ fmt.tier }}</span>
```

```diff
- <span>-${{ (discount.categoryBonus / 100).toFixed(2) }}</span>
+ <span>-${{ fmt.category }}</span>
```

```diff
- <span>-${{ (discount.every100Discount / 100).toFixed(2) }}</span>
+ <span>-${{ fmt.every100 }}</span>
```

```diff
- <span>-${{ (discount.planDiscount / 100).toFixed(2) }}</span>
+ <span>-${{ fmt.plan }}</span>
```

```diff
- <strong class="font-serif text-3xl">${{ (discount.total / 100).toFixed(2) }}</strong>
+ <strong class="font-serif text-3xl">${{ fmt.total }}</strong>
```

- [ ] **Step 3: Verify**

Run: `npm run dev` and navigate to cart with items. Verify all price values display correctly.

- [ ] **Step 4: Commit**

```bash
git add frontend/pages/cart.vue
git commit -m "refactor: extract formatted discount computed in cart"
```

---

### Task 3: Relocate pure utility functions from composables to utils/

**Files:**
- Create: `frontend/utils/comment.ts`
- Create: `frontend/utils/feed.ts`
- Create: `frontend/utils/borrow.ts`
- Modify: `frontend/composables/useBookComments.ts` (remove + re-export)
- Modify: `frontend/composables/useFeed.ts` (remove + re-export)
- Modify: `frontend/composables/useBorrows.ts` (remove + re-export)
- Modify: `frontend/tests/composables/useBookComments.test.ts` (update imports)
- Modify: `frontend/tests/composables/useFeed.test.ts` (update imports)
- Modify: `frontend/tests/composables/useBorrows.test.ts` (update imports)

- [ ] **Step 1: Create `utils/comment.ts`**

Move the three pure functions from `composables/useBookComments.ts` into a new util file:

```ts
export function getInitials(name: string): string {
  return name.toUpperCase().slice(0, 2);
}

export function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export function mapCommentToReview(
  comment: import("~/composables/useBookComments").ApiComment,
): import("~/composables/useBookComments").Review {
  return {
    id: comment.id,
    initials: getInitials(comment.user.name),
    name: comment.user.name,
    time: timeAgo(comment.createdAt),
    rating: comment.rating ?? 0,
    text: comment.text,
    likes: comment.likeCount ?? 0,
    likedByUser: comment.likedByUser,
    replies: (comment.replies ?? []).map(
      (r) => `${r.text} — ${r.user.name}`,
    ),
  };
}
```

- [ ] **Step 2: Create `utils/feed.ts`**

```ts
import type { FeedPost, FeedReply } from "~/composables/useFeed";

export function mapFeedPost(raw: Record<string, unknown>): FeedPost {
  const replies = (raw.replies as Record<string, unknown>[] | undefined) ?? [];
  return {
    id: raw.id as string,
    text: raw.text as string,
    rating: (raw.rating as number | null) ?? null,
    createdAt: raw.createdAt as string,
    user: raw.user as FeedPost["user"],
    likeCount: (raw.likeCount as number) ?? 0,
    replyCount: replies.length,
    replies: replies.map((r) => ({
      name: ((r.user as Record<string, unknown>)?.name as string) ?? "Unknown",
      text: r.text as string,
    })),
    liked: (raw.likedByUser as boolean) ?? false,
  };
}
```

- [ ] **Step 3: Create `utils/borrow.ts`**

```ts
import type { BorrowItem, BorrowsResponse } from "~/composables/useBorrows";

export function mapBorrowResponse(
  entry: BorrowsResponse["data"][number],
): BorrowItem {
  return {
    borrowId: entry.borrow.id as string,
    bookId: entry.book.id as string,
    bookSlug: (entry.book.slug as string) ?? (entry.book.id as string),
    title: entry.book.title as string,
    author: entry.book.author as string,
    cover: entry.book.cover as string,
    crop: (entry.book.crop as number | null) ?? null,
    shelf: (entry.book.shelf as string) ?? "GEN",
    category: (entry.book.category as string) ?? "",
    dueAt: entry.borrow.dueAt as string,
    currentPage: entry.borrow.currentPage as number,
    totalPages: entry.borrow.totalPages as number,
    price: String(entry.book.price ?? "0"),
    inStock: (entry.book.inStock as number) ?? 0,
    avgRating: Number(entry.book.avgRating ?? 0),
    ratingsCount: (entry.book.ratingsCount as number) ?? 0,
  };
}
```

- [ ] **Step 4: Update composables to import from utils and re-export**

In `frontend/composables/useBookComments.ts`:
- Remove the three function bodies
- Add at the top: `import { getInitials, timeAgo, mapCommentToReview } from "~/utils/comment";`
- The functions are now imported, used by the composable, and still available for external import via the barrel.

Keep the `export` on the functions in the util files. In the composable file, remove the local definitions and add the import.

For `frontend/composables/useFeed.ts`:
- Add at the top: `import { mapFeedPost } from "~/utils/feed";`
- Remove the local `function mapFeedPost(...)` definition

For `frontend/composables/useBorrows.ts`:
- Add at the top: `import { mapBorrowResponse } from "~/utils/borrow";`
- Remove the local `function mapBorrowResponse(...)` definition

- [ ] **Step 5: Update test imports**

Update the three test files to import from `~/utils/comment`, `~/utils/feed`, `~/utils/borrow` instead of the composable paths.

In `frontend/tests/composables/useBookComments.test.ts`:
```diff
- import { getInitials, timeAgo, mapCommentToReview } from "~/composables/useBookComments";
+ import { getInitials, timeAgo, mapCommentToReview } from "~/utils/comment";
```

In `frontend/tests/composables/useFeed.test.ts`:
```diff
- import { mapFeedPost, type FeedPost } from "~/composables/useFeed";
+ import { mapFeedPost } from "~/utils/feed";
+ import type { FeedPost } from "~/composables/useFeed";
```

In `frontend/tests/composables/useBorrows.test.ts`:
```diff
- import { mapBorrowResponse, type BorrowsResponse } from "~/composables/useBorrows";
+ import { mapBorrowResponse } from "~/utils/borrow";
+ import type { BorrowsResponse } from "~/composables/useBorrows";
```

- [ ] **Step 6: Run tests**

Run: `npm run test`

Expected: All 82 tests pass.

- [ ] **Step 7: Commit**

```bash
git add frontend/utils/comment.ts \
       frontend/utils/feed.ts \
       frontend/utils/borrow.ts \
       frontend/composables/useBookComments.ts \
       frontend/composables/useFeed.ts \
       frontend/composables/useBorrows.ts \
       frontend/tests/composables/useBookComments.test.ts \
       frontend/tests/composables/useFeed.test.ts \
       frontend/tests/composables/useBorrows.test.ts
git commit -m "refactor: move pure utility functions from composables to utils/"
```

---

### Task 4: Fix useBorrows SSR singleton state

**Files:**
- Modify: `frontend/composables/useBorrows.ts`

- [ ] **Step 1: Move module-level state inside the composable**

Currently, state is declared at module level (lines 32-42), outside the `useBorrows` function:

```ts
const borrows = shallowRef<BorrowItem[]>([]);
const borrowsPage = shallowRef(1);
// ...
let lastBorrowsLimit = 3;
```

Move all these declarations inside the `useBorrows()` function so each call gets its own state. The `onInvalidate` callback also needs to reference the moved state.

```diff
- const borrows = shallowRef<BorrowItem[]>([]);
- const borrowsPage = shallowRef(1);
- const borrowsMeta = shallowRef<{ ... } | null>(null);
- const borrowsLoaded = shallowRef(false);
- const borrowError = shallowRef<unknown>(null);
- let lastBorrowsLimit = 3;

  export function useBorrows() {
    const auth = useAuthStore();
    const { invalidate, onInvalidate } = useInvalidate();

+   const borrows = shallowRef<BorrowItem[]>([]);
+   const borrowsPage = shallowRef(1);
+   const borrowsMeta = shallowRef<{ ... } | null>(null);
+   const borrowsLoaded = shallowRef(false);
+   const borrowError = shallowRef<unknown>(null);
+   let lastBorrowsLimit = 3;

    // ... rest of the function body
```

- [ ] **Step 2: Verify**

Run: `npm run test`

Expected: All 82 tests pass.

- [ ] **Step 3: Build check**

Run: `npm run build`

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/composables/useBorrows.ts
git commit -m "fix: move useBorrows module-level state inside composable for SSR safety"
```

---

### Task 5: Add shadcn Dialog component

**Files:**
- Create: `frontend/components/ui/dialog/` (via CLI)
- Create: `frontend/components/ui/dialog/Dialog.vue`
- Create: `frontend/components/ui/dialog/variants.ts`
- Create: `frontend/components/ui/dialog/index.ts`

- [ ] **Step 1: Add shadcn Dialog**

Run from `frontend/`:

```bash
npx shadcn-vue add dialog
```

If the CLI is not available, install it:
```bash
npm install -D shadcn-vue
npx shadcn-vue add dialog
```

- [ ] **Step 2: Verify Dialog files exist**

Check that the dialog component files were created:

```bash
ls components/ui/dialog/
```

Expected output: `Dialog.vue`, `index.ts` (and variants, trigger, content, etc. as separate files depending on the shadcn-vue version).

- [ ] **Step 3: Commit**

```bash
git add components/ui/dialog/
git commit -m "feat: add shadcn Dialog component"
```

---

### Task 6: Replace BookCard.vue custom modal with Dialog

**Files:**
- Modify: `frontend/components/book/BookCard.vue:111-149`

- [ ] **Step 1: Replace custom confirm dialog with shadcn Dialog**

First, add the Dialog import and update the template:

```vue
<script setup lang="ts">
// ... existing imports ...
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
// ... rest of script ...
</script>
```

Replace the custom modal markup (lines 111-149) with:

```vue
  <Dialog v-model:open="showConfirmDialog">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Already in your library</DialogTitle>
        <DialogDescription>
          You already own {{ ownedCount }} cop{{
            ownedCount > 1 ? "ies" : "y"
          }}
          of <strong>{{ book.title }}</strong>. Are you sure you want to buy more?
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="archivalOutline" @click="showConfirmDialog = false">
          Cancel
        </Button>
        <Button variant="archival" @click="confirmBuy">
          Yes, Add More
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
```

- [ ] **Step 2: Verify**

Run: `npm run dev` and check the BookCard buy dialog (buy a book you've already purchased). Verify the dialog opens, Escape closes it, backdrop click closes it, and focus is trapped inside the dialog.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/book/BookCard.vue
git commit -m "refactor: replace BookCard custom modal with shadcn Dialog"
```

---

### Task 7: Add skip link to layout

**Files:**
- Modify: `frontend/layouts/default.vue`

- [ ] **Step 1: Add a skip-to-main link**

```diff
 <template>
   <div class="flex min-h-screen flex-col">
+    <a
+      href="#main-content"
+      class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-sm focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
+    >
+      Skip to main content
+    </a>
     <div class="flex-1">
       <slot />
     </div>
```

- [ ] **Step 2: Add id="main-content" to each page's main element**

Add `id="main-content"` to the `<main>` elements in pages that don't have it:

In `frontend/pages/cart.vue`:
```diff
-     <main class="mx-auto max-w-6xl px-4 py-10 md:px-6 lg:py-14">
+     <main id="main-content" class="mx-auto max-w-6xl px-4 py-10 md:px-6 lg:py-14">
```

In `frontend/pages/feed.vue`:
```diff
-     <main class="mx-auto grid max-w-7xl grid-cols-12 gap-10 px-4 py-8 md:px-6">
+     <main id="main-content" class="mx-auto grid max-w-7xl grid-cols-12 gap-10 px-4 py-8 md:px-6">
```

In `frontend/pages/dashboard.vue`:
```diff
-     <main class="mx-auto max-w-6xl px-4 py-10 md:px-6 lg:py-14">
+     <main id="main-content" class="mx-auto max-w-6xl px-4 py-10 md:px-6 lg:py-14">
```

- [ ] **Step 3: Verify**

Open the app and press Tab immediately. The skip link should be the first focusable element. Press Enter — focus should move to `#main-content`.

- [ ] **Step 4: Commit**

```bash
git add frontend/layouts/default.vue \
       frontend/pages/cart.vue \
       frontend/pages/feed.vue \
       frontend/pages/dashboard.vue
git commit -m "fix: add skip-to-main link for keyboard accessibility"
```

---

### Task 8: Add focus trap to AuthModal.vue

**Files:**
- Modify: `frontend/components/auth/AuthModal.vue`

- [ ] **Step 1: Add keyboard handling and focus trap**

When the modal opens, focus the first input. Close on Escape. Trap focus within the modal.

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, useTemplateRef } from "vue";
// ... rest of imports ...

const modalRef = useTemplateRef<HTMLDivElement>("modal");
const firstInput = useTemplateRef<HTMLInputElement>("firstInput");

onMounted(() => {
  firstInput.value?.focus();
});

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    emit("close");
    return;
  }
  if (e.key !== "Tab") return;
  const focusable = modalRef.value?.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  if (!focusable || focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}
</script>
```

Update the template to bind `ref`, `@keydown`, and use `autofocus`:

```diff
   <div
+    ref="modalRef"
     class="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
     role="dialog"
     aria-modal="true"
     aria-labelledby="auth-title"
+    @keydown="onKeydown"
     @click.self="emit('close')"
   >
     <AuthForm
+      ref="firstInput"
       v-model:email="email"
       v-model:password="password"
```

Also add `autofocus` to the email input in `AuthForm.vue` (the component containing the email input field). Find the email `<input>` in `frontend/components/auth/AuthForm.vue` and add `autofocus` attribute.

- [ ] **Step 2: Verify**

Open the auth modal. Press Tab repeatedly — focus should cycle through all interactive elements within the modal without leaving it. Press Escape — modal should close.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/auth/AuthModal.vue
git commit -m "fix: add focus trap and Escape handling to AuthModal"
```

---

### Task 9: Replace window.confirm in BookBorrowCard.vue with reusable confirmation

**Files:**
- Modify: `frontend/components/book/BookBorrowCard.vue:82-86`

- [ ] **Step 1: Create a shared ConfirmDialog component**

Create `frontend/components/ui/ConfirmDialog.vue`:

```vue
<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";

defineProps<{
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  confirm: [];
}>();
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>{{ description }}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="archivalOutline" @click="emit('update:open', false)">
          {{ cancelLabel ?? "Cancel" }}
        </Button>
        <Button variant="archival" @click="emit('confirm')">
          {{ confirmLabel ?? "Confirm" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
```

- [ ] **Step 2: Update BookBorrowCard.vue**

Add to the script section:

```vue
import ConfirmDialog from "~/components/ui/ConfirmDialog.vue";

const showBuyConfirm = shallowRef(false);
```

Replace the `window.confirm` call in `buyNow` with:

```ts
async function buyNow() {
  if (!auth.signedIn) {
    auth.openAuthModal(() => {
      void buyNow();
    });
    return;
  }
  if (ownedCount.value > 0) {
    showBuyConfirm.value = true;
    return;
  }
  await doBuy();
}

async function doBuy() {
  purchasing.value = true;
  try {
    const res = await $fetch<{ url: string }>(
      `/api/books/${props.bookId}/create-checkout-session`,
      { method: "POST" },
    );
    await navigateTo(res.url, { external: true });
  } catch (e: any) {
    if (e?.status === 401) {
      auth.openAuthModal(() => {
        void doBuy();
      });
    } else {
      props.flash(e?.data?.message || "Could not start checkout.");
    }
  } finally {
    purchasing.value = false;
  }
}
```

Add to the template (inside the `<aside>`, after the existing buttons):

```vue
    <ConfirmDialog
      v-model:open="showBuyConfirm"
      title="Already in your library"
      :description="`You already own ${ownedCount} cop${ownedCount > 1 ? 'ies' : 'y'} of ${book.title}. Are you sure you want to buy more?`"
      confirm-label="Yes, Add More"
      cancel-label="Cancel"
      @confirm="showBuyConfirm = false; doBuy()"
    />
```

- [ ] **Step 3: Verify**

On a book you already own copies of, click "Buy now". The Dialog should appear. Click "Yes, Add More" — the checkout flow should proceed. Click "Cancel" or Escape — the dialog should close.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/ui/ConfirmDialog.vue \
       frontend/components/book/BookBorrowCard.vue
git commit -m "feat: replace window.confirm with reusable ConfirmDialog"
```

---

### Task 10: Tailwind v4 size-* consistency pass

**Files:**
- Modify: `frontend/pages/index.vue` (icon sizes)
- Modify: `frontend/components/Nav.vue` (icon sizes)
- Modify: `frontend/pages/cart.vue` (icon sizes)

- [ ] **Step 1: Replace `h-* w-*` with `size-*` for equal dimensions**

In `frontend/pages/index.vue`, line 54:
```diff
-         <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-1" />
+         <ArrowRight class="size-4 transition-transform group-hover:translate-x-1" />
```

In `frontend/components/Nav.vue` — check for any `h-* w-*` used on icons and replace with `size-*`. For example in the `.relative` container at line 71 for the cart badge count — the badge container uses `size-4` already, which is correct.

- [ ] **Step 2: Verify**

Run: `npm run dev`. Verify icons display at the correct size and no visual regressions.

- [ ] **Step 3: Commit**

```bash
git add frontend/pages/index.vue \
       frontend/components/Nav.vue
git commit -m "style: use size-* shorthand for equal icon dimensions"
```

---

## Self-Review

**1. Spec coverage:**
- Dead code removal: Task 1 (BookHero, BookBorrowCard, ClientOnly)
- Computed extraction: Task 2 (cart.vue formatting)
- Utility relocation: Task 3 (3 util files, 3 composable updates, 3 test updates)
- SSR singleton fix: Task 4 (useBorrows)
- Dialog component: Task 5 (shadcn add)
- Modal retrofit (BookCard): Task 6
- Skip link: Task 7 (layout + 3 pages)
- Focus trap: Task 8 (AuthModal)
- window.confirm replacement: Task 9 (ConfirmDialog + BookBorrowCard)
- size-* consistency: Task 10 (index.vue, Nav.vue)

**2. Placeholder scan:** No TBDs, TODOs, or placeholder patterns.

**3. Type consistency:** All type imports match the actual exports. `ApiComment`, `Review`, `FeedPost`, `BorrowsResponse` remain in their original composable files and are imported from there by the new utils. Re-exports from composables keep the same public API — no consumer code breaks.
