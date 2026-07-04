<script setup lang="ts">
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-vue-next";
import { Button } from "~/components/ui/button";
import { buttonVariants } from "~/components/ui/button/variants";
import { storeToRefs } from "pinia";
import { useCartStore } from "~/stores/cart";
import { useBookStatusStore } from "~/stores/bookStatus";
import { useMembershipStore } from "~/stores/membership";
import { computeDiscount } from "~/utils/discount";
import { plans } from "~/utils/plans";

definePageMeta({
  title: "Your Cart — Read in Peace",
  description: "Review the books in your cart.",
});

const cart = useCartStore();
const membershipStore = useMembershipStore();
const { purchasedCounts } = storeToRefs(useBookStatusStore());

const planDiscountPct = computed(() => {
  const plan = membershipStore.membership?.plan ?? "free";
  const pct: Record<string, number> = { free: 5, curator: 15, archivist: 25 };
  return pct[plan] ?? 5;
});

const planName = computed(() => {
  const plan = membershipStore.membership?.plan;
  return plans.find((p) => p.id === plan)?.name ?? "Free";
});

const discount = computed(() =>
  computeDiscount(cart.items, planDiscountPct.value),
);
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <Nav mode="cart" />

    <main class="mx-auto max-w-6xl px-4 py-10 md:px-6 lg:py-14">
      <div class="border-b border-border pb-5">
        <p class="font-mono text-[10px] uppercase tracking-widest text-primary">
          The book bag
        </p>
        <h1 class="mt-2 font-serif text-4xl font-bold md:text-5xl">
          Your cart
        </h1>
        <p class="mt-2 text-sm text-muted-foreground">
          <ClientOnly>
            {{ cart.itemCount }}
            {{ cart.itemCount === 1 ? "volume" : "volumes" }}
            selected
          </ClientOnly>
        </p>
      </div>

      <ClientOnly>
        <div
          v-if="cart.isEmpty"
          class="flex flex-col items-center py-24 text-center"
        >
          <ShoppingCart class="size-10 text-muted-foreground" />
          <h2 class="mt-5 font-serif text-2xl">Your book bag is empty.</h2>
          <p class="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            Browse the stacks and keep a permanent copy of something worth
            returning to.
          </p>
          <NuxtLink
            to="/feed"
            :class="buttonVariants({ variant: 'archival', className: 'mt-6' })"
          >
            Explore the library
          </NuxtLink>
        </div>

        <div
          v-else
          class="grid gap-12 py-10 lg:grid-cols-[minmax(0,1fr)_320px]"
        >
          <!-- item list -->
          <section class="divide-y divide-border">
            <article
              v-for="item in cart.items"
              :key="item.id"
              class="flex gap-5 py-6 first:pt-0"
            >
              <CoverImage
                :crop="item.crop"
                :src="item.cover"
                :alt="`${item.title} book cover`"
                class="w-30 shrink-0 shadow-md object-cover"
              />
              <div class="flex min-w-0 flex-1 flex-col justify-between">
                <div>
                  <h2 class="font-serif text-xl font-bold">
                    <NuxtLink
                      :to="`/book/${item.id}`"
                      class="hover:text-primary"
                      >{{ item.title }}</NuxtLink
                    >
                  </h2>
                  <p class="mt-1 text-sm italic text-muted-foreground">
                    by {{ item.author }}
                  </p>
                  <p class="mt-3 font-mono text-xs text-primary">
                    ${{ item.price.toFixed(2) }}
                  </p>
                  <span
                    v-if="item.stock"
                    class="text-[10px] text-muted-foreground"
                  >
                    Available: {{ item.stock }}
                  </span>
                  <p
                    v-if="(purchasedCounts.get(item.id) ?? 0) > 0"
                    class="mt-3 text-[10px] text-muted-foreground"
                  >
                    You own {{ purchasedCounts.get(item.id) ?? 0 }} cop{{
                      (purchasedCounts.get(item.id) ?? 0) > 1 ? "ies" : "y"
                    }}
                  </p>
                </div>
                <div
                  class="mt-4 flex flex-wrap items-center justify-between gap-3"
                >
                  <div class="flex items-center border border-border">
                    <Button
                      size="icon"
                      variant="archivalGhost"
                      :disabled="item.quantity <= 1"
                      :aria-label="`Decrease ${item.title} quantity`"
                      @click="cart.setQuantity(item.id, item.quantity - 1)"
                    >
                      <Minus />
                    </Button>
                    <span class="w-8 text-center font-mono text-xs">
                      {{ item.quantity }}
                    </span>

                    <!-- at least keep 1 for borrowing -->
                    <Button
                      size="icon"
                      variant="archivalGhost"
                      :disabled="item.quantity >= (item.stock - 1 || Infinity)"
                      :aria-label="`Increase ${item.title} quantity`"
                      @click="cart.setQuantity(item.id, item.quantity + 1)"
                    >
                      <Plus />
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="archivalGhost"
                    @click="cart.removeItem(item.id)"
                  >
                    <Trash2 /> Remove
                  </Button>
                </div>
              </div>
            </article>
          </section>

          <!-- subtotal price -->
          <aside
            class="h-fit border border-border bg-card p-6 lg:sticky lg:top-8"
          >
            <p
              class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
            >
              Order summary
            </p>

            <div class="mt-5 flex justify-between text-sm">
              <span>Subtotal</span>
              <strong>${{ (discount.subtotal / 100).toFixed(2) }}</strong>
            </div>

            <div
              v-if="discount.tierDiscount > 0"
              class="mt-2 flex justify-between text-sm text-muted-foreground"
            >
              <span
                >Bundle ({{ cart.itemCount }} books,
                {{ discount.tierPercent }}%)</span
              >
              <span>-${{ (discount.tierDiscount / 100).toFixed(2) }}</span>
            </div>

            <div
              v-if="discount.categoryBonus > 0"
              class="mt-2 flex justify-between text-sm text-muted-foreground"
            >
              <span>Multi-category bonus</span>
              <span>-${{ (discount.categoryBonus / 100).toFixed(2) }}</span>
            </div>

            <div
              v-if="discount.every100Discount > 0"
              class="mt-2 flex justify-between text-sm text-muted-foreground"
            >
              <span>Every $100 discount</span>
              <span>-${{ (discount.every100Discount / 100).toFixed(2) }}</span>
            </div>

            <div
              v-if="discount.planDiscount > 0"
              class="mt-2 flex justify-between text-sm text-primary"
            >
              <span>{{ planName }} member ({{ planDiscountPct }}%)</span>
              <span>-${{ (discount.planDiscount / 100).toFixed(2) }}</span>
            </div>

            <div
              class="mt-5 flex items-end justify-between border-t border-border pt-5"
            >
              <span class="font-serif text-lg">Estimated total</span>
              <strong class="font-serif text-3xl">
                ${{ (discount.total / 100).toFixed(2) }}
              </strong>
            </div>

            <Button
              class="mt-6 w-full"
              variant="archival"
              @click="cart.checkout()"
            >
              Proceed to checkout
            </Button>
            <p
              class="mt-3 text-center text-[11px] leading-5 text-muted-foreground"
            >
              Secure checkout will be available when payments are enabled.
            </p>
          </aside>
        </div>
      </ClientOnly>
    </main>
  </div>
</template>
