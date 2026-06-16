<script setup lang="ts">
import {
  ArrowLeft, Minus, Plus, ShoppingCart, Trash2,
} from 'lucide-vue-next';
import { Button } from '~/components/ui/button';
import { useCartStore } from '~/stores/cart';

definePageMeta({
  title: 'Your Cart — Read in Pace',
  description: 'Review the books in your cart.',
});

const cart = useCartStore();
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <header class="border-b border-border bg-background/90">
      <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <NuxtLink to="/home" class="font-serif text-xl font-bold italic text-primary">Read in Pace</NuxtLink>
        <Button as-child variant="archivalGhost">
          <NuxtLink to="/home"><ArrowLeft /> Continue browsing</NuxtLink>
        </Button>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-10 md:px-6 lg:py-14">
      <div class="border-b border-border pb-5">
        <p class="font-mono text-[10px] uppercase tracking-widest text-primary">The book bag</p>
        <h1 class="mt-2 font-serif text-4xl font-bold md:text-5xl">Your cart</h1>
        <p class="mt-2 text-sm text-muted-foreground">{{ cart.itemCount }} {{ cart.itemCount === 1 ? 'volume' : 'volumes' }} selected</p>
      </div>

      <div v-if="cart.isEmpty" class="flex flex-col items-center py-24 text-center">
        <ShoppingCart class="size-10 text-muted-foreground" />
        <h2 class="mt-5 font-serif text-2xl">Your book bag is empty.</h2>
        <p class="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Browse the stacks and keep a permanent copy of something worth returning to.</p>
        <Button as-child variant="archival" class="mt-6">
          <NuxtLink to="/home">Explore the library</NuxtLink>
        </Button>
      </div>

      <div v-else class="grid gap-12 py-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section class="divide-y divide-border">
          <article v-for="item in cart.items" :key="item.id" class="flex gap-5 py-6 first:pt-0">
            <CoverImage :crop="item.crop" :src="item.cover" :alt="`${item.title} book cover`" class="h-36 w-24 shrink-0 shadow-md" />
            <div class="flex min-w-0 flex-1 flex-col justify-between">
              <div>
                <h2 class="font-serif text-xl font-bold">{{ item.title }}</h2>
                <p class="mt-1 text-sm italic text-muted-foreground">by {{ item.author }}</p>
                <p class="mt-3 font-mono text-xs text-primary">${{ item.price.toFixed(2) }}</p>
              </div>
              <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-center border border-border">
                  <Button size="icon" variant="archivalGhost" :aria-label="`Decrease ${item.title} quantity`" @click="cart.setQuantity(item.id, item.quantity - 1)"><Minus /></Button>
                  <span class="w-8 text-center font-mono text-xs">{{ item.quantity }}</span>
                  <Button size="icon" variant="archivalGhost" :aria-label="`Increase ${item.title} quantity`" @click="cart.setQuantity(item.id, item.quantity + 1)"><Plus /></Button>
                </div>
                <Button size="sm" variant="archivalGhost" @click="cart.removeItem(item.id)"><Trash2 /> Remove</Button>
              </div>
            </div>
          </article>
        </section>

        <aside class="h-fit border border-border bg-card p-6 lg:sticky lg:top-8">
          <p class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Order summary</p>
          <div class="mt-5 flex justify-between border-b border-border pb-5 text-sm">
            <span>Subtotal</span>
            <strong>${{ cart.subtotal.toFixed(2) }}</strong>
          </div>
          <div class="flex justify-between border-b border-border py-5 text-sm">
            <span>Shipping</span>
            <span class="text-muted-foreground">Calculated at checkout</span>
          </div>
          <div class="flex items-end justify-between pt-5">
            <span class="font-serif text-lg">Estimated total</span>
            <strong class="font-serif text-3xl">${{ cart.subtotal.toFixed(2) }}</strong>
          </div>
          <Button class="mt-6 w-full" variant="archival" @click="cart.checkout?.()">Proceed to checkout</Button>
          <p class="mt-3 text-center text-[11px] leading-5 text-muted-foreground">Secure checkout will be available when payments are enabled.</p>
        </aside>
      </div>
    </main>
  </div>
</template>
