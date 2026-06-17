<script setup lang="ts">
import { Star } from 'lucide-vue-next';

defineProps<{
  value: number;
  size?: 'sm' | 'md';
}>();

const emit = defineEmits<{
  change: [value: number];
}>();
</script>

<template>
  <div class="flex gap-1" :class="size === 'sm' ? '' : ''">
    <button
      v-for="n in 5"
      :key="n"
      type="button"
      :aria-label="`Rate ${n} stars`"
      @click="emit('change', n)"
    >
      <Star
        :class="`${size === 'sm' ? 'size-3' : 'size-6'} ${n <= value ? 'fill-current text-primary' : 'text-border'}`"
      />
    </button>
  </div>
</template>
