<script setup lang="ts">
import { Flame, ChevronLeft, ChevronRight } from 'lucide-vue-next';
import { useBooksStore } from '~/stores/books';

const booksStore = useBooksStore();
const trending = booksStore.trendingBooks;
const page = ref(1);
const totalPages = 10;

definePageMeta({
  title: 'Feed — Read in Pace',
  description: 'Browse trending books and the full library on Read in Pace.',
});
</script>

<template>
  <Navbar />
  <main class="mx-auto max-w-7xl px-6 py-10">
    <section class="mb-14">
      <div class="mb-5 flex items-end justify-between">
        <div>
          <div class="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-primary">
            <Flame class="h-3.5 w-3.5" /> Trending Now
          </div>
          <h2 class="text-3xl font-semibold tracking-tight">This week's quiet favorites</h2>
        </div>
        <span class="hidden text-sm text-muted-foreground sm:block">Updated daily</span>
      </div>

      <div class="grid grid-cols-1 gap-5 md:grid-cols-3">
        <article
          v-for="(b, i) in trending"
          :key="b.id"
          class="group relative overflow-hidden rounded-3xl border border-border bg-card transition-all hover:shadow-2xl hover:shadow-black/5"
          :class="i === 0 ? 'md:col-span-2 md:row-span-2' : ''"
        >
          <div
            class="relative overflow-hidden"
            :class="i === 0 ? 'aspect-[16/10]' : 'aspect-[16/11]'"
          >
            <img
              :src="b.cover"
              :alt="b.title"
              class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div class="absolute bottom-0 left-0 right-0 p-6 text-white">
              <span
                class="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider backdrop-blur"
              >
                #{{ i + 1 }} Trending
              </span>
              <h3
                class="mt-3 font-semibold tracking-tight"
                :class="i === 0 ? 'text-3xl' : 'text-xl'"
              >
                {{ b.title }}
              </h3>
              <p class="text-sm text-white/70">{{ b.author }}</p>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section>
      <div class="mb-5 flex items-end justify-between">
        <h2 class="text-2xl font-semibold tracking-tight">The full shelf</h2>
        <span class="text-sm text-muted-foreground">{{ booksStore.books.length }} titles</span>
      </div>

      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <BookCard v-for="b in booksStore.books" :key="b.id" :book="b" />
      </div>

      <div class="mt-14 flex items-center justify-center gap-1.5">
        <button
          @click="page = Math.max(1, page - 1)"
          :disabled="page === 1"
          class="flex h-9 w-9 items-center justify-center rounded-full border border-border transition-colors hover:bg-muted disabled:opacity-40"
        >
          <ChevronLeft class="h-4 w-4" />
        </button>
        <button
          v-for="n in [1, 2, 3]"
          :key="n"
          @click="page = n"
          class="h-9 min-w-9 rounded-full px-3 text-sm font-medium transition-colors"
          :class="page === n ? 'bg-foreground text-background' : 'hover:bg-muted'"
        >
          {{ n }}
        </button>
        <span class="px-2 text-muted-foreground">…</span>
        <button
          @click="page = totalPages"
          class="h-9 min-w-9 rounded-full px-3 text-sm font-medium transition-colors"
          :class="page === totalPages ? 'bg-foreground text-background' : 'hover:bg-muted'"
        >
          {{ totalPages }}
        </button>
        <button
          @click="page = Math.min(totalPages, page + 1)"
          :disabled="page === totalPages"
          class="flex h-9 w-9 items-center justify-center rounded-full border border-border transition-colors hover:bg-muted disabled:opacity-40"
        >
          <ChevronRight class="h-4 w-4" />
        </button>
      </div>
    </section>
  </main>
</template>
