# Frontend Improvement Plan — Execution Log

Audited against [Vue Best Practices](https://github.com/anomalyco/opencode/tree/main/skills/vue-best-practices)
guidelines on 2026-06-05. All phases executed on 2026-06-06.

## Execution status

| Phase | Status | Commit |
|---|---|---|
| 1.1 Split `book/[id].vue` | ✅ Done | `57256af` |
| 1.2 Split `feed.vue` | ✅ Done | `57256af` |
| 2.1 `useBookDetail` composable | ✅ Done (rolled into Phase 1.1) | `57256af` |
| 2.2 `useCommentForm` composable | ⏭️ Skipped — form state kept in `BookComments.vue` | — |
| 2.3 `useShelf` composable | ✅ Done (rolled into Phase 1.2) | `57256af` |
| 3.1 `shallowRef` for primitives | ✅ Done | `57256af` |
| 3.2 Async cleanup in shelf watcher | ✅ Done | `57256af` |
| 3.3 `readonly` store exposure | ⏭️ Skipped — would break template reactivity expectations | — |
| 4.1 Inline expressions to computed | ✅ Done | `57256af` |
| 4.2 Remove redundant computed | ✅ Done (`filteredBooks` removed) | `57256af` |
| 5.1 Hardcoded credentials | ✅ Done (removed) | `57256af` |
| 5.2 `@blur` + `setTimeout` dropdown | ⏭️ Skipped — established pattern, low impact | — |
| 5.3 `any` types | ✅ Done (resolved in composable extraction) | `57256af` |
| 5.4 `getInitials` utility | ✅ Done (in `BookComments.vue`) | `57256af` |
| Layout fix (cover sticky) | ✅ Done | `4b8e736` |

## 1.1 Split `pages/book/[id].vue`

**Original:** 274 lines, 6 UI sections, full orchestration in route view.

**Result:** 79 lines, thin container with child components.

| New component | File | Responsibility |
|---|---|---|
| `useBookDetail` | `composables/useBookDetail.ts` | Fetch book, comments, like/rate status; handle buy/borrow/like/rate/comment |
| BookDetails | `components/BookDetails.vue` | Author, title, price, stock badge, synopsis |
| BookActions | `components/BookActions.vue` | Buy/borrow buttons with computed disabled state |
| BookRating | `components/BookRating.vue` | 5-star rating input with `isStarActive` helper |
| BookShare | `components/BookShare.vue` | Social share popup (self-contained) |
| BookComments | `components/BookComments.vue` | Comment form + comment list with `getInitials` |

## 1.2 Split `pages/feed.vue`

**Original:** 193 lines, 4 sections.

**Result:** 45 lines, thin container.

| New component | File | Responsibility |
|---|---|---|
| `useShelf` | `composables/useShelf.ts` | Page tracking, category filter, initial fetch with cleanup |
| TrendingSection | `components/TrendingSection.vue` | "Trending Now" header + featured grid |
| BookShelf | `components/BookShelf.vue` | Category filters, book grid, pagination |

## 3. Reactivity fixes

- `shallowRef` for all primitive state across 7 components, 3 stores (auth, books, dashboard), and 2 composables
- Async cleanup guard (`cancelled` flag) in `useShelf` watcher

## 4. Template quality

- `Navbar.vue`: extracted `userInitials` computed
- `BookCard.vue`: extracted `borrowBtnClass`, `borrowLabel`, `stockClass`, `stockLabel` computeds
- `BookDetails.vue`: extracted `formattedPrice`, `formattedAvgRating`, `stockBadgeClass`, `stockLabel`
- `BookActions.vue`: extracted `borrowBtnClass`, `borrowLabel`, `buyFullWidth`
- `BookRating.vue`: extracted `isStarActive()` function
- Removed redundant `filteredBooks` computed from feed.vue

## Original plan

### Phase 1: Component Splitting

| New component | Responsibility | Props | Emits |
|---|---|---|---|
| BookDetails | Cover, title, author, price, synopsis, stock badge | `book: BookWithMeta` | — |
| BookActions | Buy/borrow buttons, stock-aware disabled | `book: BookWithMeta`, `hasBorrowed: boolean` | `buy`, `borrow` |
| BookRating | Star rating display + input | `avgRating: number`, `userRating: number` | `rate: [rating: number]` |
| BookShare | Share popup with social buttons | — | — |
| BookComments | Comment form + comment list | `comments: Comment[]`, `signedIn: boolean`, `showCommentForm: boolean` | `submit: [text: string]` |
| TrendsingSection | Trending hero grid | `trending: BookWithMeta[]` | — |
| BookShelf | Category filters, book grid, pagination | `books`, `categories`, `activeCategory`, `page`, `totalPages`, `adminMode` | `edit`, `addBook`, `categoryChange`, `pageChange` |

### Phase 2: Composables

| Composable | Responsibility |
|---|---|
| `useBookDetail` | Fetch book, like/rate/comment/buy/borrow orchestration |
| `useShelf` | Page tracking, category filtering, initial data fetch |

### Phase 3: Reactivity

- `shallowRef` for all primitives
- Async cleanup in shelf watcher

### Phase 4: Template Quality

- Move inline expressions to computed
- Remove redundant `filteredBooks` computed

### Phase 5: Minor Cleanup

- Remove hardcoded credentials from AuthModal
- Type `any` refs (resolved via composable extraction)
- `getInitials` utility in BookComments
