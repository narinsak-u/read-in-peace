<script setup lang="ts">
import { buttonVariants, type ButtonVariants } from "./variants";

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariants["variant"];
    size?: ButtonVariants["size"];
    class?: string;
  }>(),
  {
    variant: "default",
    size: "default",
  },
);
</script>

<template>
  <button :class="buttonVariants({ variant, size, className: props.class })">
    <slot />
  </button>
</template>
