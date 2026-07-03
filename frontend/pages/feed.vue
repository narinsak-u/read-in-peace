<script setup lang="ts">
import { useAuthStore } from "~/stores/auth";
import { Button } from "~/components/ui/button";

definePageMeta({
  title: "Feed — Read in Peace",
  description:
    "Borrow, return, buy, review, rate, and discuss books with fellow readers.",
  layout: "default",
});

const query = shallowRef("");
const reviewOpen = shallowRef(false);
const reviewBook = shallowRef<{
  id: string;
  title: string;
  cover: string;
  crop: number | null;
} | null>(null);
const rating = shallowRef(0);
const reviewText = shallowRef("");
const { notice, flash } = useFlash();
const auth = useAuthStore();
</script>

<template>
  <div
    class="min-h-screen bg-background pb-28 text-foreground selection:bg-primary/10 selection:text-primary"
  >
    <Nav v-model:query="query" />

    <main class="mx-auto grid max-w-7xl grid-cols-12 gap-10 px-4 py-8 md:px-6">
      <div class="col-span-12 space-y-12 lg:col-span-8">
        <ActiveLoans
          :mode="auth.signedIn ? 'loans' : 'trending'"
          :flash="flash"
          @open-review="
            (book: { id: string; title: string; cover: string; crop: number | null }) => {
              reviewBook = book;
              reviewOpen = true;
            }
          "
        />
        <NewArrivals v-model:query="query" :flash="flash" />
      </div>

      <aside class="col-span-12 space-y-10 lg:col-span-4">
        <MembershipProgress />
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
      v-if="reviewBook"
      v-model:open="reviewOpen"
      v-model:rating="rating"
      v-model:reviewText="reviewText"
      :book="reviewBook"
      :flash="flash"
    />
  </div>
</template>
