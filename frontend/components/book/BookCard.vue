<script setup lang="ts">
import { ShoppingBag, Star } from "lucide-vue-next";
import { Button } from "~/components/ui/button";
import { useCartStore } from "~/stores/cart";
import { stockActions, type StockActions } from "~/utils/stock";
import type { Book } from "~/types/book";

const props = defineProps<{
  book: Book;
  actions: StockActions;
  flash: (message: string) => void;
}>();

const emit = defineEmits<{
  borrow: [];
}>();

const cart = useCartStore();

function onBorrow() {
  emit("borrow");
  props.flash(`${props.book.title} borrowed for 21 days.`);
}

function onBuy() {
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
    <p class="text-xs text-muted-foreground">{{ book.author }}</p>
    <div class="mt-1 flex items-center gap-1 text-[10px] text-primary">
      <Star class="size-3 fill-current" /> {{ book.avgRating.toFixed(2) }}
    </div>
    <div class="mt-3 flex gap-1">
      <template v-if="actions.isBorrowed">
        <Button size="sm" variant="archival" disabled>Returning</Button>
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
</template>
