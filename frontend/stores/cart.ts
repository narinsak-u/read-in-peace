import { defineStore } from 'pinia';
import { toast } from 'vue-sonner';
import { useAuthStore } from '~/stores/auth';

const STORAGE_KEY = 'read-in-peace-cart';

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

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([]);

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

  function addItem(item: Omit<CartItem, 'quantity'>) {
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
      const res = await $fetch<{ url: string }>('/api/cart/checkout', {
        method: 'POST',
        body: { bookIds: items.value.map((i) => i.id) },
      });
      await navigateTo(res.url, { external: true });
    } catch (e: any) {
      if (e?.statusCode === 401) {
        toast.error('Please sign in to checkout');
      } else if (e?.data?.message) {
        toast.error(e.data.message);
      } else {
        toast.error('Failed to start checkout');
      }
    }
  }

  hydrateFromStorage();
  watch(items, persist, { deep: true });

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
