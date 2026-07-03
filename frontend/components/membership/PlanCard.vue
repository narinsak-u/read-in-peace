<script setup lang="ts">
import { Check } from 'lucide-vue-next';
import { Button } from '~/components/ui/button';
import { features, type Plan } from '~/utils/plans';

defineProps<{
  plan: Plan;
  isCurrent: boolean;
}>();

const emit = defineEmits<{
  select: [plan: Plan];
}>();
</script>

<template>
  <article
    class="relative flex flex-col rounded-sm border px-6 py-10 transition-colors"
    :class="plan.highlighted ? 'border-primary bg-card shadow-sm' : 'border-border bg-card'"
  >
    <span
      v-if="plan.badge"
      class="absolute -top-3 left-6 rounded-sm bg-primary px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-primary-foreground"
    >
      {{ plan.badge }}
    </span>

    <span
      v-if="isCurrent"
      class="absolute -top-3 right-6 rounded-sm border border-border bg-card px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
    >
      Current Plan
    </span>

    <p class="font-serif text-lg font-bold">{{ plan.name }}</p>

    <div class="mt-4 flex items-baseline gap-1">
      <template v-if="plan.monthlyPrice !== null">
        <span class="font-serif text-4xl font-bold">${{ plan.monthlyPrice }}</span>
        <span class="font-mono text-xs text-muted-foreground">/month</span>
      </template>
      <template v-else>
        <span class="font-serif text-4xl font-bold">Free</span>
      </template>
    </div>

    <ul class="mt-6 flex flex-1 flex-col gap-3">
      <li
        v-for="feature in features"
        :key="feature.key"
        class="flex items-start gap-2.5 text-sm"
      >
        <Check class="mt-0.5 size-4 shrink-0 text-primary" />
        <span>
          <span class="text-muted-foreground">{{ feature.label }}:</span>
          {{ plan[feature.key] }}
        </span>
      </li>
    </ul>

    <Button
      class="mt-8 w-full"
      :variant="plan.highlighted ? 'archival' : 'archivalOutline'"
      :disabled="isCurrent"
      @click="emit('select', plan)"
    >
      {{ plan.id === 'free' ? 'Get Started' : isCurrent ? 'Current' : 'Subscribe' }}
    </Button>
  </article>
</template>
