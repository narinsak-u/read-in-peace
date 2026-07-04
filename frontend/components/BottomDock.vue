<script setup lang="ts">
import { Home, Library, MessageCircle, Settings } from "lucide-vue-next";
import { Button } from "~/components/ui/button";

defineProps<{
  flash: (message: string) => void;
}>();
</script>

<template>
  <div
    class="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-full border border-background/10 bg-foreground px-6 py-1 text-background shadow-2xl"
  >
    <Button variant="archivalDock" @click="navigateTo('/feed')">
      <Home /><span class="font-mono text-[8px] uppercase opacity-60">
        Home
      </span>
    </Button>
    <Button variant="archivalDock" @click="navigateTo('/dashboard')">
      <Library /><span class="font-mono text-[8px] uppercase opacity-60">
        Shelf
      </span>
    </Button>
    <Button
      variant="archivalDock"
      @click="flash('The feature is coming soon!')"
    >
      <MessageCircle /><span class="font-mono text-[8px] uppercase opacity-60">
        Social
      </span>
    </Button>
    <Button variant="archivalDock" @click="navigateTo('/plans')">
      <Settings /><span class="font-mono text-[8px] uppercase opacity-60">
        Plans
      </span>
    </Button>
  </div>
</template>
