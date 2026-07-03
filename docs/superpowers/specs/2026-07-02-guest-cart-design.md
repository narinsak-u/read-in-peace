# Guest Cart Design

**Date:** 2026-07-02

## Summary

Add explicit guest→authenticated cart transfer to the existing client-side cart. When an unauthenticated user adds items, they're saved in localStorage. On login, those items merge into the Pinia cart store and the guest storage is cleared. Cart persists on page reload (already works via existing `hydrateFromStorage`). On logout, cart stays as-is.

## Scope

One file changed: `frontend/stores/cart.ts`. ~20 lines added.

## Architecture

```
Guest adds items → items stored in localStorage (read-in-peace-cart key)
                                                      │
User logs in (auth.signedIn flips false→true)          │
    ┌──────────────────────────────────────────────────┘
    ▼
watch in cart store fires → merge guest items into items[]
                           → localStorage.removeItem(STORAGE_KEY)
                           → existing watch(items, persist) saves merged state
```

No backend changes. No new files. No new dependencies.

## Auth transition detection

The cart store already imports `useAuthStore` (used in `checkout()`). Add a second watch on `auth.signedIn`:

```typescript
watch(() => auth.signedIn, (now, prev) => {
  if (now && !prev) {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const guestItems: CartItem[] = JSON.parse(raw);
        items.value = mergeGuestCart(items.value, guestItems);
      } catch {
        // Malformed localStorage — ignore
      }
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}, { immediate: true });
```

## Merge strategy

`mergeGuestCart(existing: CartItem[], guest: CartItem[]): CartItem[]`

For each guest item:
- If `id` already exists in `existing` → keep the higher quantity
- If `id` doesn't exist → append
- Existing items not in guest items → keep unchanged

This is a pure function (no side effects, no store access) — easily testable if needed later.

```typescript
function mergeGuestCart(existing: CartItem[], guest: CartItem[]): CartItem[] {
  const map = new Map(existing.map((item) => [item.id, item]));
  for (const guestItem of guest) {
    const existingItem = map.get(guestItem.id);
    if (existingItem) {
      existingItem.quantity = Math.max(existingItem.quantity, guestItem.quantity);
    } else {
      map.set(guestItem.id, guestItem);
    }
  }
  return Array.from(map.values());
}
```

## Edge cases

| Scenario | Behavior |
|---|---|
| No guest items on login | No-op — `localStorage.getItem` returns null |
| Malformed localStorage JSON | `try/catch` silently ignores, storage cleared |
| Guest item already in store | Quantity merged (higher wins) |
| Logout | Cart stays in store, no change |
| Page reload | `hydrateFromStorage()` at store init restores from localStorage |
| Auth modal → checkout | Unchanged — retry callback fires `checkout()`, cart still has items |

## Testing

Manual verification checklist:
1. As guest, add Book A and Book B to cart
2. Reload page → items still displayed
3. Log in → items still in cart, localStorage key cleared
4. Add Book C, log out, log back in as different user → Book C still in cart
5. As guest, add Book A at qty 1. Add Book A again → qty 2. Log in → qty 2 preserved
6. Checkout flow: guest adds items → click checkout → auth modal → login → checkout proceeds
