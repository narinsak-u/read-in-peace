<script setup lang="ts">
import { Toaster } from 'vue-sonner';
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <slot />
    <Toaster richColors position="top-center" />
  </div>
</template>
