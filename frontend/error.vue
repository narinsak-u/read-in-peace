<script setup lang="ts">
import { Button } from '~/components/ui/button';
import { buttonVariants } from '~/components/ui/button/variants';

const props = defineProps<{
  error?: { statusCode?: number; message?: string };
}>();

function reload() {
  window.location.reload();
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background px-4">
    <div class="max-w-md text-center">
      <p v-if="error?.statusCode === 404" class="font-mono text-xs uppercase text-primary">Catalog note</p>
      <h1 class="text-7xl font-bold text-foreground">{{ error?.statusCode ?? 404 }}</h1>
      <h2 v-if="error?.statusCode === 404" class="mt-4 text-xl font-semibold text-foreground">This page isn't on the shelf.</h2>
      <h2 v-else class="mt-4 text-xl font-semibold text-foreground">This page didn't load</h2>
      <p class="mt-2 text-sm text-muted-foreground">
        {{ error?.statusCode === 404
          ? "The page you're looking for doesn't exist or has been moved."
          : "Something went wrong on our end. You can try refreshing or head back home."
        }}
      </p>
      <div class="mt-6 flex flex-wrap justify-center gap-2">
        <NuxtLink to="/feed" :class="buttonVariants({ variant: 'archival' })">Go home</NuxtLink>
        <Button v-if="error?.statusCode !== 404" variant="archivalOutline" @click="reload">Try again</Button>
      </div>
    </div>
  </div>
</template>
