<script setup lang="ts">
import { ShoppingBag } from 'lucide-vue-next';
import { useCartStore } from '~/stores/cart';

const cartStore = useCartStore();
</script>

<template>
  <button
    @click="cartStore.toggleDrawer()"
    class="relative flex h-9 w-9 items-center cursor-pointer justify-center rounded-full text-muted-foreground ring-1 ring-border transition-all duration-200 hover:bg-muted hover:text-foreground"
    aria-label="Open cart"
  >
    <ShoppingBag class="h-4 w-4" />
    <span
      v-if="cartStore.itemCount > 0"
      class="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground"
    >
      {{ cartStore.itemCount }}
    </span>
  </button>
</template>
