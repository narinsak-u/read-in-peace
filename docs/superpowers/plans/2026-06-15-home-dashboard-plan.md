# Home Dashboard Content — Implementation Plan (Sub-project 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill the Home Dashboard with Active Loans, New Arrivals grid, Yearly Progress widget, and add backend support for due dates, reading progress, and reading goals.

**Architecture:** Backend adds `dueAt`/`currentPage`/`totalPages` to borrows, a new `readingGoals` table, and new API endpoints (`/api/user/reading-goal`, `/api/books/new-arrivals`). Frontend creates a YearlyProgressCard component, readingGoal store, search composable, and rebuilds the home page with real data.

**Tech Stack:** NestJS, Drizzle ORM, PostgreSQL, Nuxt 3, Vue 3 Composition API, Pinia

---

### Task 1: Update Borrows Schema + Add Reading Goals Table

**Files:**
- Modify: `backend/src/db/schema.ts`
- Modify: `backend/src/db/seed.ts`

- [ ] **Step 1: Add fields to borrows table and create readingGoals table**

Read `backend/src/db/schema.ts`. (1) Add `totalPages` column to the `books` table (after `isAvailable`): `totalPages: integer('total_pages').notNull().default(300)`. (2) Add `dueAt`, `currentPage`, `totalPages` to the `borrows` table. (3) Add a new `readingGoals` table:

```ts
export const borrows = pgTable('borrows', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  bookId: text('book_id')
    .notNull()
    .references(() => books.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  borrowedAt: timestamp('borrowed_at').notNull().defaultNow(),
  returnedAt: timestamp('returned_at'),
  dueAt: timestamp('due_at').notNull(),
  currentPage: integer('current_page').notNull().default(0),
  totalPages: integer('total_pages').notNull().default(300),
});

export const readingGoals = pgTable('reading_goals', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  year: integer('year').notNull(),
  goal: integer('goal').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
```

- [ ] **Step 2: Add totalPages to seed books**

Add `totalPages: [340, 280, 420, 310, 256, 380, 440, 290, 360, 200, 320, 400, 270, 350, 190][i]` to each seed book in the `booksData` map (line 172-184). The `totalPages` array provides realistic values.

```ts
const totalPagesValues = [340, 280, 420, 310, 256, 380, 440, 290, 360, 200, 320, 400, 270, 350, 190];

const booksData = titles.map(([title, author], i) => ({
  id: bookIds[i],
  title,
  author,
  price: String(Math.round((9 + i * 1.7) * 100) / 100),
  cover: covers[i],
  synopsis: synopses[i],
  category: categories[i],
  trending: i < 3,
  inStock: stockValues[i],
  isAvailable: true,
  createdBy: '00000000-0000-0000-0000-000000000001',
  totalPages: totalPagesValues[i],
}));
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/db/schema.ts backend/src/db/seed.ts
git commit -m "feat: add dueAt, currentPage, totalPages to borrows; add readingGoals table; add totalPages to seed books"
```



---

### Task 3: Update Borrow Service (set dueAt + include new fields)

**Files:**
- Modify: `backend/src/transactions/transactions.service.ts`
- Modify: `backend/src/books/books.service.ts`

- [ ] **Step 1: Set dueAt on borrow creation**

In `borrow()` method (line 149-152), update the insert to include `dueAt` and `totalPages`. First query the book for `totalPages`:

```ts
// After the existing book existence/availability checks, fetch totalPages
const [bookWithPages] = await tx
  .select({ totalPages: schema.books.totalPages })
  .from(schema.books)
  .where(eq(schema.books.id, bookId));

const [borrow] = await tx
  .insert(schema.borrows)
  .values({
    bookId,
    userId,
    dueAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
    totalPages: bookWithPages.totalPages,
  })
  .returning();
```

- [ ] **Step 2: Include new fields in getUserBorrows**

In `getUserBorrows()` (line 347-378), add `dueAt`, `currentPage`, `totalPages` to the borrow select:

```ts
borrow: {
  id: schema.borrows.id,
  bookId: schema.borrows.bookId,
  userId: schema.borrows.userId,
  borrowedAt: schema.borrows.borrowedAt,
  returnedAt: schema.borrows.returnedAt,
  dueAt: schema.borrows.dueAt,
  currentPage: schema.borrows.currentPage,
  totalPages: schema.borrows.totalPages,
},
```

- [ ] **Step 3: Add new-arrivals method to BooksService**

In `backend/src/books/books.service.ts`, add a `findNewArrivals` method:

```ts
async findNewArrivals() {
  return this.db
    .select(this.bookWithMeta)
    .from(schema.books)
    .limit(4)
    .orderBy(desc(schema.books.createdAt));
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/transactions/transactions.service.ts backend/src/books/books.service.ts
git commit -m "feat: set dueAt on borrow, include new borrow fields in response, add findNewArrivals"
```

---

### Task 4: Create Reading Goals Backend Module

**Files:**
- Create: `backend/src/reading-goals/reading-goals.module.ts`
- Create: `backend/src/reading-goals/reading-goals.controller.ts`
- Create: `backend/src/reading-goals/reading-goals.service.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Create reading-goals.service.ts**

```ts
import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';

@Injectable()
export class ReadingGoalsService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async getGoal(userId: string) {
    const year = new Date().getFullYear();

    const [goal] = await this.db
      .select()
      .from(schema.readingGoals)
      .where(and(eq(schema.readingGoals.userId, userId), eq(schema.readingGoals.year, year)));

    const [completed] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.borrows)
      .where(
        and(
          eq(schema.borrows.userId, userId),
          sql`${schema.borrows.returnedAt} IS NOT NULL`,
          sql`EXTRACT(YEAR FROM ${schema.borrows.returnedAt}) = ${year}`,
        ),
      );

    const [purchased] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.purchases)
      .where(
        and(
          eq(schema.purchases.userId, userId),
          sql`EXTRACT(YEAR FROM ${schema.purchases.purchasedAt}) = ${year}`,
        ),
      );

    const current = (completed?.count ?? 0) + (purchased?.count ?? 0);

    return {
      year,
      goal: goal?.goal ?? 0,
      current,
      updatedAt: goal?.updatedAt ?? null,
    };
  }

  async setGoal(userId: string, goal: number) {
    const year = new Date().getFullYear();

    const [existing] = await this.db
      .select()
      .from(schema.readingGoals)
      .where(and(eq(schema.readingGoals.userId, userId), eq(schema.readingGoals.year, year)));

    if (existing) {
      const [updated] = await this.db
        .update(schema.readingGoals)
        .set({ goal, updatedAt: new Date() })
        .where(eq(schema.readingGoals.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await this.db
      .insert(schema.readingGoals)
      .values({ userId, year, goal })
      .returning();
    return created;
  }
}
```

- [ ] **Step 2: Create reading-goals.controller.ts**

```ts
import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ReadingGoalsService } from './reading-goals.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('api/user/reading-goal')
@UseGuards(AuthGuard)
export class ReadingGoalsController {
  constructor(private readonly readingGoalsService: ReadingGoalsService) {}

  @Get()
  getGoal(@CurrentUser() user: { id: string }) {
    return this.readingGoalsService.getGoal(user.id);
  }

  @Put()
  setGoal(@Body('goal') goal: number, @CurrentUser() user: { id: string }) {
    return this.readingGoalsService.setGoal(user.id, goal);
  }
}
```

- [ ] **Step 3: Create reading-goals.module.ts**

```ts
import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { ReadingGoalsController } from './reading-goals.controller';
import { ReadingGoalsService } from './reading-goals.service';

@Module({
  imports: [DbModule],
  controllers: [ReadingGoalsController],
  providers: [ReadingGoalsService],
})
export class ReadingGoalsModule {}
```

- [ ] **Step 4: Register module in app.module.ts**

Add import to the root module:

```ts
import { ReadingGoalsModule } from './reading-goals/reading-goals.module';

@Module({
  imports: [AuthModule, DbModule, BooksModule, TransactionsModule, ReadingGoalsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/reading-goals/ backend/src/app.module.ts
git commit -m "feat: create ReadingGoals module with GET/PUT endpoints"
```

---

### Task 5: Add Books Controller Route + Run Migration

**Files:**
- Modify: `backend/src/books/books.controller.ts`
- Run: database migration

- [ ] **Step 1: Add new-arrivals route to BooksController**

Add a new `@Get('new-arrivals')` route before the `:id` route:

```ts
@Get('new-arrivals')
getNewArrivals() {
  return this.booksService.findNewArrivals();
}
```

- [ ] **Step 2: Run database migration**

Use drizzle-kit to generate and push migration:

```bash
cd backend && npx drizzle-kit generate && npx drizzle-kit push
```

Expected: Database schema updated with new columns and reading_goals table.

- [ ] **Step 3: Verify backend builds**

```bash
cd backend && npm run build
```

Expected: Build succeeds, no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/books/books.controller.ts
# also add any generated migration files
git add backend/drizzle/
git commit -m "feat: add new-arrivals endpoint, run DB migration for new columns"
```

---

### Task 6: Frontend — Update Dashboard Store Interface

**Files:**
- Modify: `frontend/stores/dashboard.ts`

- [ ] **Step 1: Add new fields to BorrowRecord**

Read the current file. Add `dueAt`, `currentPage`, `totalPages` to the `BorrowRecord` borrow interface:

```ts
interface BorrowRecord {
  borrow: {
    id: string;
    bookId: string;
    userId: string;
    borrowedAt: string;
    returnedAt: string | null;
    dueAt: string;
    currentPage: number;
    totalPages: number;
  };
  book: Book;
}
```

Also add `totalPages` to the `Book` type import if needed (it inherits from `~/data/books`). The `Book` interface in `data/books.ts` already has `crop: number` from a previous task — add `totalPages?: number` to it as well.

- [ ] **Step 2: Update data/books.ts Book interface**

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
  totalPages?: number;
  trending?: boolean;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/stores/dashboard.ts frontend/data/books.ts
git commit -m "feat: add dueAt, currentPage, totalPages to frontend borrow interface"
```

---

### Task 7: Create Frontend Composable + Store

**Files:**
- Create: `frontend/composables/useSearch.ts`
- Create: `frontend/stores/readingGoal.ts`

- [ ] **Step 1: Create useSearch composable**

```ts
export function useSearch() {
  const query = ref<string>('');
  return { query };
}
```

- [ ] **Step 2: Create readingGoal store**

```ts
import { defineStore } from 'pinia';
import { shallowRef, computed } from 'vue';

export const useReadingGoalStore = defineStore('readingGoal', () => {
  const goal = shallowRef<number>(0);
  const current = shallowRef<number>(0);
  const year = shallowRef<number>(new Date().getFullYear());

  const progress = computed(() =>
    goal.value > 0 ? Math.round((current.value / goal.value) * 100) : 0,
  );

  async function fetchGoal(): Promise<void> {
    try {
      const res = await $fetch<{ year: number; goal: number; current: number }>(
        '/api/user/reading-goal',
      );
      goal.value = res.goal;
      current.value = res.current;
      year.value = res.year;
    } catch {
      // not signed in — leave at defaults
    }
  }

  async function setGoal(g: number): Promise<void> {
    await $fetch('/api/user/reading-goal', {
      method: 'PUT',
      body: { goal: g },
    });
    goal.value = g;
    // refetch to update current count
    await fetchGoal();
  }

  function daysIntoYear(): number {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  const behindMessage = computed(() => {
    if (goal.value === 0) return '';
    const dayOfYear = daysIntoYear();
    const expectedProgress = Math.round((dayOfYear / 365) * goal.value);
    const diff = expectedProgress - current.value;
    if (diff > 2) return `You are ${diff} books behind your ${year.value} reading goal. A short essay collection might be perfect this weekend.`;
    if (diff > 0) return `You're slightly behind pace for your ${year.value} goal.`;
    return `You're on track for your ${year.value} reading goal!`;
  });

  return { goal, current, year, progress, fetchGoal, setGoal, behindMessage };
});
```

- [ ] **Step 3: Commit**

```bash
git add frontend/composables/useSearch.ts frontend/stores/readingGoal.ts
git commit -m "feat: create useSearch composable and readingGoal store"
```

---

### Task 8: Create YearlyProgressCard Component

**Files:**
- Create: `frontend/components/YearlyProgressCard.vue`

- [ ] **Step 1: Create YearlyProgressCard.vue**

```vue
<script setup lang="ts">
import { useReadingGoalStore } from '~/stores/readingGoal';

const store = useReadingGoalStore();
const showInput = shallowRef(false);
const newGoal = shallowRef<number | null>(null);

onMounted(() => {
  store.fetchGoal();
});

async function handleSetGoal() {
  if (newGoal.value && newGoal.value > 0) {
    await store.setGoal(newGoal.value);
    showInput.value = false;
    newGoal.value = null;
  }
}
</script>

<template>
  <div class="space-y-4">
    <div v-if="store.goal === 0 && !showInput" class="space-y-3">
      <p class="text-sm italic text-muted-foreground">Set a reading goal to get started.</p>
      <Button variant="archivalOutline" size="sm" @click="showInput = true">
        Set Goal
      </Button>
    </div>

    <div v-else-if="showInput" class="flex gap-2 items-end">
      <div>
        <label class="block text-xs text-muted-foreground mb-1">Books per year</label>
        <input
          v-model.number="newGoal"
          type="number"
          min="1"
          placeholder="50"
          class="w-24 rounded-sm border border-border bg-input px-3 py-1.5 text-sm focus:ring-1 focus:ring-ring"
          @keyup.enter="handleSetGoal"
        />
      </div>
      <Button variant="archival" size="sm" @click="handleSetGoal">Save</Button>
      <Button variant="archivalGhost" size="sm" @click="showInput = false">Cancel</Button>
    </div>

    <template v-else>
      <div class="flex items-baseline gap-2">
        <span class="font-serif text-4xl font-bold">{{ store.current }}</span>
        <span class="text-sm italic text-muted-foreground">of {{ store.goal }} books</span>
      </div>
      <div class="h-1 w-full bg-foreground/5">
        <div class="h-full bg-foreground" :style="{ width: store.progress + '%' }" />
      </div>
      <p class="text-[11px] leading-relaxed text-muted-foreground">
        <template v-if="store.current >= store.goal">
          You've reached your {{ store.year }} goal!
        </template>
        <template v-else>
          {{ store.behindMessage }}
        </template>
      </p>
    </template>
  </div>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/YearlyProgressCard.vue
git commit -m "feat: create YearlyProgressCard with goal set/get states"
```

---

### Task 9: Wire AppNavbar Search Input

**Files:**
- Modify: `frontend/components/AppNavbar.vue`

- [ ] **Step 1: Bind search input to useSearch composable**

In AppNavbar script, import useSearch and bind the input:

```ts
import { useSearch } from '~/composables/useSearch';

const search = useSearch();
```

Update the search input in the template to use `v-model`:

```vue
<input
  v-model="search.query"
  placeholder="Search titles, authors..."
  class="w-56 rounded-sm border-0 bg-input py-2 pl-9 pr-3 text-sm placeholder-muted-foreground focus:ring-1 focus:ring-ring lg:w-64"
/>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/AppNavbar.vue
git commit -m "feat: wire AppNavbar search input to shared useSearch composable"
```

---

### Task 10: Rebuild Home Dashboard Page

**Files:**
- Modify: `frontend/pages/home.vue`
- Modify: `frontend/stores/books.ts` (add newArrivals)

- [ ] **Step 1: Add fetchNewArrivals to books store**

In `frontend/stores/books.ts`, add:

```ts
const newArrivals = shallowRef<BookWithMeta[]>([]);

async function fetchNewArrivals() {
  const res = await $fetch<BookWithMeta[]>('/api/books/new-arrivals');
  newArrivals.value = res;
}

// Add to return statement:
newArrivals: readonly(newArrivals),
fetchNewArrivals,
```

- [ ] **Step 2: Replace pages/home.vue**

Read the current file, then replace with:

```vue
<script setup lang="ts">
import { Star } from 'lucide-vue-next';
import { useDashboardStore } from '~/stores/dashboard';
import { useBooksStore } from '~/stores/books';
import { useCartStore } from '~/stores/cart';
import { useSearch } from '~/composables/useSearch';
import type { BookWithMeta } from '~/stores/books';

const dashboard = useDashboardStore();
const booksStore = useBooksStore();
const cartStore = useCartStore();
const search = useSearch();
const notice = shallowRef('');

definePageMeta({
  layout: 'app',
  title: 'Home — Read in Peace',
  description: 'Your personal library dashboard.',
});

const activeLoans = computed(() => dashboard.borrowed);
const arrivals = computed(() =>
  booksStore.newArrivals.filter((b: BookWithMeta) =>
    `${b.title} ${b.author}`.toLowerCase().includes(search.query.value.toLowerCase()),
  ),
);

const flash = (message: string) => {
  notice.value = message;
  setTimeout(() => (notice.value = ''), 2400);
};

async function handleReturn(bookId: string, title: string) {
  await dashboard.returnBook(bookId);
  flash(`${title} returned. Thank you!`);
}

async function handleBorrow(bookId: string, title: string) {
  try {
    await dashboard.borrowBook(bookId);
    flash(`${title} borrowed. Due in 21 days.`);
    booksStore.fetchNewArrivals(); // refresh stock
  } catch {}
}

function handleBuy(book: BookWithMeta) {
  cartStore.addItem({
    bookId: book.id,
    title: book.title,
    author: book.author,
    cover: book.cover,
    price: Number(book.price),
    category: book.category,
    crop: book.crop,
  });
  flash(`${book.title} added to your cart.`);
}

function dueDateLabel(dueAt: string): { label: string; overdue: boolean } {
  const now = new Date();
  const due = new Date(dueAt);
  const diffMs = due.getTime() - now.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: `OVERDUE (${Math.abs(days)}D)`, overdue: true };
  if (days === 0) return { label: 'DUE TODAY', overdue: false };
  return { label: `DUE IN ${days} DAYS`, overdue: false };
}

onMounted(async () => {
  await Promise.all([dashboard.fetchBorrows(), booksStore.fetchNewArrivals()]);
});
</script>

<template>
  <!-- Active Loans -->
  <section class="animate-enter">
    <div class="mb-6 flex items-baseline justify-between border-b border-border pb-2">
      <h1 class="font-serif text-2xl">Active Loans</h1>
      <span class="font-mono text-[10px] uppercase text-muted-foreground">
        {{ activeLoans.length }} {{ activeLoans.length === 1 ? 'item' : 'items' }} currently on desk
      </span>
    </div>

    <template v-if="activeLoans.length === 0">
      <p class="text-muted-foreground italic">
        You don't have any active loans yet. Find something in the Explore tab.
      </p>
    </template>

    <template v-for="item in activeLoans" :key="item.borrow.id">
      <article class="group flex flex-col gap-8 rounded-sm border border-border bg-card p-5 md:flex-row md:p-6 mb-6">
        <NuxtLink
          :to="`/book/${item.borrow.bookId}`"
          class="shrink-0 self-center shadow-xl transition-transform duration-500 group-hover:-translate-y-1 md:self-auto"
        >
          <img
            :src="item.book.cover"
            :alt="item.book.title"
            class="h-[270px] w-[180px] object-cover"
          />
        </NuxtLink>
        <div class="flex flex-1 flex-col justify-between py-2">
          <div>
            <div class="mb-2 flex flex-wrap items-center gap-2">
              <span
                class="rounded-sm px-2 py-0.5 font-mono text-[10px]"
                :class="dueDateLabel(item.borrow.dueAt).overdue ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'"
              >
                {{ dueDateLabel(item.borrow.dueAt).label }}
              </span>
              <span class="font-mono text-[10px] uppercase text-muted-foreground">
                Shelf: {{ item.book.id.slice(0, 8).toUpperCase() }}
              </span>
            </div>
            <h2 class="mb-1 font-serif text-3xl font-bold">
              <NuxtLink
                :to="`/book/${item.borrow.bookId}`"
                class="transition-colors hover:text-primary"
              >
                {{ item.book.title }}
              </NuxtLink>
            </h2>
            <p class="mb-4 italic text-muted-foreground">by {{ item.book.author }}</p>
            <div class="mb-6 flex items-center gap-1">
              <span class="text-lg text-primary">
                {{ '★★★★★'.slice(0, Math.round(Number(item.book.rating))) }}
              </span>
              <span class="text-lg text-foreground/10">
                {{ '★★★★★'.slice(Math.round(Number(item.book.rating))) }}
              </span>
              <span class="ml-2 text-[11px] font-medium tracking-tight text-muted-foreground">
                {{ Number(item.book.rating).toFixed(1) }} AVG RATING
              </span>
            </div>
            <div class="h-1.5 w-full overflow-hidden rounded-full bg-foreground/5">
              <div
                class="h-full bg-primary"
                :style="{ width: (item.borrow.currentPage / item.borrow.totalPages * 100) + '%' }"
              />
            </div>
            <p class="mt-2 font-mono text-[11px] text-muted-foreground">
              PAGE {{ item.borrow.currentPage }} OF {{ item.borrow.totalPages }}
              ({{ Math.round(item.borrow.currentPage / item.borrow.totalPages * 100) }}%)
            </p>
          </div>
          <div class="mt-6 flex flex-wrap gap-3">
            <Button variant="archival" @click="handleReturn(item.borrow.bookId, item.book.title)">
              Return Book
            </Button>
            <Button variant="archivalOutline" @click="flash('Review composer opened.')">
              Write Review
            </Button>
            <Button variant="archivalGhost" @click="handleBuy(item.book as BookWithMeta)">
              Buy ${{ Number(item.book.price).toFixed(2) }}
            </Button>
          </div>
        </div>
      </article>
    </template>
  </section>

  <!-- New Arrivals -->
  <section class="animate-enter [animation-delay:150ms]">
    <div class="mb-6 flex items-baseline justify-between border-b border-border pb-2">
      <h1 class="font-serif text-2xl">New Arrivals</h1>
      <span class="font-mono text-[10px] uppercase text-muted-foreground">Curated this week</span>
    </div>

    <div v-if="arrivals.length === 0" class="border-y border-border py-12 text-center font-serif italic text-muted-foreground">
      <template v-if="search.query.value">
        No volumes match "{{ search.query.value }}". Try another title or author.
      </template>
      <template v-else>
        Loading new arrivals...
      </template>
    </div>

    <div v-else class="grid grid-cols-2 gap-6 md:grid-cols-4">
      <article
        v-for="book in arrivals"
        :key="book.id"
        class="flex flex-col items-center text-center"
      >
        <NuxtLink :to="`/book/${book.id}`" class="mb-3 w-full">
          <div :class="`cover-crop cover-${book.crop}`" class="aspect-2/3 w-full overflow-hidden rounded-sm border border-border/40 bg-muted shadow-sm">
            <img :src="book.cover" :alt="book.title" loading="lazy" />
          </div>
        </NuxtLink>
        <NuxtLink
          :to="`/book/${book.id}`"
          class="font-serif text-sm font-semibold transition-colors hover:text-primary line-clamp-1"
        >
          {{ book.title }}
        </NuxtLink>
        <p class="text-xs text-muted-foreground">{{ book.author }}</p>
        <div class="mt-1 flex items-center gap-1 text-xs text-primary">
          <span>{{ '★★★★★'.slice(0, Math.round(Number(book.avgRating))) }}</span>
          <span class="text-foreground/10">{{ '★★★★★'.slice(Math.round(Number(book.avgRating))) }}</span>
          <span class="text-muted-foreground">{{ Number(book.avgRating).toFixed(1) }}</span>
        </div>
        <Button
          variant="archivalOutline"
          size="sm"
          class="mt-3 w-full"
          @click="handleBorrow(book.id, book.title)"
        >
          Borrow
        </Button>
      </article>
    </div>
  </section>

  <!-- Sidebar slots -->
  <template #sidebar>
    <AppSidebar>
      <template #yearly-progress>
        <YearlyProgressCard />
      </template>
    </AppSidebar>
  </template>

  <!-- Flash notice -->
  <div
    v-if="notice"
    role="status"
    class="fixed right-5 top-20 z-50 border border-border bg-foreground px-4 py-3 text-sm text-background shadow-xl animate-enter"
  >
    {{ notice }}
  </div>
</template>
```

- [ ] **Step 3: Verify build**

Run from `frontend/`: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/pages/home.vue frontend/stores/books.ts
git commit -m "feat: rebuild home dashboard with Active Loans, New Arrivals, sidebar slots"
```

---

### Task 11: Update Book type references (totalPages)

**Files:**
- Modify: `backend/src/books/dto/create-book.dto.ts`
- Modify: `backend/src/books/dto/update-book.dto.ts`

- [ ] **Step 1: Add totalPages to CreateBookDto**

Read the DTO files. Add `totalPages?: number` to both DTOs. In the service's `create` and `update` methods, spread the field through.

Check the current DTOs:

```ts
// create-book.dto.ts - add
@IsOptional()
@IsNumber()
totalPages?: number;

// update-book.dto.ts - add same
@IsOptional()
@IsNumber()
totalPages?: number;
```

- [ ] **Step 2: Update books service create/update to include totalPages**

In `books.service.ts`, add `totalPages: dto.totalPages ?? 300` in the insert and update.

- [ ] **Step 3: Verify backend lint**

```bash
cd backend && npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/books/dto/ backend/src/books/books.service.ts
git commit -m "feat: add totalPages to book DTOs and service create/update"
```

---

### Task 12: Final Verification

- [ ] **Step 1: Build backend**

```bash
cd backend && npm run build
```

Expected: Backend builds with no errors.

- [ ] **Step 2: Build frontend**

```bash
cd frontend && npm run build
```

Expected: Nuxt builds client + server successfully.

- [ ] **Step 3: Run backend tests**

```bash
cd backend && npm test
```

Expected: Existing tests pass. New functionality may need test updates.

- [ ] **Step 4: Visual checklist**

Start both dev servers, navigate to `/home`:
- Active Loans section renders borrows with due dates, progress bars, star ratings
- Return Book removes from list with flash notice
- Buy adds to cart
- New Arrivals grid shows 4 books with cover crop, ratings, borrow buttons
- Search filters arrivals
- Yearly Progress card shows goal state
- Flash notices appear briefly after actions
- Bottom dock active state is "Home"
- Other pages still work correctly (Explore, Shelf, Social)
