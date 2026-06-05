<script setup lang="ts">
import { Flame } from 'lucide-vue-next';
import type { BookWithMeta } from '~/stores/books';

defineProps<{
  trending: BookWithMeta[];
}>();
</script>

<template>
  <section class="mb-14">
    <div class="mb-5 flex items-end justify-between">
      <div>
        <div class="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-primary">
          <Flame class="h-3.5 w-3.5" /> Trending Now
        </div>
        <h2 class="text-3xl font-semibold tracking-tight">
          This week's quiet favorites
        </h2>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-5 md:grid-cols-3">
      <NuxtLink
        v-for="(b, i) in trending"
        :key="b.id"
        :to="'/book/' + b.id"
        class="group relative overflow-hidden max-h-117.5 rounded-lg border border-border bg-card transition-all hover:shadow-2xl hover:shadow-black/5"
        :class="i === 0 ? 'md:col-span-2 md:row-span-2' : ''"
      >
        <div
          class="relative overflow-hidden"
          :class="i === 0 ? 'h-full' : 'aspect-16/11'"
        >
          <img
            :src="b.cover"
            :alt="b.title"
            class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div class="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
          <div class="absolute bottom-0 left-0 right-0 p-6 text-white">
            <span class="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider backdrop-blur">
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
      </NuxtLink>
    </div>
  </section>
</template>
