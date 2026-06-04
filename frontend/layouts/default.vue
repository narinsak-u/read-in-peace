<script setup lang="ts">
const route = useRoute();
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <main class="flex-1">
      <slot />
    </main>
    <Footer v-if="route.name !== 'index'" />
    <AdminFab />
  </div>
</template>
