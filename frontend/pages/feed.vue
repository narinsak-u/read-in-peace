<script setup lang="ts">
import { Button } from "~/components/ui/button";

definePageMeta({
  title: "Ex Libris — Social Library",
  description:
    "Borrow, return, buy, review, rate, and discuss books with fellow readers.",
  layout: "default",
});

const query = ref("");
const returned = ref<string[]>([]);
const reviewOpen = ref(false);
const rating = ref(0);
const reviewText = ref("");
const { notice, flash } = useFlash();
</script>

<template>
  <div
    class="min-h-screen bg-background pb-28 text-foreground selection:bg-primary/10 selection:text-primary"
  >
    <Nav v-model:query="query" />

    <main class="mx-auto grid max-w-7xl grid-cols-12 gap-10 px-4 py-8 md:px-6">
      <div class="col-span-12 space-y-12 lg:col-span-8">
        <ActiveLoans
          :returned="returned"
          :flash="flash"
          @return="returned.push($event)"
          @open-review="reviewOpen = true"
        />
        <NewArrivals v-model:query="query" :flash="flash" />
      </div>

      <aside class="col-span-12 space-y-10 lg:col-span-4">
        <YearlyProgress :current="24" :goal="50" :behind="2" :year="2026" />
        <ReaderFeed :flash="flash" />

        <!-- Book Club -->
        <section
          class="animate-enter rounded-sm border-2 border-dashed border-border p-6 text-center [animation-delay:350ms]"
        >
          <p class="mb-4 font-serif text-sm italic">
            Join the literary circles in your neighborhood.
          </p>
          <Button
            class="w-full uppercase tracking-widest"
            variant="archivalOutline"
            @click="flash('The feature is coming soon!')"
          >
            Find a Book Club
          </Button>
        </section>
      </aside>
    </main>

    <ReviewModal
      v-model:open="reviewOpen"
      v-model:rating="rating"
      v-model:reviewText="reviewText"
      :flash="flash"
    />
  </div>
</template>
