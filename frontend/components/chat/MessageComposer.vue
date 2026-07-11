<script setup lang="ts">
const text = ref('');
const emit = defineEmits<{
  send: [text: string];
}>();

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
  }>(),
  { disabled: false },
);

function submit() {
  const trimmed = text.value.trim();
  if (!trimmed || props.disabled) return;
  emit('send', trimmed);
  text.value = '';
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    submit();
  }
}
</script>

<template>
  <div class="flex items-center gap-2 border-t border-border p-3">
    <input
      v-model="text"
      type="text"
      placeholder="Type a message..."
      :disabled="disabled"
      class="flex-1 rounded-lg border border-border bg-muted px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50"
      @keydown="onKeydown"
    >
  </div>
</template>
