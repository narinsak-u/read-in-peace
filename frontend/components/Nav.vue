<script setup lang="ts">
import { ArrowLeft, Library, ShoppingBag } from "lucide-vue-next";
import { Button } from "~/components/ui/button";
import { buttonVariants } from "~/components/ui/button/variants";
import { useCartStore } from "~/stores/cart";

const query = defineModel<string>("query", { default: "" });
const cart = useCartStore();

const props = withDefaults(
  defineProps<{
    mode?: "feed" | "book" | "cart";
  }>(),
  { mode: "feed" },
);
</script>

<template>
  <nav
    aria-label="Primary navigation"
    class="sticky top-0 z-40 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-md md:px-6"
  >
    <div class="mx-auto flex max-w-7xl items-center gap-4">
      <!-- Left: Logo (feed) or back link (book/cart) -->
      <div class="shrink-0">
        <button
          v-if="mode === 'feed'"
          type="button"
          class="font-display text-xl tracking-tight font-bold md:px-6"
        >
          <NuxtLink to="/">
            Read<span class="text-primary"> in </span>Peace
          </NuxtLink>
        </button>
        <NuxtLink
          v-else
          to="/feed"
          :class="
            buttonVariants({ variant: 'archivalGhost' }) +
            ' flex gap-2 items-center'
          "
        >
          <ArrowLeft />
          <span>
            {{ mode === "book" ? "Back to the stacks" : "Continue browsing" }}
          </span>
        </NuxtLink>
      </div>

      <!-- Center: Searchbar -->
      <SearchBar v-model:query="query" />

      <div
        :class="
          mode === 'feed'
            ? 'flex shrink-0 items-center gap-3 md:px-6'
            : 'ml-auto flex shrink-0 items-center gap-3 md:px-6'
        "
      >
        <NuxtLink
          to="/dashboard"
          :class="buttonVariants({ variant: 'archivalGhost', size: 'icon' })"
          aria-label="My Library"
        >
          <Library />
        </NuxtLink>

        <Button
          variant="archivalGhost"
          size="icon"
          :aria-label="`Cart with ${cart.itemCount} items`"
          class="relative"
        >
          <NuxtLink to="/cart">
            <ShoppingBag />
            <span
              v-if="cart.itemCount > 0"
              class="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[8px] text-primary-foreground"
            >
              {{ cart.itemCount }}
            </span>
          </NuxtLink>
        </Button>

        <ProfileDropdown />
      </div>
    </div>
  </nav>
</template>
