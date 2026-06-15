<script setup lang="ts">
import { ArrowLeft, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-vue-next';
import { useCartStore } from '~/stores/cart';
import { computeDiscount } from '~/utils/discount';

const cartStore = useCartStore();
const breakdown = computed(() => computeDiscount(cartStore.items));

function formatPrice(amount: number): string {
  return '$' + (amount / 100).toFixed(2);
}

definePageMeta({
  layout: 'cart',
  title: 'Your Cart — Read in Pace',
  description: 'Review the books in your cart before checkout.',
});
</script>

<template>
  <header class="border-b border-border bg-background/90">
    <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
      <NuxtLink to="/home" class="font-serif text-xl font-bold italic text-primary">
        Read in Pace
      </NuxtLink>
      <NuxtLink
        to="/explore"
        class="inline-flex items-center gap-1 rounded-sm bg-transparent text-muted-foreground shadow-none transition-colors hover:text-primary text-sm h-9 px-4 py-2"
      >
        <ArrowLeft class="h-4 w-4" /> Continue browsing
      </NuxtLink>
    </div>
  </header>

  <main class="mx-auto max-w-6xl px-4 py-10 md:px-6 lg:py-14">
    <div class="border-b border-border pb-5">
      <p class="font-mono text-[10px] uppercase tracking-widest text-primary">The book bag</p>
      <h1 class="mt-2 font-serif text-4xl font-bold md:text-5xl">Your cart</h1>
      <p class="mt-2 text-sm text-muted-foreground">
        {{ cartStore.itemCount }} {{ cartStore.itemCount === 1 ? 'volume' : 'volumes' }} selected
      </p>
    </div>

    <template v-if="cartStore.isEmpty">
      <section class="flex flex-col items-center py-24 text-center">
        <ShoppingCart class="h-10 w-10 text-muted-foreground" />
        <h2 class="mt-5 font-serif text-2xl">Your book bag is empty.</h2>
        <p class="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          Browse the stacks and keep a permanent copy of something worth returning to.
        </p>
        <NuxtLink
          to="/explore"
          class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm bg-foreground text-background shadow-none hover:bg-primary text-sm font-medium h-9 px-4 py-2 mt-6"
        >
          Explore the library
        </NuxtLink>
      </section>
    </template>

    <div v-else class="grid gap-12 py-10 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section class="divide-y divide-border">
        <article
          v-for="item in cartStore.items"
          :key="item.bookId"
          class="flex gap-5 py-6 first:pt-0"
        >
          <NuxtLink :to="`/book/${item.bookId}`" class="shrink-0">
            <div :class="`cover-crop cover-${item.crop}`" class="h-36 w-24 overflow-hidden shadow-md">
              <img :src="item.cover" :alt="item.title" />
            </div>
          </NuxtLink>
          <div class="flex min-w-0 flex-1 flex-col justify-between">
            <div>
              <NuxtLink
                :to="`/book/${item.bookId}`"
                class="font-serif text-xl font-bold transition-colors hover:text-primary"
              >
                {{ item.title }}
              </NuxtLink>
              <p class="mt-1 text-sm italic text-muted-foreground">by {{ item.author }}</p>
            </div>
            <div class="flex items-center gap-4">
              <span class="font-semibold">{{ formatPrice(item.price) }}</span>
              <div class="flex items-center gap-1">
                <Button
                  variant="archivalGhost"
                  size="icon"
                  class="h-7 w-7"
                  @click="cartStore.decrementQuantity(item.bookId)"
                >
                  <Minus class="h-3 w-3" />
                </Button>
                <span class="w-6 text-center text-sm font-mono">{{ item.quantity }}</span>
                <Button
                  variant="archivalGhost"
                  size="icon"
                  class="h-7 w-7"
                  @click="cartStore.incrementQuantity(item.bookId)"
                >
                  <Plus class="h-3 w-3" />
                </Button>
              </div>
              <Button
                variant="archivalGhost"
                size="sm"
                class="text-destructive hover:text-destructive"
                @click="cartStore.removeItem(item.bookId)"
              >
                <Trash2 class="h-3 w-3 mr-1" /> Remove
              </Button>
            </div>
          </div>
        </article>
      </section>

      <aside class="lg:sticky lg:top-24 lg:self-start">
        <div class="rounded-sm border border-border bg-card p-5 shadow-sm">
          <h3 class="mb-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Order Summary
          </h3>
          <div class="space-y-2 text-sm">
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
          <div class="mt-4 border-t border-border pt-4 flex justify-between font-semibold text-base">
            <span>Total</span>
            <span>{{ formatPrice(breakdown.total) }}</span>
          </div>
          <Button
            variant="archival"
            class="mt-4 w-full py-3"
            @click="cartStore.checkout()"
          >
            Proceed to Checkout — {{ formatPrice(breakdown.total) }}
          </Button>
        </div>
      </aside>
    </div>
  </main>
</template>
