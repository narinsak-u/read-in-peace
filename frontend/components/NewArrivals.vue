<script setup lang="ts">
import { computed, ref } from 'vue';
import { ShoppingBag, Star } from 'lucide-vue-next';
import { Button } from '~/components/ui/button';
import { useCartStore } from '~/stores/cart';

const query = defineModel<string>('query', { default: '' });

defineProps<{
  flashcards: (message: string) => void;
}>();

const cart = useCartStore();

const arrivals = [
  { id: 'the-hidden-sea', title: 'The Hidden Sea', author: 'Eliot Harbor', crop: 2, rating: 4.7, price: 18.5 },
  { id: 'logic-and-form', title: 'Logic & Form', author: 'Adrian Wakefield', crop: 3, rating: 4.3, price: 24 },
  { id: 'paper-shadows', title: 'Paper Shadows', author: 'Maeve Lincoln', crop: 4, rating: 4.8, price: 16 },
  { id: 'the-long-night', title: 'The Long Night', author: 'Daniel Hastings', crop: 5, rating: 4.1, price: 19.99 },
];

const borrowed = ref<string[]>([]);

const filtered = computed(() =>
  arrivals.filter((book) =>
    `${book.title} ${book.author}`.toLowerCase().includes(query.value.toLowerCase()),
  ),
);
</script>

<template>
  <section id="arrivals" class="animate-enter scroll-mt-24 [animation-delay:150ms]">
    <div class="mb-6 flex items-baseline justify-between border-b border-border pb-2">
      <h2 class="font-serif text-2xl">New Arrivals</h2>
      <span class="font-mono text-[10px] uppercase text-muted-foreground">Curated this week</span>
    </div>
    <div class="mb-5 sm:hidden">
      <input
        v-model="query"
        placeholder="Search new arrivals..."
        class="w-full rounded-sm bg-input px-4 py-2 text-sm"
      />
    </div>
    <div v-if="filtered.length > 0" class="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-4">
      <article v-for="book in filtered" :key="book.id" class="group">
        <NuxtLink :to="`/book/${book.id}`" :aria-label="`View ${book.title}`">
          <CoverImage :crop="book.crop" class="mb-3 aspect-[2/3] shadow-md transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl" />
        </NuxtLink>
        <h3 class="font-serif text-sm font-bold transition-colors group-hover:text-primary">
          <NuxtLink :to="`/book/${book.id}`">{{ book.title }}</NuxtLink>
        </h3>
        <p class="text-xs text-muted-foreground">{{ book.author }}</p>
        <div class="mt-1 flex items-center gap-1 text-[10px] text-primary">
          <Star class="size-3 fill-current" /> {{ book.rating }}
        </div>
        <div class="mt-3 flex gap-1">
          <Button
            size="sm"
            :variant="borrowed.includes(book.title) ? 'archivalOutline' : 'archival'"
            :disabled="borrowed.includes(book.title)"
            @click="() => { borrowed.push(book.title); flashcards(`${book.title} borrowed for 21 days.`); }"
          >
            {{ borrowed.includes(book.title) ? 'Borrowed' : 'Borrow' }}
          </Button>
          <Button
            size="icon"
            variant="archivalGhost"
            :aria-label="`Buy ${book.title}`"
            @click="() => { cart.addItem({ id: book.id, title: book.title, author: book.author, price: book.price, cover: '/images/book-cover-sheet.png', crop: book.crop }); flashcards(`${book.title} added to your cart.`); }"
          >
            <ShoppingBag />
          </Button>
        </div>
      </article>
    </div>
    <p v-else class="border-y border-border py-12 text-center font-serif italic text-muted-foreground">
      No volumes match "{{ query }}". Try another title or author.
    </p>
  </section>
</template>
