<script setup lang="ts">
import { BookOpen, Check, ShoppingBag } from 'lucide-vue-next';
import { Button } from '~/components/ui/button';
import { useCartStore } from '~/stores/cart';
import type { Book } from '~/types/book';

const props = defineProps<{
  book: Book;
  bookId: string;
  flash: (message: string) => void;
}>();

const cart = useCartStore();
const borrowed = ref(false);
</script>

<template>
  <aside class="self-center border border-border bg-card p-6 shadow-sm">
    <p class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
      Borrowing status
    </p>
    <div class="mt-4 flex items-start gap-3">
      <span
        :class="`mt-1 size-2 rounded-full ${book.inStock > 0 ? 'bg-primary' : 'bg-muted-foreground'}`"
      />
      <div>
        <p class="font-medium">
          {{
            borrowed
              ? 'On your desk'
              : book.inStock > 0
                ? 'Available now'
                : 'Currently checked out'
          }}
        </p>
        <p class="mt-1 text-xs leading-5 text-muted-foreground">
          {{
            borrowed
              ? 'Due July 5, 2026 \u00B7 21-day loan'
              : book.inStock > 0
                ? `${book.inStock} ${book.inStock === 1 ? 'copy' : 'copies'} ready to borrow`
                : 'Join the waitlist to be notified'
          }}
        </p>
      </div>
    </div>
    <Button
      class="mt-6 w-full"
      variant="archival"
      :disabled="borrowed"
      @click="
        () => {
          borrowed = true;
          flash(`${book.title} is now on your desk.`);
        }
      "
    >
      <BookOpen />
      {{
        borrowed
          ? 'Borrowed'
          : book.inStock > 0
            ? 'Borrow for 21 days'
            : 'Join waitlist'
      }}
    </Button>
    <div
      v-if="borrowed"
      class="mt-3 flex items-center gap-2 bg-accent px-3 py-2 text-xs text-accent-foreground"
    >
      <Check class="size-4" /> Loan confirmed
    </div>
    <div class="my-6 border-t border-border" />
    <p class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
      Keep a copy
    </p>
    <p class="mt-2 font-serif text-3xl font-bold">${{ book.price }}</p>
    <p class="mt-1 text-xs text-muted-foreground">
      Hardcover · Ships in 2–3 days
    </p>
    <Button
      class="mt-4 w-full"
      variant="archivalOutline"
      @click="
        () => {
          cart.addItem({
            id: bookId,
            title: book.title,
            author: book.author,
            price: Number(book.price),
            cover: book.cover,
            crop: book.crop,
          });
          flash(`${book.title} added to your basket.`);
        }
      "
    >
      <ShoppingBag /> Purchase copy
    </Button>
  </aside>
</template>
