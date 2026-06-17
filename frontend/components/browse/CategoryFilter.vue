<script setup lang="ts">
defineProps<{
  categories: readonly string[];
  active: string | undefined;
}>();

const emit = defineEmits<{
  change: [cat: string | undefined];
}>();
</script>

<template>
  <div class="flex gap-2">
    <button
      class="rounded-sm cursor-pointer px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors"
      :class="
        active === undefined
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-muted/70'
      "
      @click="emit('change', undefined)"
    >
      All
    </button>
    <button
      v-for="cat in categories"
      :key="cat"
      class="rounded-sm cursor-pointer px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors"
      :class="
        active === cat
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-muted/70'
      "
      @click="emit('change', cat)"
    >
      {{ cat }}
    </button>
  </div>
</template>
