<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next';

definePageMeta({
  title: 'Read in Pace — A calmer way to read',
  description: 'A quiet library to review, borrow, return, and buy books at your own pace.',
});
</script>

<template>
  <div
    class="relative flex h-screen w-full items-center justify-center overflow-hidden bg-animated-gradient"
  >
    <div class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/20" />
    <div class="absolute left-8 top-8 text-base font-semibold tracking-tight">
      Read<span class="text-primary"> in </span>Pace
    </div>

    <div class="relative z-10 flex max-w-2xl flex-col items-center px-6 text-center">
      <span
        class="mb-6 rounded-full glass px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-foreground/70"
      >
        A quieter library
      </span>
      <h1
        class="text-balance text-5xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-7xl"
      >
        Read at the pace<br />the book deserves.
      </h1>
      <p class="mt-6 max-w-md text-balance text-base text-foreground/60 sm:text-lg">
        Borrow, return, review, and own — without the noise. A place built for slow afternoons and long evenings.
      </p>

      <NuxtLink
        to="/feed"
        class="group mt-10 inline-flex items-center gap-3 rounded-full glass px-7 py-4 text-base font-medium text-foreground shadow-xl shadow-black/5 transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:shadow-primary/20"
      >
        Explore the Library
        <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </NuxtLink>
    </div>

    <div class="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-foreground/40">
      Scroll, sip, settle in.
    </div>
  </div>
</template>
