<script setup lang="ts">
import { Toaster } from "vue-sonner";

const { notice, flash } = useFlash();
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <div class="flex-1">
      <slot />
    </div>
    <!-- <footer class="border-t border-border py-6 text-center">
      <p class="text-[11px] text-muted-foreground">&copy; 2026 Read in Peace</p>
    </footer> -->
  </div>
  <BottomDock :flash="flash" />
  <Toaster richColors position="top-center" />

  <!-- Toast Notification -->
  <Teleport to="body">
    <div
      v-if="notice"
      role="status"
      class="fixed right-5 top-20 z-50 border border-border bg-foreground px-4 py-3 text-sm text-background shadow-xl"
    >
      {{ notice }}
    </div>
  </Teleport>
</template>
