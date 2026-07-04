<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';
import { useMembershipStore } from '~/stores/membership';
import { plans, type Plan } from '~/utils/plans';

definePageMeta({
  title: 'Plans — Read in Peace',
  description: 'Choose a membership plan that fits your reading pace.',
});

const auth = useAuthStore();
const membershipStore = useMembershipStore();
const { flash } = useFlash();

async function onSelect(plan: Plan) {
  if (!auth.signedIn) {
    auth.openAuthModal(() => { void onSelect(plan); });
    return;
  }
  if (plan.id === 'free') {
    flash('You are already on the free plan');
    return;
  }
  await membershipStore.checkout(plan.id);
}
</script>

<template>
  <div class="min-h-screen bg-background pb-28 text-foreground">
    <Nav mode="cart" />

    <main class="mx-auto max-w-6xl px-4 py-10 md:px-6 lg:py-14">
      <div class="border-b border-border pb-5">
        <p class="font-mono text-[10px] uppercase tracking-widest text-primary">
          Membership
        </p>
        <h1 class="mt-2 font-serif text-4xl font-bold md:text-5xl">
          Choose your plan
        </h1>
        <p class="mt-4 max-w-lg text-sm text-muted-foreground">
          Borrow at your own pace. Upgrade anytime, cancel anytime.
        </p>
      </div>

      <ManagementSection
        v-if="
          membershipStore.membership &&
          membershipStore.membership.plan !== 'free' &&
          membershipStore.membership.status === 'active'
        "
      />

      <div class="my-12 grid gap-6 md:grid-cols-3">
        <PlanCard
          v-for="plan in plans"
          :key="plan.name"
          :plan="plan"
          :is-current="plan.id === membershipStore.membership?.plan"
          :loading="membershipStore.loading"
          @select="onSelect"
        />
      </div>

      <p class="mt-10 text-center text-[11px] leading-5 text-muted-foreground">
        All plans include free in-store pickup and returns. Prices in USD.
      </p>
    </main>
  </div>
</template>
