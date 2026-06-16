<script setup lang="ts">
import { ShoppingBag } from 'lucide-vue-next';
import { Button } from '~/components/ui/button';
import { useCartStore } from '~/stores/cart';

defineProps<{
  returned: string[];
  flashcards: (message: string) => void;
}>();

const emit = defineEmits<{
  return: [key: string];
  'open-review': [];
}>();

const cart = useCartStore();
</script>

<template>
  <section id="loans" class="animate-enter scroll-mt-24">
    <div class="mb-6 flex items-baseline justify-between border-b border-border pb-2">
      <h1 class="font-serif text-2xl">Active Loans</h1>
      <span class="font-mono text-[10px] uppercase text-muted-foreground">{{ 3 - returned.length }} items currently on desk</span>
    </div>

    <article
      v-if="!returned.includes('memory')"
      class="group flex flex-col gap-8 rounded-sm border border-border bg-card p-5 md:flex-row md:p-6"
    >
      <div class="shrink-0 self-center shadow-xl transition-transform duration-500 group-hover:-translate-y-1 md:self-auto">
        <img
          src="/images/architecture-memory.png"
          alt="The Architecture of Memory book cover"
          width="768"
          height="1152"
          class="h-[270px] w-[180px] object-cover"
        />
      </div>
      <div class="flex flex-1 flex-col justify-between py-2">
        <div>
          <div class="mb-2 flex flex-wrap items-center gap-2">
            <span class="rounded-sm bg-primary px-2 py-0.5 font-mono text-[10px] text-primary-foreground">DUE IN 2 DAYS</span>
            <span class="font-mono text-[10px] uppercase text-muted-foreground">Shelf: 720.1 ARC</span>
          </div>
          <h2 class="mb-1 font-serif text-3xl font-bold">
            <NuxtLink to="/book/architecture-of-memory" class="transition-colors hover:text-primary">The Architecture of Memory</NuxtLink>
          </h2>
          <p class="mb-4 italic text-muted-foreground">by Elena Rossi-Vaughn</p>
          <div class="mb-6 flex items-center gap-1" aria-label="Rated 4.2 out of 5">
            <span class="text-lg text-primary">★★★★</span>
            <span class="text-lg text-foreground/10">★</span>
            <span class="ml-2 text-[11px] font-medium tracking-tight text-muted-foreground">4.2 AVG RATING</span>
          </div>
          <div class="h-1.5 w-full overflow-hidden rounded-full bg-foreground/5">
            <div class="h-full w-[64%] bg-primary" />
          </div>
          <p class="mt-2 font-mono text-[11px] text-muted-foreground">PAGE 218 OF 340 (64%)</p>
        </div>
        <div class="mt-6 flex flex-wrap gap-3">
          <Button variant="archival" @click="emit('return', 'memory'); flashcards('Book returned. Thank you!')">Return Book</Button>
          <Button variant="archivalOutline" @click="emit('open-review')">Write Review</Button>
          <Button variant="archivalGhost" @click="() => { cart.addItem({ id: 'architecture-of-memory', title: 'The Architecture of Memory', author: 'Elena Rossi-Vaughn', price: 21, cover: '/images/architecture-memory.png', crop: null }); flashcards('The Architecture of Memory added to your cart.'); }">
            <ShoppingBag /> Buy $21.00
          </Button>
        </div>
      </div>
    </article>

    <div class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
      <template
        v-for="book in [
          { key: 'springs', title: 'Silent Springs Revisited', author: 'Marissa Langford', crop: 0 as const, due: 'DUE: JUN 22' },
          { key: 'urbanism', title: 'Urbanism 2050', author: 'Lena Parker', crop: 1 as const, due: 'OVERDUE (3D)' },
        ].filter((b) => !returned.includes(b.key))"
        :key="book.key"
      >
        <article class="group flex gap-4 rounded-sm border border-border bg-card p-4 transition-colors hover:border-primary/30">
          <CoverImage :crop="book.crop" class="h-24 w-16 shrink-0 shadow-sm" />
          <div class="flex min-w-0 flex-1 flex-col justify-center">
            <h3 class="font-serif text-sm font-bold leading-tight">{{ book.title }}</h3>
            <p class="mb-2 text-xs italic text-muted-foreground">{{ book.author }}</p>
            <div class="flex items-center justify-between gap-2">
              <span :class="`font-mono text-[10px] ${book.key === 'urbanism' ? 'font-bold text-primary' : 'text-muted-foreground'}`">{{ book.due }}</span>
              <Button size="sm" variant="archivalGhost" @click="emit('return', book.key); flashcards(`${book.title} returned.`)">Return</Button>
            </div>
          </div>
        </article>
      </template>
    </div>
  </section>
</template>
