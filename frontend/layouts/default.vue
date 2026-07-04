<script setup lang="ts">
import { useAuthStore } from "~/stores/auth";

const { notice, flash } = useFlash();
const route = useRoute();
const auth = useAuthStore();
const showDock = computed(() => route.name !== "index");
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-sm focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
    >
      Skip to main content
    </a>
    <div class="flex-1">
      <slot />
    </div>
  </div>
  <BottomDock v-if="showDock" :flash="flash" />

  <AuthModal v-if="auth.showAuthModal" @close="auth.closeAuthModal()" />

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
