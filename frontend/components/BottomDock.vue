<script setup lang="ts">
import { Home, Library, MessageCircle, Settings } from "lucide-vue-next";
import { Button } from "~/components/ui/button";

defineProps<{
  flash: (message: string) => void;
}>();

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}
</script>

<template>
  <div
    class="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-full border border-background/10 bg-foreground px-6 py-1 text-background shadow-2xl"
  >
    <Button variant="archivalDock" @click="scrollTo('loans')">
      <Home /><span class="font-mono text-[8px] uppercase opacity-60">
        Home
      </span>
    </Button>
    <Button variant="archivalDock" @click="scrollTo('arrivals')">
      <Library /><span class="font-mono text-[8px] uppercase opacity-60">
        Shelf
      </span>
    </Button>
    <Button variant="archivalDock" @click="scrollTo('feed')">
      <MessageCircle /><span class="font-mono text-[8px] uppercase opacity-60">
        Social
      </span>
    </Button>
    <Button
      variant="archivalDock"
      @click="flash('The feature is coming soon!')"
    >
      <Settings /><span class="font-mono text-[8px] uppercase opacity-60">
        Prefs
      </span>
    </Button>
  </div>
</template>
