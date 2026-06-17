<script setup lang="ts">
import { Button } from '~/components/ui/button';

defineProps<{
  flash: (message: string) => void;
}>();

provide('flash', flash);
</script>

<template>
  <section id="feed" class="animate-enter scroll-mt-24 [animation-delay:300ms]">
    <div class="mb-4 flex items-baseline justify-between border-b border-border pb-2">
      <h2 class="font-serif text-xl">Reader Feed</h2>
      <span class="size-2 rounded-full bg-primary" />
    </div>
    <div class="space-y-6">
      <FeedPost initials="AM" name="Aris M." time="14m ago">
        "Rossi-Vaughn's chapter on brutalist memorials is devastating. Did anyone else catch the reference to Rossi's own cemetery design?"
      </FeedPost>
      <FeedPost initials="LW" name="Leo Wang" time="2h ago">
        Just finished <span class="italic underline decoration-primary/30 underline-offset-2">Paper Shadows</span>. A little quiet in the middle, but the ending is worth it.
      </FeedPost>
      <article class="border-l border-foreground/5 pl-4">
        <div class="mb-1 flex items-center gap-2">
          <span class="flex size-6 items-center justify-center rounded-full bg-muted text-[8px] font-bold">SS</span>
          <span class="text-[11px] font-bold uppercase">Sarah S.</span>
          <span class="font-mono text-[10px] text-muted-foreground">Yesterday</span>
        </div>
        <p class="text-sm leading-snug text-foreground/80">
          Looking for recommendations on mid-century urban design. Any classics I'm missing?
        </p>
        <Button class="mt-2" variant="archivalGhost" size="sm" @click="flash('Discussion details opening soon.')">View discussion</Button>
      </article>
    </div>
  </section>
</template>
