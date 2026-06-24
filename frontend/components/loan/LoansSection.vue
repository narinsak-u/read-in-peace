<script setup lang="ts">
import { ShoppingBag } from "lucide-vue-next";
import { Button } from "~/components/ui/button";
import { useCartStore } from "~/stores/cart";

interface LoanItem {
  borrowId: string;
  bookId: string;
  bookSlug: string;
  title: string;
  author: string;
  cover: string;
  crop: number | null;
  shelf: string;
  category: string;
  dueAt: string;
  currentPage: number;
  totalPages: number;
  price: string;
  inStock: number;
  avgRating: number;
  ratingsCount: number;
}

const props = defineProps<{
  loans: LoanItem[];
  flash: (message: string) => void;
}>();

const emit = defineEmits<{
  return: [bookId: string, title: string];
  "open-review": [];
}>();

const cart = useCartStore();

function dueLabel(dueAt: string): { text: string; urgent: boolean } {
  const due = new Date(dueAt);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0)
    return { text: `OVERDUE (${Math.abs(diffDays)}D)`, urgent: true };
  if (diffDays === 0) return { text: "DUE TODAY", urgent: true };
  if (diffDays <= 3) return { text: `DUE IN ${diffDays} DAYS`, urgent: true };
  const month = due.toLocaleDateString("en-US", { month: "short" });
  const day = due.getDate();
  return { text: `DUE: ${month.toUpperCase()} ${day}`, urgent: false };
}

function readPercent(current: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((current / total) * 100);
}

function loanByBookId(bookId: string): LoanItem {
  return props.loans.find((l) => l.bookId === bookId)!;
}

function toBook(loan: LoanItem) {
  return {
    id: loan.bookId,
    slug: loan.bookSlug,
    title: loan.title,
    author: loan.author,
    cover: loan.cover,
    crop: loan.crop,
    shelf: loan.shelf,
    avgRating: loan.avgRating,
    ratingsCount: loan.ratingsCount,
    price: loan.price,
    inStock: loan.inStock,
    synopsis: "",
    category: loan.category,
    trending: false,
    isAvailable: true,
    totalPages: loan.totalPages,
    likeCount: 0,
    commentCount: 0,
    year: 0,
    createdBy: "",
    createdAt: "",
    updatedAt: "",
  };
}
</script>

<template>
  <BookListSection
    :books="loans.map(toBook)"
    :subtitle="`${loans.length} items currently on desk`"
  >
    <!-- Featured card -->
    <template #badge="{ book }">
      <span
        :class="`rounded-sm px-2 py-0.5 font-mono text-[10px] ${dueLabel(loanByBookId(book.id).dueAt).urgent ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`"
      >
        {{ dueLabel(loanByBookId(book.id).dueAt).text }}
      </span>
      <span class="font-mono text-[10px] uppercase text-muted-foreground">
        Category: {{ book.category }}
      </span>
    </template>

    <template #extra="{ book }">
      <div class="mb-3 flex items-center gap-2">
        <span class="text-primary text-xs mb-1.5">
          {{ "★".repeat(Math.round(loanByBookId(book.id).avgRating)) }}
          <span class="text-foreground/10">
            {{ "★".repeat(5 - Math.round(loanByBookId(book.id).avgRating)) }}
          </span>
        </span>
        <span class="font-mono text-xs mb-1.5 text-muted-foreground">
          {{ loanByBookId(book.id).avgRating.toFixed(2) }} avg rating
        </span>
      </div>
      <div>
        <div class="h-1.5 w-full overflow-hidden rounded-full bg-foreground/5">
          <div
            class="h-full bg-primary transition-all"
            :style="{
              width: `${readPercent(loanByBookId(book.id).currentPage, loanByBookId(book.id).totalPages)}%`,
            }"
          />
        </div>
        <p class="mt-2 font-mono text-[11px] text-muted-foreground">
          PAGE {{ loanByBookId(book.id).currentPage }} OF
          {{ loanByBookId(book.id).totalPages }} ({{
            readPercent(
              loanByBookId(book.id).currentPage,
              loanByBookId(book.id).totalPages,
            )
          }}%)
        </p>
      </div>
    </template>

    <template #actions="{ book }">
      <Button variant="archival" @click="emit('return', book.id, book.title)">
        Return Book
      </Button>
      <Button variant="archivalOutline" @click="emit('open-review')">
        Write Review
      </Button>
      <Button
        v-if="loanByBookId(book.id).inStock > 1"
        variant="archivalGhost"
        @click="
          () => {
            cart.addItem({
              id: book.id,
              title: book.title,
              author: book.author,
              price: Number(book.price),
              cover: book.cover,
              crop: book.crop,
            });
            flash(`${book.title} added to your cart.`);
          }
        "
      >
        <ShoppingBag /> Buy ${{ book.price }}
      </Button>
    </template>

    <!-- Compact card -->
    <template #compactBadge="{ book }">
      <div class="flex items-center gap-2">
        <span
          :class="`rounded-sm px-2 py-0.5 font-mono text-[10px] ${dueLabel(loanByBookId(book.id).dueAt).urgent ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`"
        >
          {{ dueLabel(loanByBookId(book.id).dueAt).text }}
        </span>
        <span class="font-mono text-[10px] text-primary">
          {{ "★ " + loanByBookId(book.id).avgRating.toFixed(2) }}
        </span>
      </div>
    </template>

    <template #compactActions="{ book }">
      <div class="flex items-center gap-1">
        <Button
          size="sm"
          variant="archivalGhost"
          @click="emit('return', book.id, book.title)"
          >Return</Button
        >
        <Button
          v-if="loanByBookId(book.id).inStock > 1"
          size="sm"
          variant="archivalGhost"
          @click="
            () => {
              cart.addItem({
                id: book.id,
                title: book.title,
                author: book.author,
                price: Number(book.price),
                cover: book.cover,
                crop: book.crop,
              });
              flash(`${book.title} added to your cart.`);
            }
          "
        >
          <ShoppingBag />
        </Button>
      </div>
    </template>
  </BookListSection>

  <div class="mt-8 text-center">
    <Button size="sm" variant="archivalGhost" @click="navigateTo('/dashboard?tab=borrowed')">
      View all borrowed books
    </Button>
  </div>
</template>
