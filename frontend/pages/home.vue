<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Home — Read in Pace',
  description: 'Your personal library dashboard.',
});
</script>

<template>
  <section>
    <div class="mb-6 flex items-baseline justify-between border-b border-border pb-2">
      <h1 class="font-serif text-2xl">Active Loans</h1>
    </div>
    <p class="text-muted-foreground italic">You don't have any active loans yet. Find something in the Explore tab.</p>
  </section>
</template>
