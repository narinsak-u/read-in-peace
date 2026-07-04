<script setup lang="ts">
import { ShoppingBag, Star, X } from "lucide-vue-next";
import { Button } from "~/components/ui/button";
import { storeToRefs } from "pinia";
import { useCartStore } from "~/stores/cart";
import { useBookStatusStore } from "~/stores/bookStatus";
import { stockActions, type StockActions } from "~/utils/stock";
import type { Book } from "~/types/book";

const props = defineProps<{
  book: Book;
  actions: StockActions;
  flash: (message: string) => void;
  purchasedAt?: string;
}>();

const emit = defineEmits<{
  borrow: [];
  return: [];
}>();

const cart = useCartStore();
const { purchasedCounts } = storeToRefs(useBookStatusStore());
const ownedCount = computed(
  () => purchasedCounts.value.get(props.book.id) ?? 0,
);

const showConfirmDialog = shallowRef(false);

function onBorrow() {
  emit("borrow");
}

function onReturn() {
  emit("return");
}

function onBuy() {
  if (ownedCount.value > 0) {
    showConfirmDialog.value = true;
    return;
  }
  addToCart();
}

function confirmBuy() {
  showConfirmDialog.value = false;
  addToCart();
}

function addToCart() {
  cart.addItem({
    id: props.book.id,
    title: props.book.title,
    author: props.book.author,
    price: Number(props.book.price),
    cover: props.book.cover,
    crop: props.book.crop,
  });
  props.flash(`${props.book.title} added to your cart.`);
}
</script>

<template>
  <article class="group">
    <NuxtLink :to="`/book/${book.slug}`" :aria-label="`View ${book.title}`">
      <CoverImage
        :crop="book.crop"
        :src="book.cover"
        class="mb-3 aspect-2/3 shadow-md transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl"
      />
    </NuxtLink>
    <h3
      class="font-serif text-sm font-bold transition-colors group-hover:text-primary"
    >
      <NuxtLink :to="`/book/${book.slug}`">{{ book.title }}</NuxtLink>
    </h3>
    <p class="text-xs text-muted-foreground my-1">{{ book.author }}</p>
    <div class="mt-1 flex items-center gap-1 text-[10px] text-primary">
      <Star class="size-3 fill-current" /> {{ book.avgRating.toFixed(2) }}
      <span
        v-if="purchasedAt"
        class="ml-auto font-mono text-muted-foreground"
      >
        Purchased {{ new Date(purchasedAt).toLocaleDateString() }}
      </span>
      <span
        v-else-if="book.inStock > 0"
        class="ml-auto text-muted-foreground"
      >
        {{ book.inStock }} cop{{ book.inStock > 1 ? "ies" : "y" }} left
      </span>
    </div>
    <div class="mt-3 flex gap-1">
      <template v-if="actions.isBorrowed">
        <Button size="sm" variant="archival" @click="onReturn">Return</Button>
      </template>
      <template v-else-if="actions.canBorrow">
        <Button size="sm" variant="archival" @click="onBorrow">Borrow</Button>
      </template>
      <template v-else>
        <Button size="sm" variant="archival" disabled>Unavailable</Button>
      </template>
      <Button
        v-if="actions.canBuy"
        size="icon"
        variant="archivalGhost"
        :aria-label="`Buy ${book.title}`"
        @click="onBuy"
      >
        <ShoppingBag />
      </Button>
    </div>
  </article>

  <!-- Buy confirmation dialog -->
  <div
    v-if="showConfirmDialog"
    class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    @click.self="showConfirmDialog = false"
  >
    <div class="mx-4 w-full max-w-sm rounded-sm border border-border bg-card p-6 shadow-lg">
      <div class="flex items-start justify-between">
        <p class="font-serif text-lg font-bold">Already in your library</p>
        <button class="cursor-pointer text-muted-foreground hover:text-foreground" @click="showConfirmDialog = false">
          <X class="size-4" />
        </button>
      </div>
      <p class="mt-2 text-sm text-muted-foreground">
        You already own {{ ownedCount }} cop{{ ownedCount > 1 ? "ies" : "y" }} of <strong>{{ book.title }}</strong>. Are you sure you want to buy more?
      </p>
      <div class="mt-6 flex gap-3">
        <Button variant="archival" class="flex-1" @click="confirmBuy">
          Yes, Add More
        </Button>
        <Button variant="archivalOutline" class="flex-1" @click="showConfirmDialog = false">
          Cancel
        </Button>
      </div>
    </div>
  </div>
</template>
