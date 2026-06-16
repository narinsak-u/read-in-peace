# Home Dashboard Content — Read in Peace (Sub-project 2)

## Overview

Fill the Home Dashboard page (`/home`) with Active Loans, New Arrivals grid, and Yearly Progress sidebar widget. Add backend due dates, reading progress, and reading goals. Wire sidebar widgets to real data. The Reader Feed widget and Book Club CTA remain placeholders (social content awaits Sub-project 3).

## Backend Schema Changes

### Borrows table additions

Add to `backend/src/db/schema.ts` `borrows` table:

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `dueAt` | `timestamp('due_at').notNull()` | borrow date + 21 days | Loan deadline |
| `currentPage` | `integer('current_page')` | `0` | Reading progress |
| `totalPages` | `integer('total_pages')` | `300` | Total book length |

Database migration required.

### Reading goals table (new)

```ts
export const readingGoals = pgTable('reading_goals', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  year: integer('year').notNull(),
  goal: integer('goal').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

Unique constraint on (userId, year) — one goal per year.

### Seed data

Add 12 seed books with `totalPages` values (200-500 range). Update seed borrows to include `dueAt = borrowedAt + 21 days`, `currentPage` = random progress, `totalPages` from the book.

## New API Endpoints

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| `GET` | `/api/user/reading-goal` | Yes | Get current year's reading goal + completed count |
| `PUT` | `/api/user/reading-goal` | Yes | Set/update yearly goal `{ goal: number }` |
| `GET` | `/api/books/new-arrivals` | No | Recently added books (limit 4, ordered by createdAt desc) |

### GET `/api/user/reading-goal` response

```json
{
  "year": 2026,
  "goal": 50,
  "current": 24,
  "updatedAt": "2026-06-15T10:00:00Z"
}
```

`current` = count of borrows returned this year + purchases this year.

### Update existing `/api/user/borrows`

Response now includes `dueAt`, `currentPage`, `totalPages` on each borrow record.

### GET `/api/books/new-arrivals` response

```json
{
  "books": [
    { "id": "1", "title": "...", "author": "...", "cover": "...", "crop": 2, "rating": 4.7, "price": 18.50, "totalPages": 340, "isAvailable": true, "inStock": 5 }
  ]
}
```

## Frontend: Home Dashboard Page (`pages/home.vue`)

### Active Loans Section

Renders at top of page. Shows all active borrows for the current user.

**Data:** `useDashboardStore().borrowed` (BorrowRecord[] with dueAt, currentPage, totalPages added)

**Layout per loan:**
- Left: Book cover (180×270px, shadow-xl, hover effect)
- Right (flex-col):
  - Top row: due date badge (`font-mono text-[10px]`), shelf label (`font-mono text-[10px] uppercase`)
  - Title (h2, font-serif, linked to `/book/$bookId`)
  - Author (italic, text-muted-foreground)
  - Star rating (filled/empty stars with "X.X AVG RATING")
  - Progress bar (h-1.5, rounded-full, bg-foreground/5) with width = currentPage/totalPages%
  - "PAGE X OF Y (Z%)" label below bar
  - Action buttons: Return Book (archival), Write Review (archivalOutline), Buy $price (archivalGhost)

**Due date logic:**
- Calculate days until `dueAt`, show "DUE IN X DAYS" with primary badge
- If past-due: "OVERDUE (XD)" with destructive badge
- If returned: removed from list

**Empty state:** "You don't have any active loans yet. Find something in the Explore tab."

### New Arrivals Section

**Data:** `GET /api/books/new-arrivals` — 4 most recent books

**Layout:**
- Header: "New Arrivals" (h1, font-serif) with "Curated this week" (font-mono subtitle)
- 4-column grid (grid-cols-2 md:grid-cols-4)
- Each card:
  - Cover crop image (cover-crop cover-N)
  - Title (font-serif, text-sm)
  - Author (text-xs text-muted-foreground)
  - Star rating (text-primary, fill)
  - Price
  - "Borrow" button (archivalOutline variant)

**Search filter:**
- AppNavbar's search input is bound to the page via a shared ref or composable
- Filters arrivals by title/author match (client-side)
- Empty search match: italic "No volumes match..." message

**Borrow action:** Calls `dashboard.borrowBook(id)`, shows toast on success.

### Sidebar Slots

Page provides slot content to AppSidebar:

```vue
<template #yearly-progress>
  <YearlyProgressCard />
</template>
```

Reader Feed and Book Club slots left as defaults (placeholders from AppSidebar).

### Search Filter

Create `composables/useSearch.ts` — a shared `ref<string>('')` to connect AppNavbar's search input to the New Arrivals grid:

```ts
export const useSearch = () => {
  return { query: ref<string>('') };
};
```

AppNavbar binds `v-model="search.query"` on its search input. `pages/home.vue` uses `search.query` to filter `newArrivals` client-side.

### Flash Notices

Add a flash notice system (like new_design's `notice` state):
- After borrow: "[title] borrowed. Due in 21 days."
- After return: "Book returned. Thank you!"
- After review: "Your review was published."
- Fixed position, top-right, z-50, auto-dismiss 2.4s

## New Components

### `YearlyProgressCard.vue`

Renders in `#yearly-progress` slot. Uses `useReadingGoalStore`.

**States:**
1. **Goal not set (goal === 0):** "Set a reading goal to get started." with "Set Goal" button → opens inline input
2. **Goal set, in progress:** `24 of 50 books`, progress bar (bg-foreground), percentage, motivational text with behind/ahead calculation
3. **Goal met (current >= goal):** "You've reached your 2026 goal! 🎉"

## New Store

### `useReadingGoalStore` (`stores/readingGoal.ts`)

```ts
defineStore('readingGoal', () => {
  const goal = shallowRef<number>(0);
  const current = shallowRef<number>(0);
  const year = shallowRef<number>(new Date().getFullYear());
  const progress = computed(() => goal.value > 0 ? (current.value / goal.value) * 100 : 0);

  async function fetchGoal(): Promise<void>;
  async function setGoal(g: number): Promise<void>;
  function incrementCurrent(): void; // called after return/purchase via dashboard store watcher
  function behindMessage(): string; // "You are 2 books behind your 2026 reading goal."

  return { goal, current, year, progress, fetchGoal, setGoal, incrementCurrent, behindMessage };
});
```

## Files Summary

### Create (backend)
| File | Purpose |
|------|---------|
| `backend/src/db/migrations/000X_add_borrow_due_dates.sql` | Add dueAt, currentPage, totalPages to borrows |
| `backend/src/db/migrations/000X_add_reading_goals.sql` | Create reading_goals table |
| `backend/src/reading-goals/reading-goals.module.ts` | Module |
| `backend/src/reading-goals/reading-goals.controller.ts` | Controller (GET/PUT) |
| `backend/src/reading-goals/reading-goals.service.ts` | Service |

### Modify (backend)
| File | Change |
|------|--------|
| `backend/src/db/schema.ts` | Add dueAt, currentPage, totalPages to borrows; add readingGoals table |
| `backend/src/db/seed.ts` | Update seed borrows with dueAt + progress; add seed books with totalPages |
| `backend/src/transactions/transactions.service.ts` | Update createBorrow to set dueAt = borrowedAt + 21d; include new fields in getUserBorrows |
| `backend/src/app.module.ts` | Import ReadingGoalsModule |
| `backend/src/books/books.controller.ts` | Add GET /api/books/new-arrivals |
| `backend/src/books/books.service.ts` | Add findNewArrivals method |
| Book interface types | Add totalPages to book DTOs |

### Create (frontend)
| File | Purpose |
|------|---------|
| `frontend/components/YearlyProgressCard.vue` | Yearly progress widget component |
| `frontend/stores/readingGoal.ts` | Reading goal Pinia store |
| `frontend/composables/useSearch.ts` | Shared search query ref |

### Modify (frontend)
| File | Change |
|------|--------|
| `frontend/pages/home.vue` | Replace placeholder with Active Loans + New Arrivals sections + sidebar slots |
| `frontend/stores/dashboard.ts` | Update BorrowRecord interface with dueAt, currentPage, totalPages |
| `frontend/stores/books.ts` | Add newArrivals state + fetchNewArrivals action; add totalPages to Book |
| `frontend/components/AppNavbar.vue` | Wire search input to query ref for New Arrivals filtering |
| `frontend/components/AppSidebar.vue` | No changes (uses slot defaults) |

## Not In This Sub-Project
- Reader Feed real content (Sub-project 3)
- Book Club CTA wiring (Sub-project 3 or 4)
- Review modal (Sub-project 4, or reuse existing book detail review flow)
- Cover crop image asset (reuse existing placeholder covers)
