# Guest Cart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add explicit guest→authenticated cart transfer on login.

**Architecture:** Single-file change to `frontend/stores/cart.ts`. Add a pure `mergeGuestCart` function and a `watch` on `auth.signedIn` that merges guest localStorage items into the store on login, then clears the guest storage key.

**Tech Stack:** Vue 3, Pinia, TypeScript — no new dependencies.

---

### Task 1: Add guest cart transfer logic

**Files:**
- Modify: `frontend/stores/cart.ts` (lines 97-121 area — after `clear()` and before `hydrateFromStorage`)

- [ ] **Step 1: Add `mergeGuestCart` pure function**

Insert this function **after the `STORAGE_KEY` constant** (line 5) and **before `export const useCartStore`** (line 18):

```typescript
function mergeGuestCart(
  existing: CartItem[],
  guest: CartItem[],
): CartItem[] {
  const map = new Map(existing.map((item) => [item.id, item]));
  for (const guestItem of guest) {
    const existingItem = map.get(guestItem.id);
    if (existingItem) {
      existingItem.quantity = Math.max(
        existingItem.quantity,
        guestItem.quantity,
      );
    } else {
      map.set(guestItem.id, guestItem);
    }
  }
  return Array.from(map.values());
}
```

- [ ] **Step 2: Add auth-sign-in watch inside the store**

Insert this block **after the existing `watch(items, persist, { deep: true })`** at line 121 and **before the `return` statement** at line 123:

```typescript
const auth = useAuthStore();

watch(
  () => auth.signedIn,
  (now, prev) => {
    if (now && !prev) {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          const guestItems: CartItem[] = JSON.parse(raw);
          items.value = mergeGuestCart(items.value, guestItems);
        } catch {
          // malformed localStorage — ignore
        }
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  },
  { immediate: true },
);
```

- [ ] **Step 3: Verify the file parses correctly**

Run: `node -e "require('esbuild').buildSync({ entryPoints: ['frontend/stores/cart.ts'], format: 'esm', platform: 'browser', logLevel: 'error' })"` or just check there are no TypeScript errors in the editor.

Note: The frontend has no `npm run build` or lint script configured. At minimum, run `npm run build` from `frontend/` to confirm the Nuxt app compiles:

```bash
# From repo root or frontend/:
npm -w frontend run build
```

Expected: build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/stores/cart.ts
git commit -m "feat: add guest cart merge on login"
```
