<script setup lang="ts">
import { BookOpen, Check, ShoppingBag, ShoppingCart } from "lucide-vue-next";
import { Button } from "~/components/ui/button";
import { storeToRefs } from "pinia";
import { useCartStore } from "~/stores/cart";
import { useAuthStore } from "~/stores/auth";
import { useMembershipStore } from "~/stores/membership";
import { useBookStatusStore } from "~/stores/bookStatus";
import { useBorrows } from "~/composables/useBorrows";
import { dueInText } from "~/utils/dueDate";
import type { Book } from "~/types/book";

const props = defineProps<{
  book: Book;
  bookId: string;
  flash: (message: string) => void;
}>();

const cart = useCartStore();
const auth = useAuthStore();
const membership = useMembershipStore();
const store = useBookStatusStore();
const { borrowedSlugs, purchasedCounts } = storeToRefs(store);
const { borrow } = store;
const purchasing = shallowRef(false);

const isBorrowed = computed(() => borrowedSlugs.value.has(props.book.slug));
const ownedCount = computed(() => purchasedCounts.value.get(props.bookId) ?? 0);

const borrowDuration = computed(() => {
  const plan = membership.membership?.plan ?? "free";
  switch (plan) {
    case "archivist":
      return "Borrow for 1 month";
    case "curator":
      return "Borrow for 2 weeks";
    default:
      return "Borrow for 7 days";
  }
});

const borrowList = useBorrows();
const activeLoan = computed(() =>
  borrowList.borrows.value.find((l) => l.bookId === props.bookId),
);

onMounted(() => {
  if (auth.signedIn) {
    borrowList.fetchBorrows(1);
  }
});

async function borrowBookAction() {
  if (!auth.signedIn) {
    auth.openAuthModal(() => {
      void borrowBookAction();
    });
    return;
  }
  try {
    await borrow(props.bookId, props.book.slug);
    props.flash(`${props.book.title} is now on your desk.`);
  } catch (e: any) {
    if (e?.status === 401) {
      auth.openAuthModal(() => {
        void borrowBookAction();
      });
    } else {
      props.flash(e?.data?.message || "Could not borrow the book.");
    }
  }
}

async function buyNow() {
  if (!auth.signedIn) {
    auth.openAuthModal(() => {
      void buyNow();
    });
    return;
  }
  if (ownedCount.value > 0) {
    const ok = window.confirm(
      `You already own ${ownedCount.value} cop${ownedCount.value > 1 ? "ies" : "y"}. Are you sure you want to buy more?`,
    );
    if (!ok) return;
  }

  purchasing.value = true;

  try {
    const res = await $fetch<{ url: string }>(
      `/api/books/${props.bookId}/create-checkout-session`,
      { method: "POST" },
    );
    await navigateTo(res.url, { external: true });
  } catch (e: any) {
    if (e?.status === 401) {
      auth.openAuthModal(() => {
        void buyNow();
      });
    } else {
      props.flash(e?.data?.message || "Could not start checkout.");
    }
  } finally {
    purchasing.value = false;
  }
}

function addToCart() {
  cart.addItem({
    id: props.bookId,
    title: props.book.title,
    author: props.book.author,
    price: Number(props.book.price),
    cover: props.book.cover,
    crop: props.book.crop,
    stock: props.book.inStock,
  });
  props.flash(`${props.book.title} added to your basket.`);
}
</script>

<template>
  <aside class="self-center border border-border bg-card p-6 shadow-sm">
    <p
      class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
    >
      Borrowing status
    </p>
    <div class="mt-4 flex items-baseline gap-3">
      <span
        :class="`size-2 rounded-full ${book.inStock > 0 ? 'bg-primary' : 'bg-muted-foreground'}`"
      />
      <div>
        <p class="font-medium">
          {{
            isBorrowed
              ? "On your desk"
              : book.inStock > 0
                ? "Available now"
                : "Currently checked out"
          }}
        </p>
        <p class="mt-1 text-xs leading-5 text-muted-foreground">
          {{
            isBorrowed && activeLoan
              ? dueInText(activeLoan.dueAt)
              : book.inStock > 0
                ? `${book.inStock} ${book.inStock === 1 ? "copy" : "copies"} ready to borrow`
                : "Join the waitlist to be notified"
          }}
        </p>
      </div>
    </div>
    <Button
      class="mt-6 w-full"
      variant="archival"
      :disabled="isBorrowed || book.inStock < 1"
      @click="borrowBookAction"
    >
      <BookOpen />
      {{
        isBorrowed ? "Borrowed" : borrowDuration
      }}
    </Button>
    <div
      v-if="isBorrowed"
      class="mt-3 flex items-center gap-2 bg-accent px-3 py-2 text-xs text-accent-foreground"
    >
      <Check class="size-4" /> Loan confirmed
    </div>

    <div class="my-6 border-t border-border" />

    <p
      class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
    >
      Keep a copy
    </p>
    <p class="mt-2 font-serif text-3xl font-bold">${{ book.price }}</p>
    <p class="mt-1 text-xs text-muted-foreground">
      Hardcover &middot; Ships in 2&ndash;3 days
    </p>
    <p v-if="ownedCount > 0" class="mt-1 text-xs text-muted-foreground">
      You own {{ ownedCount }} cop{{ ownedCount > 1 ? "ies" : "y" }}
    </p>
    <p
      v-if="book.inStock > 0 && book.inStock <= 3"
      class="mt-1 text-xs text-muted-foreground"
    >
      Only {{ book.inStock }} cop{{ book.inStock > 1 ? "ies" : "y" }} left
    </p>
    <Button
      class="mt-4 w-full"
      variant="archival"
      :disabled="purchasing || book.inStock <= 1"
      @click="buyNow"
    >
      <ShoppingBag />
      {{
        purchasing
          ? "Redirecting..."
          : book.inStock <= 1
            ? "Out of stock"
            : "Buy now"
      }}
    </Button>
    <Button
      class="mt-2 w-full"
      variant="archivalOutline"
      :disabled="book.inStock <= 1"
      @click="addToCart"
    >
      <ShoppingCart /> Add to cart
    </Button>
  </aside>
</template>
