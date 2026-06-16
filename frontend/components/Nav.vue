<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { ArrowLeft, Search, ShoppingBag } from "lucide-vue-next";
import { Button } from "~/components/ui/button";
import { useCartStore } from "~/stores/cart";

const query = defineModel<string>("query", { default: "" });
const cart = useCartStore();
const router = useRouter();

const props = withDefaults(
  defineProps<{
    mode?: "feed" | "book" | "cart";
  }>(),
  {
    mode: "feed",
  },
);

const searchInput = ref<HTMLInputElement | null>(null);

function onKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    searchInput.value?.focus();
  }
}

onMounted(() => {
  document.addEventListener("keydown", onKeydown);
});
onUnmounted(() => {
  document.removeEventListener("keydown", onKeydown);
});
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
          class="font-serif text-xl font-bold italic tracking-tight text-primary"
        >
          <NuxtLink to="/">Read in Peace</NuxtLink>
        </button>
        <Button v-else as-child variant="archivalGhost">
          <NuxtLink to="/feed" class="flex gap-2 items-center">
            <ArrowLeft />
            <span>
              {{ mode === "book" ? "Back to the stacks" : "Continue browsing" }}
            </span>
          </NuxtLink>
        </Button>
      </div>

      <!-- Center: Search -->
      <div class="hidden flex-1 m-auto max-w-3xl sm:block"
      >
        <label class="relative">
          <span class="sr-only">Search books</span>
          <Search
            class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            ref="searchInput"
            v-model="query"
            placeholder="Search titles, authors..."
            class="w-full rounded-sm border-0 bg-input py-2 pl-9 pr-14 text-sm placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
          />
          <kbd
            class="absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-sm border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:flex"
          >
            <span>⌘</span>K
          </kbd>
        </label>
      </div>

      <!-- Right: Cart + Profile -->
      <div
        :class="
          mode === 'feed'
            ? 'flex shrink-0 items-center gap-3'
            : 'ml-auto flex shrink-0 items-center gap-3'
        "
      >
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

        <!-- Profile -->
        <Button
          size="icon"
          variant="archival"
          aria-label="Open reader profile"
          class="rounded-full text-xs italic"
        >
          JS
        </Button>
      </div>
    </div>
  </nav>
</template>
