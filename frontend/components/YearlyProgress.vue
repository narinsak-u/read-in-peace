<script setup lang="ts">
interface Props {
  current?: number;
  goal?: number;
  behind?: number;
  year?: number;
}

const props = withDefaults(defineProps<Props>(), {
  current: 24,
  goal: 50,
  behind: 2,
  year: 2026,
});

const progress = computed(() => Math.round((props.current / props.goal) * 100));
</script>

<template>
  <section
    class="animate-enter relative overflow-hidden border border-border bg-card p-6 shadow-sm [animation-delay:250ms]"
  >
    <div class="absolute inset-y-0 left-0 w-1 bg-primary" />
    <h2
      class="mb-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
    >
      Yearly Progress
    </h2>
    <div class="mb-1 flex items-baseline gap-2">
      <span class="font-serif text-4xl font-bold">{{ current }}</span>
      <span class="text-sm italic text-muted-foreground">of {{ goal }} books</span>
    </div>
    <div class="mb-4 h-1 w-full bg-foreground/5">
      <div class="h-full bg-foreground" :style="{ width: `${progress}%` }" />
    </div>
    <p class="text-[11px] leading-relaxed text-muted-foreground">
      You are <span class="text-primary">{{ behind }} books behind</span> your {{ year }}
      reading goal. A short essay collection might be perfect this
      weekend.
    </p>
  </section>
</template>
