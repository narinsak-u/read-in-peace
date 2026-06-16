<script setup lang="ts">
import { ref } from "vue";
import { MessageCircle } from "lucide-vue-next";
import { Button } from "~/components/ui/button";

defineProps<{
  flash: (message: string) => void;
}>();

const liked = ref(false);
const replyOpen = ref(false);
const replyText = ref('');
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
          <div>
            <Button
              variant="archivalGhost"
              size="sm"
              @click="replyOpen = !replyOpen"
            >
              <MessageCircle /> Reply
            </Button>
            <div v-if="replyOpen" class="mt-2">
              <textarea
                v-model="replyText"
                rows="2"
                placeholder="Write your reply..."
                class="w-full resize-none rounded-sm border border-border bg-card p-2 text-xs focus:ring-1 focus:ring-ring"
              />
              <div class="mt-1 flex justify-end gap-1">
                <Button size="sm" variant="archivalGhost" @click="replyOpen = false; replyText = ''">Cancel</Button>
                <Button size="sm" variant="archival" :disabled="!replyText.trim()" @click="replyOpen = false; replyText = ''; flash('Reply posted.')">Post</Button>
              </div>
            </div>
          </div>
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
          @click="flash('Discussion details opening soon.')"
          >View discussion</Button
        >
      </article>
    </div>
  </section>
</template>
