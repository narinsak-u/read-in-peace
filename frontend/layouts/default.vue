<script setup lang="ts">
import { Toaster } from 'vue-sonner';
</script>

<template>
  <div>
    <slot />
    <Toaster richColors position="top-center" />
  </div>
</template>
