<script setup lang="ts">
import { ArrowRight } from "lucide-vue-next";

definePageMeta({
  layout: "default",
  title: "Read in Peace — A calmer way to read",
  description:
    "A quiet library to review, borrow, return, and buy books at your own pace.",
});
</script>

<template>
  <div
    class="relative flex h-screen w-full items-center justify-center overflow-hidden"
  >
    <video
      autoplay
      loop
      muted
      playsinline
      class="absolute inset-0 h-full w-full object-cover"
    >
      <source src="~/assets/background/landing-bg.mp4" type="video/mp4" />
    </video>
    <div
      class="absolute inset-0 bg-linear-to-b from-amber-900/30 via-transparent to-background"
    />
    <div
      class="relative z-10 flex max-w-5xl flex-col items-center px-6 text-center"
    >
      <span
        class="mb-6 rounded-full bg-amber-50 px-4 py-1.5 text-xs font-mono font-medium uppercase tracking-widest text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
      >
        A quieter library
      </span>
      <h1
        class="text-balance text-white text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl font-display"
      >
        Read at the Peace<br />the book deserves.
      </h1>
      <p
        class="mt-6 max-w-xl text-balance text-xs text-foreground/80 sm:text-sm font-mono uppercase"
      >
        Borrow, return, review, and own — without the noise. A place built for
        slow afternoons and long evenings.
      </p>

      <NuxtLink
        to="/feed"
        class="group mt-10 inline-flex items-center gap-3 rounded-lg bg-primary px-7 py-4 text-base font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:-translate-y-px hover:shadow-md"
      >
        Explore the Library
        <ArrowRight
          class="h-4 w-4 transition-transform group-hover:translate-x-1"
        />
      </NuxtLink>
    </div>

    <div
      class="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-foreground/40 font-display"
    >
      Scroll, sip, settle in.
    </div>
  </div>
</template>
