# Frontend Improvement Plan

Audited against [Vue Best Practices](https://github.com/anomalyco/opencode/tree/main/skills/vue-best-practices)
guidelines on 2026-06-05.

## Phase 1: Component Splitting

### 1.1 Split `pages/book/[id].vue` (274 lines)

**Problem:** Route view owns 6 distinct UI sections + full orchestration. Violates
the "route views are composition surfaces" principle.

**Plan:**

| New component | Responsibility | Props | Emits |
|---|---|---|---|
| `components/BookDetails.vue` | Cover, title, author, price, synopsis, stock badge | `book: BookWithMeta` | — |
| `components/BookActions.vue` | Buy button, borrow button, stock-aware disabled state | `book: BookWithMeta`, `hasBorrowed: boolean` | `buy`, `borrow` |
| `components/BookRating.vue` | Star rating display + input (5 stars) | `bookId: string`, `avgRating: number`, `userRating: number` | `rate: [rating: number]` |
| `components/BookShare.vue` | Share popup with social network buttons | — | — |
| `components/BookComments.vue` | Comment form + comment list | `bookId: string`, `comments: Comment[]` | `submit: [text: string]` |
| `composables/useBookDetail.ts` | Fetch book, like/rate status, comment CRUD orchestration | — (returns state + actions) | — |

**Result:** `book/[id].vue` becomes a thin container:
```vue
<script setup lang="ts">
const { book, comments, hasBorrowed, handleLike, handleRate, submitReview } = useBookDetail(id)
</script>
<template>
  <Navbar />
  <main>
    <BookDetails :book="book" />
    <BookActions :book="book" :hasBorrowed @buy @borrow />
    <div class="flex gap-2">
      <button @click="handleLike">Like</button>
      <BookRating :bookId @rate="handleRate" />
      <BookShare />
    </div>
    <BookComments :bookId :comments @submit="submitReview" />
  </main>
</template>
```

### 1.2 Split `pages/feed.vue` (193 lines)

**Problem:** Route view owns trending section, shelf, category filters, and
pagination. 4 distinct sections.

**Plan:**

| New component | Responsibility |
|---|---|
| `components/TrendingSection.vue` | "Trending Now" header + grid of trending book cards |
| `components/BookShelf.vue` | "Full shelf" header, category filter buttons, book grid, pagination |
| `composables/useShelf.ts` | Page tracking, active category, book fetching with async cleanup |

**Result:** `feed.vue` becomes:
```vue
<script setup lang="ts">
const { page, activeCategory, totalPages, handlePageChange } = useShelf()
</script>
<template>
  <Navbar />
  <main>
    <TrendingSection :books="booksStore.trending" />
    <BookShelf
      :books="booksStore.books"
      :categories :activeCategory
      :page :totalPages
      @category-change @page-change
    />
  </main>
</template>
```

## Phase 2: Composables

### 2.1 Create `composables/useBookDetail.ts`

Extract from `book/[id].vue`:
- `book`, `comments`, `hasBorrowed` state
- `submitReview()`, `handleLike()`, `handleRate()`, `handleBuy()`, `handleBorrow()`
- `onMounted` orchestration (fetch book + comments + like/rate status + borrows)

### 2.2 Create `composables/useCommentForm.ts`

Extract from `book/[id].vue`:
- `draft`, `showCommentForm` state
- `submitReview()` with guard clause
- Returns `{ draft, showCommentForm, submitReview }`

### 2.3 Create `composables/useShelf.ts`

Extract from `feed.vue`:
- `page`, `activeCategory` state
- Watcher with `onCleanup` / AbortController for race-condition safety
- Category derivation from fetched books

## Phase 3: Reactivity Fixes

### 3.1 Use `shallowRef` for all primitives

Replace `ref()` → `shallowRef()` for these (non-exhaustive):

| File | Current | Fix |
|---|---|---|
| `stores/auth.ts:12-15` | `ref(false)`, `ref(null)`, `ref(false)`, `ref(false)` | `shallowRef(...)` |
| `stores/books.ts:45` | `ref(false)` | `shallowRef(false)` |
| `book/[id].vue:14-19` | `ref(null)`, `ref([])`, `ref('')`, `ref(false)`, `ref(false)`, `ref(false)` | `shallowRef(...)` |
| `feed.vue:8-12` | `ref(1)`, `ref('All')`, `ref([])`, `ref(false)`, `ref(null)` | `shallowRef(...)` |
| `dashboard.vue:10` | `ref<'borrowed' \| 'purchased'>('borrowed')` | `shallowRef(...)` |
| `AuthModal.vue:12-16` | `ref(...)` | `shallowRef(...)` |
| `Navbar.vue:12` | `ref(false)` | `shallowRef(false)` |
| `BookFormModal.vue:27-28` | `ref(false)`, `ref('')` | `shallowRef(...)` |

### 3.2 Add async cleanup to shelf watcher

`feed.vue:18-20` — the watcher on `[page, activeCategory]` should use
`onCleanup` to abort in-flight requests on rapid page changes.

```ts
watch([page, activeCategory], async ([p, cat], _prev, onCleanup) => {
  const controller = new AbortController()
  onCleanup(() => controller.abort())
  await booksStore.fetchBooks(p, 12, cat === 'All' ? undefined : cat)
})
```

Requires `$fetch` to accept a signal or pass it through the proxy. If the
backend doesn't support cancellation, wrap with a local flag instead.

### 3.3 Return `readonly` state from stores

Pinia store consumers should not be able to mutate state directly. Wrap exposed
refs with `readonly()`:

```ts
// stores/dashboard.ts
return {
  borrowed: readonly(borrowed),
  purchased: readonly(purchased),
  fetchBorrows, fetchPurchases, borrowBook, returnBook, buyBook, confirmPurchase,
}
```

Same pattern for `stores/books.ts` and `stores/auth.ts`.

## Phase 4: Template Quality

### 4.1 Move inline expressions to computed

| Location | Expression | Fix |
|---|---|---|
| `Navbar.vue:57-61` | `auth.user.name.split(' ').map(...).join('')` | Extract to `userInitials` computed |
| `book/[id].vue:150-155` | Complex ternary for borrow button class | `borrowBtnClass` computed |
| `BookCard.vue:107-109` | Borrow button class ternary | `borrowBtnClass` computed |
| `book/[id].vue:124, 216` | `Number(book.avgRating).toFixed(1)` repeated | `formattedAvgRating` computed |
| `book/[id].vue:211-213` | `(booksStore.userRating[id] ?? 0) >= star` repeated | `isStarActive(star)` function |

### 4.2 Remove unnecessary computed

`feed.vue:14` — `filteredBooks` is `computed(() => booksStore.books)` which is
redundant. Use `booksStore.books` directly in template.

## Phase 5: Minor Cleanup

| Issue | Fix |
|---|---|
| `AuthModal.vue:37-38` hardcoded credentials | Move to env var or remove for production |
| `Navbar.vue:51` `@blur` + `setTimeout` for dropdown | Create `useClickOutside` composable |
| `book/[id].vue:14-15` `ref<any>` | Type with `BookWithMeta` and `Comment` |
| `feed.vue:12, 31` `ref<any>`, `book: any` | Type with proper interfaces |
| `book/[id].vue:247` `c.user.name.charAt(0)` | Extract to component or `getInitials` utility |

## Execution Order

```
Phase 1 (splitting) ----► Phase 2 (composables) ----► Phase 3 (reactivity) ----► Phase 4 (templates) ----► Phase 5 (cleanup)
       │                          │
       ▼                          ▼
  BookDetails.vue           useBookDetail.ts
  BookActions.vue           useCommentForm.ts
  BookRating.vue            useShelf.ts
  BookShare.vue
  BookComments.vue
  TrendingSection.vue
  BookShelf.vue
```

Phases are sequential — each depends on the previous. Splitting first makes
the composable extraction targets obvious; reactivity and template fixes go
last to avoid rework.
