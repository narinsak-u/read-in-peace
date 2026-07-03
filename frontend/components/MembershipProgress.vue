<script setup lang="ts">
import { useMembershipStore } from '~/stores/membership';

const membershipStore = useMembershipStore();

const used = computed(() => {
  const m = membershipStore.membership;
  if (!m) return 0;
  return Math.max(0, m.itemLimit - m.borrowsRemaining);
});

const limit = computed(() => {
  return membershipStore.membership?.itemLimit ?? 15;
});

const progress = computed(() => {
  if (limit.value === 0) return 0;
  return Math.round((used.value / limit.value) * 100);
});
</script>

<template>
  <section
    class="animate-enter relative overflow-hidden border border-border bg-card p-6 shadow-sm [animation-delay:250ms]"
  >
    <div class="absolute inset-y-0 left-0 w-1 bg-primary" />
    <h2
      class="mb-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
    >
      Membership
    </h2>
    <div class="mb-1 flex items-baseline gap-2">
      <span class="font-serif text-4xl font-bold">{{ used }}</span>
      <span class="text-sm italic text-muted-foreground">of {{ limit }} books</span>
    </div>
    <div class="mb-4 h-1 w-full bg-foreground/5">
      <div class="h-full bg-foreground" :style="{ width: `${progress}%` }" />
    </div>
    <p class="text-[11px] leading-relaxed text-muted-foreground">
      <template v-if="membershipStore.membership && membershipStore.membership.plan !== 'free'">
        You have borrowed <span class="text-primary">{{ used }} books</span> this month.
        Returns refresh your available slots.
      </template>
      <template v-else>
        You can borrow <span class="text-primary">up to {{ limit }} books</span> at a time.
        <NuxtLink to="/plans" class="underline hover:text-primary">Upgrade</NuxtLink> to borrow more.
      </template>
    </p>
  </section>
</template>
