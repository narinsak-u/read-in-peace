<script setup lang="ts">
import { computed } from 'vue';
import { ShoppingBag, X } from 'lucide-vue-next';
import { useCartStore } from '~/stores/cart';
import { computeDiscount } from '~/utils/discount';

const cartStore = useCartStore();
const breakdown = computed(() => computeDiscount(cartStore.items));

function formatPrice(amount: number): string {
  return '$' + (amount / 100).toFixed(2);
}
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="cartStore.drawerOpen" class="fixed inset-0 z-[100] flex">
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/30 backdrop-blur-sm"
          @click="cartStore.closeDrawer()"
        />
        <!-- Panel -->
        <div
          class="absolute right-0 top-0 h-full w-full max-w-md bg-card shadow-xl border-l border-border overflow-y-auto"
        >
          <!-- Header -->
          <div class="flex items-center justify-between p-4 border-b border-border">
            <h2 class="text-lg font-semibold">
              Cart
              <span v-if="cartStore.itemCount > 0" class="text-muted-foreground text-sm font-normal">
                ({{ cartStore.itemCount }} {{ cartStore.itemCount === 1 ? 'item' : 'items' }})
              </span>
            </h2>
            <button
              @click="cartStore.closeDrawer()"
              class="flex h-8 w-8 items-center justify-center rounded-lg cursor-pointer hover:bg-muted transition-colors"
            >
              <X class="h-4 w-4" />
            </button>
          </div>

          <!-- Empty state -->
          <div v-if="cartStore.isEmpty" class="flex flex-col items-center justify-center py-24 px-6 text-center">
            <ShoppingBag class="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p class="font-medium text-muted-foreground">Your cart is empty</p>
            <p class="text-sm text-muted-foreground/60 mt-1">
              Browse books and click "Buy" to add them
            </p>
          </div>

          <!-- Items -->
          <div v-else class="flex flex-col">
            <div class="divide-y divide-border/60">
              <div
                v-for="item in cartStore.items"
                :key="item.bookId"
                class="flex gap-3 p-4"
              >
                <NuxtLink :to="`/book/${item.bookId}`" class="shrink-0">
                  <div
                    :class="`cover-crop cover-${item.crop}`"
                    class="w-12 h-16 overflow-hidden rounded border border-border/60 bg-muted"
                  >
                    <img
                      :src="item.cover"
                      :alt="item.title"
                      class="h-full w-full object-cover"
                    />
                  </div>
                </NuxtLink>
                <div class="flex-1 min-w-0">
                  <NuxtLink
                    :to="`/book/${item.bookId}`"
                    class="text-sm font-medium truncate block hover:text-primary transition-colors"
                  >
                    {{ item.title }}
                  </NuxtLink>
                  <p class="text-xs text-muted-foreground truncate">{{ item.author }}</p>
                  <p class="text-xs text-muted-foreground">{{ item.category }}</p>
                  <div class="flex items-center justify-between mt-1.5">
                    <span class="text-sm font-semibold">{{ formatPrice(item.price) }}</span>
                    <button
                      @click="cartStore.removeItem(item.bookId)"
                      class="text-xs text-destructive/80 hover:text-destructive cursor-pointer transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Discount breakdown -->
            <div class="mx-4 mt-2 p-3 rounded-lg bg-muted/50 border border-border/60">
              <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Order Summary
              </p>
              <div class="space-y-1 text-sm">
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Subtotal ({{ cartStore.itemCount }} items)</span>
                  <span>{{ formatPrice(breakdown.subtotal) }}</span>
                </div>
                <div v-if="breakdown.tierDiscount > 0" class="flex justify-between text-green-600">
                  <span>− {{ breakdown.tierPercent }}% bundle discount</span>
                  <span>−{{ formatPrice(breakdown.tierDiscount) }}</span>
                </div>
                <div v-if="breakdown.categoryBonus > 0" class="flex justify-between text-green-600">
                  <span>− Category bonus</span>
                  <span>−{{ formatPrice(breakdown.categoryBonus) }}</span>
                </div>
                <div v-if="breakdown.every100Discount > 0" class="flex justify-between text-green-600">
                  <span>− Every $100 discount</span>
                  <span>−{{ formatPrice(breakdown.every100Discount) }}</span>
                </div>
              </div>
              <div class="mt-2 pt-2 border-t border-border/60 flex justify-between font-semibold text-base">
                <span>Total</span>
                <span>{{ formatPrice(breakdown.total) }}</span>
              </div>
            </div>

            <!-- Checkout button -->
            <div class="p-4">
              <button
                @click="cartStore.checkout()"
                class="w-full rounded-lg bg-primary py-3 font-medium text-primary-foreground cursor-pointer transition-all duration-200 hover:translate-y-[-1px] hover:shadow-md"
              >
                Proceed to Checkout — {{ formatPrice(breakdown.total) }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition: all 0.25s ease;
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}
.drawer-enter-from > div:last-child,
.drawer-leave-to > div:last-child {
  transform: translateX(100%);
}
.drawer-enter-active > div:last-child,
.drawer-leave-active > div:last-child {
  transition: transform 0.25s ease;
}
</style>
