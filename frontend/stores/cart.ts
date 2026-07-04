import { defineStore } from "pinia";
import { useAuthStore } from "~/stores/auth";
import { useFlash } from "~/composables/useFlash";

const STORAGE_KEY = "read-in-peace-cart";

export interface CartItem {
  id: string;
  title: string;
  author: string;
  price: number;
  cover: string;
  crop: number | null;
  quantity: number;
  category?: string;
}

function mergeGuestCart(existing: CartItem[], guest: CartItem[]): CartItem[] {
  const map = new Map(existing.map((item) => [item.id, item]));
  for (const guestItem of guest) {
    const existingItem = map.get(guestItem.id);
    if (existingItem) {
      map.set(existingItem.id, {
        ...existingItem,
        quantity: Math.max(existingItem.quantity, guestItem.quantity),
      });
    } else {
      map.set(guestItem.id, guestItem);
    }
  }
  return Array.from(map.values());
}

function loadInitialItems(): CartItem[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

export const useCartStore = defineStore("cart", () => {
  const items = ref<CartItem[]>(loadInitialItems());
  const { flash } = useFlash();

  const itemCount = computed(() =>
    items.value.reduce((sum, item) => sum + item.quantity, 0),
  );

  const subtotal = computed(() =>
    items.value.reduce((sum, item) => sum + item.price * item.quantity, 0),
  );

  const isEmpty = computed(() => items.value.length === 0);

  function hydrateFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        items.value = JSON.parse(stored);
      }
    } catch {
      // ignore
    }
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.value));
  }

  function addItem(item: Omit<CartItem, "quantity">) {
    const existing = items.value.find((i) => i.id === item.id);
    if (existing) {
      existing.quantity++;
    } else {
      items.value.push({ ...item, quantity: 1 });
    }
    persist();
  }

  function removeItem(id: string) {
    items.value = items.value.filter((i) => i.id !== id);
    persist();
  }

  function setQuantity(id: string, quantity: number) {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    const item = items.value.find((i) => i.id === id);
    if (item) {
      item.quantity = quantity;
    }
    persist();
  }

  function incrementQuantity(id: string) {
    const item = items.value.find((i) => i.id === id);
    if (item) {
      item.quantity++;
      persist();
    }
  }

  function decrementQuantity(id: string) {
    const item = items.value.find((i) => i.id === id);
    if (item && item.quantity > 1) {
      item.quantity--;
    } else {
      items.value = items.value.filter((i) => i.id !== id);
    }
    persist();
  }

  function clear() {
    items.value = [];
    persist();
  }

  async function checkout() {
    const auth = useAuthStore();
    if (!auth.signedIn) {
      auth.openAuthModal(() => checkout());
      return;
    }
    try {
      const res = await $fetch<{ url: string }>("/api/cart/checkout", {
        method: "POST",
        body: { bookIds: items.value.map((i) => i.id) },
      });
      await navigateTo(res.url, { external: true });
    } catch (e: any) {
      if (e?.statusCode === 401) {
        flash("Please sign in to checkout");
      } else if (e?.data?.message) {
        flash(e.data.message);
      } else {
        flash("Failed to start checkout");
      }
    }
  }

  watch(items, persist, { deep: true });

  const auth = useAuthStore();

  watch(
    () => auth.signedIn,
    (now, prev) => {
      if (now && prev === false) {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          try {
            const guestItems: CartItem[] = JSON.parse(raw);
            items.value = mergeGuestCart(items.value, guestItems);
          } catch {
            // malformed localStorage — ignore
          }
          // Persist watcher handles writing; no need to delete the shared key.
        }
      }
    },
    { immediate: true },
  );

  return {
    items,
    itemCount,
    subtotal,
    isEmpty,
    addItem,
    removeItem,
    setQuantity,
    incrementQuantity,
    decrementQuantity,
    clear,
    checkout,
    hydrateFromStorage,
  };
});
