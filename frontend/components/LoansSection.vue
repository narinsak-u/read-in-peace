<script setup lang="ts">
import { ShoppingBag } from 'lucide-vue-next';
import { Button } from '~/components/ui/button';
import { useCartStore } from '~/stores/cart';

interface LoanItem {
  borrowId: string;
  bookId: string;
  bookSlug: string;
  title: string;
  author: string;
  cover: string;
  crop: number | null;
  shelf: string;
  dueAt: string;
  currentPage: number;
  totalPages: number;
  price: string;
  inStock: number;
}

const props = defineProps<{
  loans: LoanItem[];
  flash: (message: string) => void;
}>();

const emit = defineEmits<{
  return: [slug: string];
  'open-review': [];
}>();

const cart = useCartStore();

function dueLabel(dueAt: string): { text: string; urgent: boolean } {
  const due = new Date(dueAt);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { text: `OVERDUE (${Math.abs(diffDays)}D)`, urgent: true };
  if (diffDays === 0) return { text: 'DUE TODAY', urgent: true };
  if (diffDays <= 3) return { text: `DUE IN ${diffDays} DAYS`, urgent: true };
  const month = due.toLocaleDateString('en-US', { month: 'short' });
  const day = due.getDate();
  return { text: `DUE: ${month.toUpperCase()} ${day}`, urgent: false };
}

function readPercent(current: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((current / total) * 100);
}
</script>

<template>
  <article
    v-for="loan in loans"
    :key="loan.borrowId"
    class="group flex flex-col gap-8 rounded-sm border border-border bg-card p-5 md:flex-row md:p-6"
    :class="{ 'mb-6': loans.length > 1 && loan === loans[0] }"
  >
    <div class="shrink-0 self-center shadow-xl transition-transform duration-500 group-hover:-translate-y-1 md:self-auto">
      <CoverImage :crop="loan.crop" :src="loan.cover" :alt="`${loan.title} book cover`" class="h-[270px] w-[180px]" />
    </div>
    <div class="flex flex-1 flex-col justify-between py-2">
      <div>
        <div class="mb-2 flex flex-wrap items-center gap-2">
          <span
            :class="`rounded-sm px-2 py-0.5 font-mono text-[10px] ${dueLabel(loan.dueAt).urgent ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`"
          >
            {{ dueLabel(loan.dueAt).text }}
          </span>
          <span class="font-mono text-[10px] uppercase text-muted-foreground">Shelf: {{ loan.shelf }}</span>
        </div>
        <h2 class="mb-1 font-serif text-3xl font-bold">
          <NuxtLink :to="`/book/${loan.bookSlug}`" class="transition-colors hover:text-primary">{{ loan.title }}</NuxtLink>
        </h2>
        <p class="mb-4 italic text-muted-foreground">by {{ loan.author }}</p>
        <div class="h-1.5 w-full overflow-hidden rounded-full bg-foreground/5">
          <div class="h-full bg-primary transition-all" :style="{ width: `${readPercent(loan.currentPage, loan.totalPages)}%` }" />
        </div>
        <p class="mt-2 font-mono text-[11px] text-muted-foreground">
          PAGE {{ loan.currentPage }} OF {{ loan.totalPages }} ({{ readPercent(loan.currentPage, loan.totalPages) }}%)
        </p>
      </div>
      <div class="mt-6 flex flex-wrap gap-3">
        <Button variant="archival" @click="emit('return', loan.bookSlug); flash(`${loan.title} returned. Thank you!`)">Return Book</Button>
        <Button variant="archivalOutline" @click="emit('open-review')">Write Review</Button>
        <Button
          v-if="loan.inStock > 1"
          variant="archivalGhost"
          @click="() => { cart.addItem({ id: loan.bookId, title: loan.title, author: loan.author, price: Number(loan.price), cover: loan.cover, crop: loan.crop }); flash(`${loan.title} added to your cart.`); }"
        >
          <ShoppingBag /> Buy ${{ loan.price }}
        </Button>
      </div>
    </div>
  </article>
</template>
