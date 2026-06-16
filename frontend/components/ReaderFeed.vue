<script setup lang="ts">
import { ref } from "vue";
import { MessageCircle } from "lucide-vue-next";
import { Button } from "~/components/ui/button";

defineProps<{
  flashcards: (message: string) => void;
}>();

const liked = ref(false);
</script>

<template>
  <section id="feed" class="animate-enter scroll-mt-24 [animation-delay:300ms]">
    <div
      class="mb-4 flex items-baseline justify-between border-b border-border pb-2"
    >
      <h2 class="font-serif text-xl">Reader Feed</h2>
      <span class="size-2 rounded-full bg-primary" />
    </div>
    <div class="space-y-6">
      <article class="border-l border-foreground/5 pl-4">
        <div class="mb-1 flex items-center gap-2">
          <span
            class="flex size-6 items-center justify-center rounded-full bg-muted text-[8px] font-bold"
          >
            AM
          </span>
          <span class="text-[11px] font-bold uppercase">Aris M.</span>
          <span class="font-mono text-[10px] text-muted-foreground">
            14m ago
          </span>
        </div>
        <p class="text-sm leading-snug text-foreground/80">
          "Rossi-Vaughn's chapter on brutalist memorials is devastating. Did
          anyone else catch the reference to Rossi's own cemetery design?"
        </p>
        <div class="mt-2 flex items-center gap-3">
          <Button
            variant="archivalGhost"
            size="sm"
            @click="flashcards('Reply composer opened.')"
          >
            <MessageCircle /> Reply
          </Button>
          <Button
            variant="archivalGhost"
            size="sm"
            @click="liked = !liked"
            :class="liked ? 'text-primary' : ''"
          >
            {{ liked ? "Liked" : "Like" }} ({{ liked ? 13 : 12 }})
          </Button>
        </div>
      </article>
      <article class="border-l border-foreground/5 pl-4">
        <div class="mb-1 flex items-center gap-2">
          <span
            class="flex size-6 items-center justify-center rounded-full bg-muted text-[8px] font-bold"
          >
            LW
          </span>
          <span class="text-[11px] font-bold uppercase">Leo Wang</span>
          <span class="font-mono text-[10px] text-muted-foreground">
            2h ago
          </span>
        </div>
        <p class="text-sm leading-snug text-foreground/80">
          Just finished
          <span
            class="italic underline decoration-primary/30 underline-offset-2"
          >
            Paper Shadows
          </span>
          . A little quiet in the middle, but the ending is worth it.
        </p>
        <p class="mt-2 text-xs text-primary" aria-label="3 out of 5 stars">
          ★★★<span class="text-foreground/10">★★</span>
        </p>
      </article>
      <article class="border-l border-foreground/5 pl-4">
        <div class="mb-1 flex items-center gap-2">
          <span
            class="flex size-6 items-center justify-center rounded-full bg-muted text-[8px] font-bold"
            >SS</span
          >
          <span class="text-[11px] font-bold uppercase">Sarah S.</span>
          <span class="font-mono text-[10px] text-muted-foreground"
            >Yesterday</span
          >
        </div>
        <p class="text-sm leading-snug text-foreground/80">
          Looking for recommendations on mid-century urban design. Any classics
          I'm missing?
        </p>
        <Button
          class="mt-2"
          variant="archivalGhost"
          size="sm"
          @click="flashcards('Discussion saved to your archive.')"
          >View discussion</Button
        >
      </article>
    </div>
  </section>
</template>
