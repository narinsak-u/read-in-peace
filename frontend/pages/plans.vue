<script setup lang="ts">
import { Check } from 'lucide-vue-next';
import { Button } from '~/components/ui/button';
import { useAuthStore } from '~/stores/auth';
import { useMembershipStore } from '~/stores/membership';
import { useFlash } from '~/composables/useFlash';

definePageMeta({
  title: 'Plans — Read in Peace',
  description: 'Choose a membership plan that fits your reading pace.',
});

const auth = useAuthStore();
const membershipStore = useMembershipStore();
const { flash } = useFlash();
const cancelling = shallowRef(false);
const cancelConfirm = shallowRef(false);
const cancelDate = shallowRef<string | null>(null);

interface Plan {
  name: string;
  id: string;
  monthlyPrice: number | null;
  itemLimit: string;
  returnWindow: string;
  buyToKeepDiscount: string;
  highlighted?: boolean;
  badge?: string;
}

const plans: Plan[] = [
  {
    name: 'The Bibliophile',
    id: 'free',
    monthlyPrice: null,
    itemLimit: '15 Items',
    returnWindow: '7 Days',
    buyToKeepDiscount: '5% Off',
  },
  {
    name: 'The Curator',
    id: 'curator',
    monthlyPrice: 5,
    itemLimit: '25 Items',
    returnWindow: '2 Weeks',
    buyToKeepDiscount: '15% Off',
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    name: 'The Archivist',
    id: 'archivist',
    monthlyPrice: 10,
    itemLimit: '50 Items',
    returnWindow: '1 Month',
    buyToKeepDiscount: '25% Off',
  },
];

const features = [
  { key: 'itemLimit', label: 'Borrow limit' },
  { key: 'returnWindow', label: 'Return window' },
  { key: 'buyToKeepDiscount', label: 'Buy-to-keep discount' },
] as const;

const currentPlanName = computed(() => {
  const plan = plans.find((p) => p.id === membershipStore.membership?.plan);
  return plan?.name ?? 'Unknown';
});

const remainingDays = computed(() => {
  if (!membershipStore.membership?.currentPeriodEnd) return null;
  const end = new Date(membershipStore.membership.currentPeriodEnd);
  const now = new Date();
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
});

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

async function handleCancel() {
  cancelling.value = true;
  const effectiveDate = await membershipStore.cancel();
  if (effectiveDate) {
    cancelDate.value = new Date(effectiveDate).toLocaleDateString();
    cancelConfirm.value = true;
  }
  cancelling.value = false;
}
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <Nav mode="cart" />

    <main class="mx-auto max-w-6xl px-4 py-10 md:px-6 lg:py-14">
      <div class="border-b border-border pb-5">
        <p class="font-mono text-[10px] uppercase tracking-widest text-primary">
          Membership
        </p>
        <h1 class="mt-2 font-serif text-4xl font-bold md:text-5xl">
          Choose your plan
        </h1>
        <p class="mt-2 max-w-lg text-sm text-muted-foreground">
          Borrow at your own pace. Upgrade anytime, cancel anytime.
        </p>
      </div>

      <!-- Management Mode -->
      <div
        v-if="membershipStore.membership && membershipStore.membership.plan !== 'free' && membershipStore.membership.status === 'active'"
        class="my-12 rounded-sm border border-border bg-card p-6"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="font-mono text-[10px] uppercase tracking-widest text-primary">
              Current Plan
            </p>
            <h2 class="mt-1 font-serif text-2xl font-bold">{{ currentPlanName }}</h2>
            <p class="mt-1 text-sm text-muted-foreground">
              Status: <span class="text-primary">{{ membershipStore.membership.status }}</span>
            </p>
          </div>
          <span
            v-if="membershipStore.membership.cancelAtPeriodEnd"
            class="rounded-sm border border-orange-500/30 bg-orange-500/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-orange-500"
          >
            Cancels on {{ membershipStore.membership.currentPeriodEnd ? new Date(membershipStore.membership.currentPeriodEnd).toLocaleDateString() : '' }}
          </span>
        </div>

        <div class="mt-6 grid gap-4 sm:grid-cols-3">
          <div class="rounded-sm border border-border p-4">
            <p class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Remaining Days
            </p>
            <p class="mt-1 font-serif text-3xl font-bold">{{ remainingDays ?? '-' }}</p>
          </div>
          <div class="rounded-sm border border-border p-4">
            <p class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Remaining Books
            </p>
            <p class="mt-1 font-serif text-3xl font-bold">
              {{ membershipStore.membership.borrowsRemaining }}
            </p>
            <div class="mt-2 h-1 w-full bg-foreground/5">
              <div
                class="h-full bg-primary transition-all"
                :style="{
                  width: `${membershipStore.membership.itemLimit > 0 ? ((membershipStore.membership.itemLimit - membershipStore.membership.borrowsRemaining) / membershipStore.membership.itemLimit) * 100 : 0}%`,
                }"
              />
            </div>
          </div>
          <div class="rounded-sm border border-border p-4">
            <p class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Auto-Renews
            </p>
            <p class="mt-1 font-serif text-sm font-bold">
              {{ membershipStore.membership.currentPeriodEnd ? new Date(membershipStore.membership.currentPeriodEnd).toLocaleDateString() : '-' }}
            </p>
          </div>
        </div>

        <div class="mt-6 flex flex-wrap items-center gap-3">
          <Button
            v-if="!membershipStore.membership.cancelAtPeriodEnd"
            variant="archivalOutline"
            :disabled="cancelling"
            @click="handleCancel"
          >
            {{ cancelling ? 'Cancelling...' : 'Cancel Subscription' }}
          </Button>
          <Button
            v-if="membershipStore.membership.cancelAtPeriodEnd"
            variant="archival"
            @click="membershipStore.reactivate()"
          >
            Reactivate
          </Button>
          <p v-if="cancelConfirm" class="text-sm text-muted-foreground">
            Cancel will take effect on {{ cancelDate }}. You can continue borrowing until then.
          </p>
        </div>
      </div>

      <!-- Subscribe Cards -->
      <div class="my-12 grid gap-6 md:grid-cols-3">
        <article
          v-for="plan in plans"
          :key="plan.name"
          class="relative flex flex-col rounded-sm border px-6 py-10 transition-colors"
          :class="
            plan.highlighted
              ? 'border-primary bg-card shadow-sm'
              : 'border-border bg-card'
          "
        >
          <span
            v-if="plan.badge"
            class="absolute -top-3 left-6 rounded-sm bg-primary px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-primary-foreground"
          >
            {{ plan.badge }}
          </span>

          <span
            v-if="membershipStore.membership?.plan === plan.id"
            class="absolute -top-3 right-6 rounded-sm border border-border bg-card px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
          >
            Current Plan
          </span>

          <p class="font-serif text-lg font-bold">{{ plan.name }}</p>

          <div class="mt-4 flex items-baseline gap-1">
            <template v-if="plan.monthlyPrice !== null">
              <span class="font-serif text-4xl font-bold"
                >${{ plan.monthlyPrice }}</span
              >
              <span class="font-mono text-xs text-muted-foreground"
                >/month</span
              >
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
            :disabled="plan.id === membershipStore.membership?.plan"
            @click="onSelect(plan)"
          >
            {{ plan.id === 'free' ? 'Get Started' : plan.id === membershipStore.membership?.plan ? 'Current' : 'Subscribe' }}
          </Button>
        </article>
      </div>

      <p class="mt-10 text-center text-[11px] leading-5 text-muted-foreground">
        All plans include free in-store pickup and returns. Prices in USD.
      </p>
    </main>
  </div>
</template>
