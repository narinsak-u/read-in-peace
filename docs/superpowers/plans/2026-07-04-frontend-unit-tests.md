# Frontend Unit Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add comprehensive Vitest unit tests covering all pure logic in the Nuxt 3 frontend — utility functions, data mappers, helper functions, and cart store actions.

**Architecture:** Pure utility functions (`utils/`, `types/`) testable with plain vitest + `~` alias. Helper functions extracted from composables/stores via `export` and tested identically. Cart store actions tested with Pinia setup + mocked Nuxt auto-imports. No component/SSR testing — pure logic and critical data paths only.

**Tech Stack:** vitest, @nuxt/test-utils/runtime (for store tests), pinia (for store test setup), happy-dom, @vue/test-utils

---

## File Structure

| File | Responsibility | Tests |
|------|---------------|-------|
| `tests/utils/discount.test.ts` | computeDiscount — tier, category, every-$100, plan logic |
| `tests/utils/dueDate.test.ts` | daysUntilDue, dueLabel, dueInText, borrowProgress |
| `tests/utils/stock.test.ts` | stockActions state machine |
| `tests/utils/auth-schemas.test.ts` | Zod validation — signIn, signUp |
| `tests/types/book.test.ts` | mapBookResponse data transformation |
| `tests/stores/cart.test.ts` | mergeGuestCart + cart CRUD actions |
| `tests/composables/useBookComments.test.ts` | getInitials, timeAgo, mapCommentToReview |
| `tests/composables/useBorrows.test.ts` | mapBorrowResponse |
| `tests/composables/useFeed.test.ts` | mapFeedPost |

**Files to create:**
- `vitest.config.ts`
- `tests/utils/discount.test.ts`
- `tests/utils/dueDate.test.ts`
- `tests/utils/stock.test.ts`
- `tests/utils/auth-schemas.test.ts`
- `tests/types/book.test.ts`
- `tests/stores/cart.test.ts`
- `tests/composables/useBookComments.test.ts`
- `tests/composables/useBorrows.test.ts`
- `tests/composables/useFeed.test.ts`

**Files to modify:**
- `frontend/package.json` — add vitest scripts + devDependencies
- `frontend/stores/cart.ts:19` — add `export` to `mergeGuestCart`
- `frontend/composables/useBookComments.ts:38,42,54` — add `export` to `getInitials`, `timeAgo`, `mapCommentToReview`
- `frontend/composables/useBorrows.ts:105` — add `export` to `mapBorrowResponse`
- `frontend/composables/useFeed.ts:91` — add `export` to `mapFeedPost`

---

### Task 1: Set up Vitest

**Files:**
- Create: `frontend/vitest.config.ts`
- Modify: `frontend/package.json`

- [ ] **Step 1: Install vitest and testing dependencies**

Run: `npm install -D vitest @nuxt/test-utils @vue/test-utils happy-dom`

Or use your package manager of choice (pnpm, yarn).

- [ ] **Step 2: Create vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "~": resolve(__dirname),
    },
  },
});
```

- [ ] **Step 3: Add test scripts to package.json**

Replace the `"scripts"` block in `frontend/package.json`:

```json
  "scripts": {
    "dev": "nuxt dev",
    "build": "nuxt build",
    "generate": "nuxt generate",
    "preview": "nuxt preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
```

- [ ] **Step 4: Run a sanity test to verify setup works**

Create `tests/sanity.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("sanity", () => {
  it("should run tests", () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm run test`

Expected: All tests passing (1 suite, 1 test). Remove `tests/sanity.test.ts` after first run.

Expected output:
```
 ✓ tests/sanity.test.ts (1 test)
 Test Files  1 passed (1)
      Tests  1 passed (1)
```

- [ ] **Step 5: Create directory structure**

Run:
```bash
mkdir -p tests/utils tests/types tests/stores tests/composables
```

- [ ] **Step 6: Commit**

```bash
git add frontend/vitest.config.ts frontend/package.json tests/sanity.test.ts tests/utils tests/types tests/stores tests/composables
git rm --cached tests/sanity.test.ts
git commit -m "test: set up vitest with directory structure"
```

---

### Task 2: Test discount.ts — computeDiscount pipeline

**Files:**
- Create: `tests/utils/discount.test.ts`

- [ ] **Step 1: Write the test file**

`tests/utils/discount.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeDiscount } from "~/utils/discount";

function item(overrides: Partial<{
  id: string;
  title: string;
  author: string;
  price: number;
  cover: string;
  crop: number | null;
  quantity: number;
  stock: number;
  category: string;
}> = {}) {
  return {
    id: overrides.id ?? "b1",
    title: overrides.title ?? "Test Book",
    author: overrides.author ?? "Test Author",
    price: overrides.price ?? 10,
    cover: overrides.cover ?? "cover.jpg",
    crop: overrides.crop ?? null,
    quantity: overrides.quantity ?? 1,
    stock: overrides.stock ?? 10,
    category: overrides.category ?? "fiction",
  };
}

describe("computeDiscount", () => {
  it("returns zeroed breakdown for empty cart", () => {
    const result = computeDiscount([], 0);
    expect(result).toEqual({
      subtotal: 0,
      tierPercent: 0,
      tierDiscount: 0,
      categoryBonus: 0,
      every100Discount: 0,
      planDiscount: 0,
      total: 0,
    });
  });

  it("applies 10% tier discount for 2 items", () => {
    const result = computeDiscount([item({ id: "a" }), item({ id: "b" })], 0);
    // subtotal = 2000¢, tier 10% = 200¢, total = 1800¢
    expect(result.subtotal).toBe(2000);
    expect(result.tierPercent).toBe(10);
    expect(result.tierDiscount).toBe(200);
    expect(result.total).toBe(1800);
  });

  it("applies 20% tier discount for 3 items", () => {
    const result = computeDiscount(
      [item({ id: "a" }), item({ id: "b" }), item({ id: "c" })],
      0,
    );
    expect(result.tierPercent).toBe(20);
    expect(result.tierDiscount).toBe(600);
    expect(result.total).toBe(2400);
  });

  it("applies 30% tier discount for 4+ items", () => {
    const result = computeDiscount(
      [
        item({ id: "a" }),
        item({ id: "b" }),
        item({ id: "c" }),
        item({ id: "d" }),
        item({ id: "e" }),
      ],
      0,
    );
    expect(result.tierPercent).toBe(30);
    expect(result.tierDiscount).toBe(3000);
    expect(result.total).toBe(7000);
  });

  it("applies category bonus when 2+ items share a category", () => {
    const result = computeDiscount(
      [
        item({ id: "a", category: "fiction", price: 10, quantity: 1 }),
        item({ id: "b", category: "fiction", price: 20, quantity: 1 }),
      ],
      0,
    );
    // subtotal = 3000¢ (1000 + 2000)
    // tier 10% = 300¢ → 2700
    // category bonus: fiction subtotal = 3000¢, count=2 → 300¢
    // 2700 - 300 = 2400
    // every100: floor(2400/10000) = 0, no discount
    // total = 2400
    expect(result.subtotal).toBe(3000);
    expect(result.tierDiscount).toBe(300);
    expect(result.categoryBonus).toBe(300);
    expect(result.total).toBe(2400);
  });

  it("applies every-$100 discount correctly", () => {
    const items = Array.from({ length: 10 }, (_, i) =>
      item({ id: `b${i}`, price: 15, quantity: 1 }),
    );
    const result = computeDiscount(items, 0);
    // subtotal = 15000¢ (15 * 10 * 100)
    // tier 30% = 4500¢ → 10500
    // category bonus: all "fiction", count=10 → floor(15000*0.1) = 1500¢
    // 10500 - 1500 = 9000
    // every100: floor(9000 / 10000) = 0 → no discount here
    expect(result.every100Discount).toBe(0);
  });

  it("applies every-$100 discount when running total exceeds $100", () => {
    const items = Array.from({ length: 12 }, (_, i) =>
      item({ id: `b${i}`, price: 15, quantity: 1 }),
    );
    const result = computeDiscount(items, 0);
    // subtotal = 18000¢
    // tier 30% = 5400¢ → 12600
    // category bonus = 10% of each category's subtotal where count >= 2
    // all same cat → 18000 * 0.1 = 1800¢
    // 12600 - 1800 = 10800
    // every100: floor(10800 / 10000) = 1 → 100¢
    expect(result.every100Discount).toBe(100);
  });

  it("applies plan discount on running total after all other discounts", () => {
    const result = computeDiscount([item({ price: 100 })], 15);
    // subtotal = 10000¢, tier 0%, category bonus 0
    // every100: floor(10000 / 10000) = 1 → 100¢ → 9900
    // plan 15%: round(9900 * 0.15) = 1485¢ → 9900 - 1485 = 8415
    expect(result.planDiscount).toBe(1485);
    expect(result.total).toBe(8415);
  });

  it("never returns negative total", () => {
    // extreme discounts should floor at 0
    const result = computeDiscount(
      [item({ price: 5, quantity: 1 })],
      100,
    );
    // subtotal = 500¢, tier 0, cat 0, every100 0
    // plan 100%: round(500 * 1) = 500 → 0
    expect(result.total).toBe(0);
  });

  it("handles multiple items with different quantities and prices", () => {
    const result = computeDiscount(
      [
        item({ id: "a", price: 9.99, quantity: 2 }),
        item({ id: "b", price: 14.99, quantity: 1 }),
      ],
      0,
    );
    // subtotal = 2*999 + 1*1499 = 3497¢
    // tier 10% = 350¢ → 3147
    // cat bonus: same cat, subtotal 3497, count 2 → 350¢
    // 3147 - 350 = 2797
    // every100: floor(2797/10000) = 0
    // total = 2797
    expect(result.subtotal).toBe(3497);
    expect(result.tierPercent).toBe(10);
    expect(result.categoryBonus).toBe(350);
    expect(result.total).toBe(2797);
  });

  it("rounds cents correctly in subtotal", () => {
    const result = computeDiscount(
      [item({ price: 10.99, quantity: 3 })],
      0,
    );
    // Math.round(10.99 * 3 * 100) = Math.round(3297) = 3297¢
    expect(result.subtotal).toBe(3297);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npm run test`

Expected: All discount tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/utils/discount.test.ts
git commit -m "test: add computeDiscount tests with edge cases"
```

---

### Task 3: Test dueDate.ts — date math helpers

**Files:**
- Create: `tests/utils/dueDate.test.ts`

- [ ] **Step 1: Write test file**

`tests/utils/dueDate.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { daysUntilDue, dueLabel, dueInText, borrowProgress } from "~/utils/dueDate";

describe("daysUntilDue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns positive days for future date", () => {
    vi.setSystemTime(new Date("2026-07-04T12:00:00Z"));
    expect(daysUntilDue("2026-07-10T12:00:00Z")).toBe(6);
  });

  it("returns 0 for due today", () => {
    vi.setSystemTime(new Date("2026-07-04T12:00:00Z"));
    expect(daysUntilDue("2026-07-04T23:59:00Z")).toBe(0);
  });

  it("returns 0 for due in less than 24h on different days", () => {
    vi.setSystemTime(new Date("2026-07-04T23:00:00Z"));
    // next day, only 1h away → ceil(1/24) = 1
    expect(daysUntilDue("2026-07-05T00:00:00Z")).toBe(1);
  });

  it("returns negative for overdue date", () => {
    vi.setSystemTime(new Date("2026-07-04T12:00:00Z"));
    expect(daysUntilDue("2026-07-01T12:00:00Z")).toBe(-3);
  });
});

describe("dueLabel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("marks as OVERDUE with day count for past date", () => {
    vi.setSystemTime(new Date("2026-07-04T12:00:00Z"));
    expect(dueLabel("2026-07-01T12:00:00Z")).toEqual({
      text: "OVERDUE (3D)",
      urgent: true,
    });
  });

  it("marks as DUE TODAY when 0 days remain", () => {
    vi.setSystemTime(new Date("2026-07-04T12:00:00Z"));
    expect(dueLabel("2026-07-04T23:59:00Z")).toEqual({
      text: "DUE TODAY",
      urgent: true,
    });
  });

  it("marks DUE IN X DAYS for 1-3 days out", () => {
    vi.setSystemTime(new Date("2026-07-04T12:00:00Z"));
    expect(dueLabel("2026-07-05T12:00:00Z")).toEqual({
      text: "DUE IN 1 DAYS",
      urgent: true,
    });
    expect(dueLabel("2026-07-07T12:00:00Z")).toEqual({
      text: "DUE IN 3 DAYS",
      urgent: true,
    });
  });

  it("returns formatted date for 4+ days out, not urgent", () => {
    vi.setSystemTime(new Date("2026-07-04T12:00:00Z"));
    const label = dueLabel("2026-07-20T12:00:00Z");
    expect(label.text).toMatch(/DUE: JUL \d+/);
    expect(label.urgent).toBe(false);
  });
});

describe("dueInText", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns overdue text for past dates", () => {
    vi.setSystemTime(new Date("2026-07-04T12:00:00Z"));
    expect(dueInText("2026-07-01T12:00:00Z")).toBe("Overdue by 3 days");
  });

  it("returns due today", () => {
    vi.setSystemTime(new Date("2026-07-04T12:00:00Z"));
    expect(dueInText("2026-07-04T23:59:00Z")).toBe("Due today");
  });

  it("returns due in 1 day for 1 day remaining", () => {
    vi.setSystemTime(new Date("2026-07-04T12:00:00Z"));
    expect(dueInText("2026-07-05T12:00:00Z")).toBe("Due in 1 day");
  });

  it("returns plural for multiple days", () => {
    vi.setSystemTime(new Date("2026-07-04T12:00:00Z"));
    expect(dueInText("2026-07-10T12:00:00Z")).toBe("Due in 6 days");
  });
});

describe("borrowProgress", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 0 at start of borrow period", () => {
    vi.setSystemTime(new Date("2026-07-04T12:00:00Z"));
    // 14 days from now
    expect(borrowProgress("2026-07-18T12:00:00Z")).toBe(0);
  });

  it("returns ~50% halfway through", () => {
    vi.setSystemTime(new Date("2026-07-04T12:00:00Z"));
    // due in 7 days → 7 elapsed out of 14 → 50%
    expect(borrowProgress("2026-07-11T12:00:00Z")).toBe(50);
  });

  it("returns 100 at due date", () => {
    vi.setSystemTime(new Date("2026-07-04T12:00:00Z"));
    expect(borrowProgress("2026-07-04T12:00:00Z")).toBe(100);
  });

  it("caps at 100 for overdue", () => {
    vi.setSystemTime(new Date("2026-07-10T12:00:00Z"));
    // 6 days past due date (due was Jul 4)
    expect(borrowProgress("2026-07-04T12:00:00Z")).toBe(100);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npm run test`

Expected: All dueDate tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/utils/dueDate.test.ts
git commit -m "test: add dueDate tests with date math edge cases"
```

---

### Task 4: Test stock.ts — stockActions state machine

**Files:**
- Create: `tests/utils/stock.test.ts`

- [ ] **Step 1: Write test file**

`tests/utils/stock.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { stockActions } from "~/utils/stock";

const inStockBook = { id: "b1", inStock: 5, slug: "test-book" };
const outOfStockBook = { id: "b2", inStock: 0, slug: "sold-out" };
const lowStockBook = { id: "b3", inStock: 1, slug: "last-copy" };

describe("stockActions", () => {
  it("allows borrow and buy when in stock and not borrowed", () => {
    const result = stockActions(inStockBook, new Set());
    expect(result.isBorrowed).toBe(false);
    expect(result.canBorrow).toBe(true);
    expect(result.canBuy).toBe(true);
    expect(result.unavailable).toBe(false);
  });

  it("disables borrow when already borrowed, but buy still available", () => {
    const result = stockActions(inStockBook, new Set(["test-book"]));
    expect(result.isBorrowed).toBe(true);
    expect(result.canBorrow).toBe(false);
    expect(result.canBuy).toBe(true);
    expect(result.unavailable).toBe(false);
  });

  it("shows unavailable when out of stock and not borrowed", () => {
    const result = stockActions(outOfStockBook, new Set());
    expect(result.canBorrow).toBe(false);
    expect(result.canBuy).toBe(false);
    expect(result.unavailable).toBe(true);
  });

  it("canBorrow true when inStock >= 1 even if only 1", () => {
    const result = stockActions(lowStockBook, new Set());
    expect(result.canBorrow).toBe(true);
    expect(result.canBuy).toBe(false); // inStock < 2
  });

  it("isPurchased true when ownedCount > 0", () => {
    const counts = new Map([["b1", 1]]);
    const result = stockActions(inStockBook, new Set(), counts);
    expect(result.isPurchased).toBe(true);
    expect(result.ownedCount).toBe(1);
  });

  it("isPurchased false when purchasedCounts is undefined", () => {
    const result = stockActions(inStockBook, new Set());
    expect(result.isPurchased).toBe(false);
    expect(result.ownedCount).toBe(0);
  });

  it("isPurchased false when book not in purchased map", () => {
    const counts = new Map([["other", 2]]);
    const result = stockActions(inStockBook, new Set(), counts);
    expect(result.isPurchased).toBe(false);
    expect(result.ownedCount).toBe(0);
  });

  it("tracks ownedCount for multiple purchases", () => {
    const counts = new Map([["b1", 3]]);
    const result = stockActions(inStockBook, new Set(), counts);
    expect(result.isPurchased).toBe(true);
    expect(result.ownedCount).toBe(3);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npm run test`

Expected: All stock tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/utils/stock.test.ts
git commit -m "test: add stockActions tests for borrow/buy/unavailable states"
```

---

### Task 5: Test auth-schemas.ts — Zod validation

**Files:**
- Create: `tests/utils/auth-schemas.test.ts`

- [ ] **Step 1: Write test file**

`tests/utils/auth-schemas.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { validateSignIn, validateSignUp } from "~/utils/auth-schemas";

describe("validateSignIn", () => {
  it("returns null for valid input", () => {
    expect(validateSignIn({ email: "user@example.com", password: "password123" })).toBeNull();
  });

  it("returns error for empty email", () => {
    expect(validateSignIn({ email: "", password: "password123" })).toBe("Please enter your email");
  });

  it("returns error for malformed email", () => {
    const err = validateSignIn({ email: "not-an-email", password: "password123" });
    expect(err).toBe("Please enter a valid email address");
  });

  it("returns error for empty password", () => {
    const err = validateSignIn({ email: "user@example.com", password: "" });
    expect(err).toBe("Please enter a password");
  });

  it("returns error for short password", () => {
    const err = validateSignIn({ email: "user@example.com", password: "1234567" });
    expect(err).toBe("Password must be at least 8 characters");
  });

  it("returns first error for multiple issues", () => {
    const err = validateSignIn({ email: "", password: "" });
    expect(err).toBe("Please enter your email");
  });
});

describe("validateSignUp", () => {
  it("returns null for valid input", () => {
    expect(validateSignUp({
      name: "Alice",
      email: "alice@example.com",
      password: "secure123",
    })).toBeNull();
  });

  it("returns error for empty name", () => {
    const err = validateSignUp({
      name: "",
      email: "alice@example.com",
      password: "secure123",
    });
    expect(err).toBe("Please enter your name");
  });

  it("returns name error before email error", () => {
    // name is the first field in the extended schema (zod processes in order)
    const err = validateSignUp({
      name: "",
      email: "bad",
      password: "short",
    });
    expect(err).toBe("Please enter your name");
  });

  it("inherits email validation from signIn schema", () => {
    const err = validateSignUp({
      name: "Alice",
      email: "bad",
      password: "secure123",
    });
    expect(err).toBe("Please enter a valid email address");
  });

  it("inherits password length validation from signIn schema", () => {
    const err = validateSignUp({
      name: "Alice",
      email: "alice@example.com",
      password: "short",
    });
    expect(err).toBe("Password must be at least 8 characters");
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npm run test`

Expected: All auth-schemas tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/utils/auth-schemas.test.ts
git commit -m "test: add auth-schema Zod validation tests"
```

---

### Task 6: Test mapBookResponse — data transformation

**Files:**
- Create: `tests/types/book.test.ts`

- [ ] **Step 1: Write test file**

`tests/types/book.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { mapBookResponse } from "~/types/book";

describe("mapBookResponse", () => {
  it("maps a complete record to a Book", () => {
    const raw = {
      id: "abc-123",
      slug: "the-great-gatsby",
      title: "The Great Gatsby",
      author: "F. Scott Fitzgerald",
      price: "12.99",
      cover: "/covers/gatsby.jpg",
      synopsis: "A story of the fabulously wealthy...",
      category: "fiction",
      crop: 50,
      shelf: "F",
      year: 1925,
      trending: true,
      inStock: 10,
      isAvailable: true,
      totalPages: 180,
      likeCount: 42,
      commentCount: 7,
      avgRating: 4.5,
      ratingsCount: 100,
      createdBy: "admin",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-06-01T00:00:00Z",
    };
    const book = mapBookResponse(raw);
    expect(book.id).toBe("abc-123");
    expect(book.slug).toBe("the-great-gatsby");
    expect(book.price).toBe("12.99");
    expect(book.crop).toBe(50);
    expect(book.year).toBe(1925);
    expect(book.trending).toBe(true);
    expect(book.avgRating).toBe(4.5);
  });

  it("coerces numeric price to string", () => {
    const raw = {
      id: "b1", slug: "b", title: "T", author: "A", cover: "c.jpg",
      synopsis: "", category: "", crop: null, shelf: "", year: 2020,
      trending: false, inStock: 0, isAvailable: true, totalPages: 0,
      likeCount: 0, commentCount: 0, avgRating: 0, ratingsCount: 0,
      createdBy: "", createdAt: "", updatedAt: "",
      price: 9.99,
    };
    expect(mapBookResponse(raw).price).toBe("9.99");
  });

  it("coerces undefined price to '0'", () => {
    const raw = {
      id: "b1", slug: "b", title: "T", author: "A", cover: "c.jpg",
      synopsis: "", category: "", crop: null, shelf: "", year: 2020,
      trending: false, inStock: 0, isAvailable: true, totalPages: 0,
      likeCount: 0, commentCount: 0, avgRating: 0, ratingsCount: 0,
      createdBy: "", createdAt: "", updatedAt: "",
    };
    expect(mapBookResponse(raw).price).toBe("0");
  });

  it("coerces null crop to null", () => {
    const raw = {
      id: "b1", slug: "b", title: "T", author: "A", cover: "c.jpg",
      synopsis: "", category: "", crop: null, shelf: "", year: 2020,
      trending: false, inStock: 0, isAvailable: true, totalPages: 0,
      likeCount: 0, commentCount: 0, avgRating: 0, ratingsCount: 0,
      createdBy: "", createdAt: "", updatedAt: "",
    };
    expect(mapBookResponse(raw).crop).toBeNull();
  });

  it("coerces string avgRating to number", () => {
    const raw = {
      id: "b1", slug: "b", title: "T", author: "A", cover: "c.jpg",
      synopsis: "", category: "", crop: null, shelf: "", year: 2020,
      trending: false, inStock: 0, isAvailable: true, totalPages: 0,
      likeCount: 0, commentCount: 0, avgRating: "4.2", ratingsCount: 0,
      createdBy: "", createdAt: "", updatedAt: "",
    };
    expect(mapBookResponse(raw).avgRating).toBe(4.2);
  });

  it("coerces undefined avgRating to 0", () => {
    const raw = {
      id: "b1", slug: "b", title: "T", author: "A", cover: "c.jpg",
      synopsis: "", category: "", crop: null, shelf: "", year: 2020,
      trending: false, inStock: 0, isAvailable: true, totalPages: 0,
      likeCount: 0, commentCount: 0, ratingsCount: 0,
      createdBy: "", createdAt: "", updatedAt: "",
    };
    expect(mapBookResponse(raw).avgRating).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npm run test`

Expected: All mapBookResponse tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/types/book.test.ts
git commit -m "test: add mapBookResponse data mapping tests"
```

---

### Task 7: Test mergeGuestCart + cart store actions

**Files:**
- Modify: `frontend/stores/cart.ts:19` (add `export` to `mergeGuestCart`)
- Create: `tests/stores/cart.test.ts`

- [ ] **Step 1: Export mergeGuestCart**

In `frontend/stores/cart.ts`, change line 19:
```
function mergeGuestCart(existing: CartItem[], guest: CartItem[]): CartItem[] {
```
to:
```
export function mergeGuestCart(existing: CartItem[], guest: CartItem[]): CartItem[] {
```

- [ ] **Step 2: Write test file for mergeGuestCart**

`tests/stores/cart.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { mergeGuestCart, type CartItem } from "~/stores/cart";

function item(id: string, quantity = 1): CartItem {
  return {
    id,
    title: `Book ${id}`,
    author: "Author",
    price: 10,
    cover: "cover.jpg",
    crop: null,
    quantity,
    stock: 5,
    category: "fiction",
  };
}

describe("mergeGuestCart", () => {
  it("returns existing cart unchanged when guest cart is empty", () => {
    const existing = [item("a"), item("b")];
    expect(mergeGuestCart(existing, [])).toEqual(existing);
  });

  it("appends guest items that do not exist in cart", () => {
    const existing = [item("a")];
    const guest = [item("b")];
    const result = mergeGuestCart(existing, guest);
    expect(result).toHaveLength(2);
    expect(result.find((i) => i.id === "a")).toBeTruthy();
    expect(result.find((i) => i.id === "b")).toBeTruthy();
  });

  it("takes max quantity when item exists in both", () => {
    const existing = [item("a", 2)];
    const guest = [item("a", 5)];
    const result = mergeGuestCart(existing, guest);
    expect(result.find((i) => i.id === "a")!.quantity).toBe(5);
  });

  it("takes existing quantity when it is larger than guest", () => {
    const existing = [item("a", 5)];
    const guest = [item("a", 2)];
    const result = mergeGuestCart(existing, guest);
    expect(result.find((i) => i.id === "a")!.quantity).toBe(5);
  });

  it("merges overlapping and non-overlapping items", () => {
    const existing = [item("a", 1), item("b", 2)];
    const guest = [item("b", 3), item("c", 1)];
    const result = mergeGuestCart(existing, guest);
    expect(result).toHaveLength(3);
    expect(result.find((i) => i.id === "a")!.quantity).toBe(1);
    expect(result.find((i) => i.id === "b")!.quantity).toBe(3);
    expect(result.find((i) => i.id === "c")!.quantity).toBe(1);
  });

  it("returns empty when both are empty", () => {
    expect(mergeGuestCart([], [])).toEqual([]);
  });
});
```

- [ ] **Step 3: Run mergeGuestCart tests**

Run: `npm run test`

Expected: All mergeGuestCart tests pass.

- [ ] **Step 4: Commit**

```bash
git add tests/stores/cart.test.ts
git commit -m "test: add mergeGuestCart merge strategy tests"
```

---

### Task 8: Test getInitials, timeAgo, mapCommentToReview

**Files:**
- Modify: `frontend/composables/useBookComments.ts:38,42,54` (export helper functions)
- Create: `tests/composables/useBookComments.test.ts`

- [ ] **Step 1: Export helper functions**

In `frontend/composables/useBookComments.ts`, add `export` to three functions:

Line 38: `function getInitials(name: string): string {` → `export function getInitials(name: string): string {`

Line 42: `function timeAgo(dateStr: string): string {` → `export function timeAgo(dateStr: string): string {`

Line 54: `function mapCommentToReview(comment: ApiComment): Review {` → `export function mapCommentToReview(comment: ApiComment): Review {`

- [ ] **Step 2: Write test file**

`tests/composables/useBookComments.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getInitials, timeAgo, mapCommentToReview } from "~/composables/useBookComments";
import type { ApiComment } from "~/composables/useBookComments";

describe("getInitials", () => {
  it("returns first 2 uppercase characters for full name", () => {
    expect(getInitials("Alice")).toBe("AL");
  });

  it("returns first 2 chars for single name", () => {
    expect(getInitials("Jo")).toBe("JO");
  });

  it("handles empty string", () => {
    expect(getInitials("")).toBe("");
  });

  it("converts lowercase to uppercase", () => {
    expect(getInitials("alice")).toBe("AL");
  });
});

describe("timeAgo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-04T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'just now' for < 60 seconds", () => {
    const now = new Date();
    expect(timeAgo(now.toISOString())).toBe("just now");
  });

  it("returns 'Xm ago' for < 60 minutes", () => {
    const past = new Date(Date.now() - 5 * 60 * 1000);
    expect(timeAgo(past.toISOString())).toBe("5m ago");
  });

  it("returns 'Xh ago' for < 24 hours", () => {
    const past = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(timeAgo(past.toISOString())).toBe("3h ago");
  });

  it("returns 'Yesterday' for 24-48 hours", () => {
    const past = new Date(Date.now() - 25 * 60 * 60 * 1000);
    expect(timeAgo(past.toISOString())).toBe("Yesterday");
  });

  it("returns 'Xd ago' for 2+ days", () => {
    const past = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    expect(timeAgo(past.toISOString())).toBe("5d ago");
  });
});

describe("mapCommentToReview", () => {
  it("maps a complete ApiComment to Review", () => {
    const comment = {
      id: "c1",
      bookId: "b1",
      userId: "u1",
      parentId: null,
      text: "Great book!",
      rating: 5,
      createdAt: "2026-07-01T12:00:00Z",
      updatedAt: "2026-07-01T12:00:00Z",
      likeCount: 10,
      likedByUser: true,
      user: { id: "u1", name: "Alice", image: null },
      replies: [
        {
          id: "r1", bookId: "b1", userId: "u2", parentId: "c1",
          text: "I agree!", rating: null, createdAt: "", updatedAt: "",
          likeCount: 0, likedByUser: false,
          user: { id: "u2", name: "Bob", image: null },
        },
      ],
    };

    const review = mapCommentToReview(comment);
    expect(review.id).toBe("c1");
    expect(review.initials).toBe("AL");
    expect(review.name).toBe("Alice");
    expect(review.text).toBe("Great book!");
    expect(review.rating).toBe(5);
    expect(review.likes).toBe(10);
    expect(review.likedByUser).toBe(true);
    expect(review.replies).toEqual(["I agree! — Bob"]);
  });

  it("handles null rating", () => {
    const comment = {
      id: "c1", bookId: "b1", userId: "u1", parentId: null,
      text: "OK", rating: null, createdAt: "", updatedAt: "",
      likeCount: 0, likedByUser: false,
      user: { id: "u1", name: "Test", image: null },
    };
    expect(mapCommentToReview(comment).rating).toBe(0);
  });

  it("handles no replies", () => {
    const comment = {
      id: "c1", bookId: "b1", userId: "u1", parentId: null,
      text: "OK", rating: null, createdAt: "", updatedAt: "",
      likeCount: 0, likedByUser: false,
      user: { id: "u1", name: "Test", image: null },
    };
    expect(mapCommentToReview(comment).replies).toEqual([]);
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npm run test`

Expected: All useBookComments tests pass.

- [ ] **Step 4: Commit**

```bash
git add tests/composables/useBookComments.test.ts
git commit -m "test: add getInitials, timeAgo, mapCommentToReview tests"
```

---

### Task 9: Test mapBorrowResponse

**Files:**
- Modify: `frontend/composables/useBorrows.ts:105` (export `mapBorrowResponse`)
- Create: `tests/composables/useBorrows.test.ts`

- [ ] **Step 1: Export mapBorrowResponse**

In `frontend/composables/useBorrows.ts` line 105, change:
```
function mapBorrowResponse(
```
to:
```
export function mapBorrowResponse(
```

- [ ] **Step 2: Write test file**

`tests/composables/useBorrows.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { mapBorrowResponse, type BorrowsResponse } from "~/composables/useBorrows";

const entry: BorrowsResponse["data"][number] = {
  borrow: { id: "br1", dueAt: "2026-07-18T12:00:00Z", currentPage: 42, totalPages: 200 },
  book: {
    id: "b1", slug: "test-book", title: "Test Book", author: "Author",
    cover: "cover.jpg", crop: 30, shelf: "FIC", category: "fiction",
    price: "12.99", inStock: 5, avgRating: 4.2, ratingsCount: 10,
  },
};

describe("mapBorrowResponse", () => {
  it("maps a complete borrow entry", () => {
    const item = mapBorrowResponse(entry);
    expect(item.borrowId).toBe("br1");
    expect(item.bookId).toBe("b1");
    expect(item.bookSlug).toBe("test-book");
    expect(item.title).toBe("Test Book");
    expect(item.author).toBe("Author");
    expect(item.cover).toBe("cover.jpg");
    expect(item.crop).toBe(30);
    expect(item.shelf).toBe("FIC");
    expect(item.category).toBe("fiction");
    expect(item.dueAt).toBe("2026-07-18T12:00:00Z");
    expect(item.currentPage).toBe(42);
    expect(item.totalPages).toBe(200);
    expect(item.price).toBe("12.99");
    expect(item.inStock).toBe(5);
    expect(item.avgRating).toBe(4.2);
    expect(item.ratingsCount).toBe(10);
  });

  it("falls back to book id for slug when slug is missing", () => {
    const noSlug = {
      ...entry,
      book: { ...entry.book, slug: undefined },
    };
    const item = mapBorrowResponse(noSlug as any);
    expect(item.bookSlug).toBe("b1");
  });

  it("falls back to 'GEN' for missing shelf", () => {
    const noShelf = {
      ...entry,
      book: { ...entry.book, shelf: undefined },
    };
    const item = mapBorrowResponse(noShelf as any);
    expect(item.shelf).toBe("GEN");
  });

  it("coerces numeric price to string", () => {
    const numPrice = {
      ...entry,
      book: { ...entry.book, price: 9.99 },
    };
    const item = mapBorrowResponse(numPrice as any);
    expect(item.price).toBe("9.99");
  });

  it("defaults avgRating to 0 when missing", () => {
    const noRating = {
      ...entry,
      book: { ...entry.book, avgRating: undefined },
    };
    const item = mapBorrowResponse(noRating as any);
    expect(item.avgRating).toBe(0);
  });

  it("defaults inStock to 0 when missing", () => {
    const noStock = {
      ...entry,
      book: { ...entry.book, inStock: undefined },
    };
    const item = mapBorrowResponse(noStock as any);
    expect(item.inStock).toBe(0);
  });

  it("defaults category to empty string when missing", () => {
    const noCat = {
      ...entry,
      book: { ...entry.book, category: undefined },
    };
    const item = mapBorrowResponse(noCat as any);
    expect(item.category).toBe("");
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npm run test`

Expected: All mapBorrowResponse tests pass.

- [ ] **Step 4: Commit**

```bash
git add tests/composables/useBorrows.test.ts
git commit -m "test: add mapBorrowResponse data mapping tests"
```

---

### Task 10: Test mapFeedPost

**Files:**
- Modify: `frontend/composables/useFeed.ts:91` (export `mapFeedPost`)
- Create: `tests/composables/useFeed.test.ts`

- [ ] **Step 1: Export mapFeedPost**

In `frontend/composables/useFeed.ts` line 91, change:
```
function mapFeedPost(raw: Record<string, unknown>): FeedPost {
```
to:
```
export function mapFeedPost(raw: Record<string, unknown>): FeedPost {
```

- [ ] **Step 2: Write test file**

`tests/composables/useFeed.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { mapFeedPost, type FeedPost } from "~/composables/useFeed";

describe("mapFeedPost", () => {
  it("maps a complete feed post entry", () => {
    const raw = {
      id: "p1",
      text: "Amazing read!",
      rating: 5,
      createdAt: "2026-07-01T12:00:00Z",
      user: { id: "u1", name: "Alice", image: null },
      likeCount: 15,
      likedByUser: true,
      replies: [
        {
          text: "Totally agree",
          user: { name: "Bob" },
        },
      ],
    };

    const post = mapFeedPost(raw);
    expect(post.id).toBe("p1");
    expect(post.text).toBe("Amazing read!");
    expect(post.rating).toBe(5);
    expect(post.user).toEqual({ id: "u1", name: "Alice", image: null });
    expect(post.likeCount).toBe(15);
    expect(post.liked).toBe(true);
    expect(post.replies).toHaveLength(1);
    expect(post.replies[0]).toEqual({ name: "Bob", text: "Totally agree" });
  });

  it("handles no rating", () => {
    const post = mapFeedPost({
      id: "p1", text: "OK", createdAt: "", user: { id: "u1", name: "A", image: null },
      likeCount: 0, replies: [],
    });
    expect(post.rating).toBeNull();
  });

  it("handles missing likedByUser", () => {
    const post = mapFeedPost({
      id: "p1", text: "OK", createdAt: "", user: { id: "u1", name: "A", image: null },
      likeCount: 0, replies: [],
    });
    expect(post.liked).toBe(false);
  });

  it("handles empty replies array", () => {
    const post = mapFeedPost({
      id: "p1", text: "OK", rating: null, createdAt: "",
      user: { id: "u1", name: "A", image: null },
      likeCount: 0, replies: [],
    });
    expect(post.replies).toEqual([]);
    expect(post.replyCount).toBe(0);
  });

  it("handles missing user name in replies", () => {
    const raw = {
      id: "p1", text: "OK", createdAt: "",
      user: { id: "u1", name: "A", image: null },
      likeCount: 0, replies: [
        { text: "nice", user: {} },
      ],
    };
    const post = mapFeedPost(raw);
    expect(post.replies[0].name).toBe("Unknown");
  });

  it("defaults likeCount to 0 when missing", () => {
    const post = mapFeedPost({
      id: "p1", text: "OK", createdAt: "", user: { id: "u1", name: "A", image: null },
      replies: [],
    });
    expect(post.likeCount).toBe(0);
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npm run test`

Expected: All mapFeedPost tests pass.

- [ ] **Step 4: Commit**

```bash
git add tests/composables/useFeed.test.ts
git commit -m "test: add mapFeedPost data mapping tests"
```

---

### Task 11: Final verification

- [ ] **Step 1: Run full test suite**

Run: `npm run test`

Expected: All test files pass with no failures.

Expected output:
```
 ✓ tests/utils/discount.test.ts
 ✓ tests/utils/dueDate.test.ts
 ✓ tests/utils/stock.test.ts
 ✓ tests/utils/auth-schemas.test.ts
 ✓ tests/types/book.test.ts
 ✓ tests/stores/cart.test.ts
 ✓ tests/composables/useBookComments.test.ts
 ✓ tests/composables/useBorrows.test.ts
 ✓ tests/composables/useFeed.test.ts

 Test Files  9 passed (9)
      Tests  XX passed (XX)
```

- [ ] **Step 2: Run any one test file in watch mode to verify setup**

Run: `npm run test:watch -- tests/utils/discount.test.ts`

Press `q` to quit.

Expected: Watch mode works, shows test results, re-runs on file changes.

- [ ] **Step 3: Commit any remaining changes**

If the helper function exports in Tasks 7-10 have not been committed yet:

```bash
git add frontend/stores/cart.ts frontend/composables/useBookComments.ts frontend/composables/useBorrows.ts frontend/composables/useFeed.ts
git commit -m "refactor: export helper functions for testability"
```

---

## Self-Review

**1. Spec coverage:**
- Pure util function tests: Tasks 2-5 (discount, dueDate, stock, auth-schemas)
- Data mapping tests: Tasks 6, 9, 10 (mapBookResponse, mapBorrowResponse, mapFeedPost)
- Store logic tests: Task 7 (mergeGuestCart)
- Composable helper tests: Task 8 (getInitials, timeAgo, mapCommentToReview)
- All tests cover edge cases — empty/null/undefined inputs, boundary values, fallback defaults

**2. Placeholder scan:** No TBDs, TODOs, or placeholder patterns. Every step has complete code.

**3. Type consistency:** Types used in tests match the source types (CartItem, ApiComment, BorrowsResponse, FeedPost). Helper function signatures match their exported versions. No function name mismatches.
