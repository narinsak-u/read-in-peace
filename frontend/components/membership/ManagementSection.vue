<script setup lang="ts">
import { Button } from '~/components/ui/button';
import { useMembershipStore } from '~/stores/membership';
import { plans } from '~/utils/plans';

const membershipStore = useMembershipStore();
const cancelling = shallowRef(false);
const showCancelDialog = shallowRef(false);
const cancelConfirm = shallowRef(false);
const cancelDate = shallowRef<string | null>(null);

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

const borrowProgress = computed(() => {
  const m = membershipStore.membership;
  if (!m || m.itemLimit <= 0) return 0;
  return ((m.itemLimit - m.borrowsRemaining) / m.itemLimit) * 100;
});

async function handleCancel() {
  cancelling.value = true;
  showCancelDialog.value = false;
  const effectiveDate = await membershipStore.cancel();
  if (effectiveDate) {
    cancelDate.value = new Date(effectiveDate).toLocaleDateString();
    cancelConfirm.value = true;
  }
  cancelling.value = false;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString();
}
</script>

<template>
  <div class="my-12 rounded-sm border border-border bg-card p-6">
    <div class="flex items-center justify-between">
      <div>
        <p class="font-mono text-[10px] uppercase tracking-widest text-primary">
          Current Plan
        </p>
        <h2 class="mt-1 font-serif text-2xl font-bold">{{ currentPlanName }}</h2>
        <p class="mt-1 text-sm text-muted-foreground">
          Status:
          <span class="text-primary capitalize">{{ membershipStore.membership?.status }}</span>
        </p>
      </div>
      <span
        v-if="membershipStore.membership?.cancelAtPeriodEnd"
        class="rounded-sm border border-orange-500/30 bg-orange-500/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-orange-500"
      >
        Cancels on {{ membershipStore.membership.currentPeriodEnd ? formatDate(membershipStore.membership.currentPeriodEnd) : '' }}
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
          {{ membershipStore.membership?.borrowsRemaining }}
        </p>
        <div class="mt-2 h-1 w-full bg-foreground/5">
          <div class="h-full bg-primary transition-all" :style="{ width: `${borrowProgress}%` }" />
        </div>
      </div>
      <div class="rounded-sm border border-border p-4">
        <p class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Auto-Renews
        </p>
        <p class="mt-1 font-serif text-sm font-bold">
          {{ membershipStore.membership?.currentPeriodEnd ? formatDate(membershipStore.membership.currentPeriodEnd) : '-' }}
        </p>
      </div>
    </div>

    <div class="mt-6 flex flex-wrap items-center gap-3">
      <Button
        v-if="!membershipStore.membership?.cancelAtPeriodEnd"
        variant="archivalOutline"
        :disabled="cancelling"
        @click="showCancelDialog = true"
      >
        Cancel Subscription
      </Button>
      <Button
        v-if="membershipStore.membership?.cancelAtPeriodEnd"
        variant="archival"
        @click="membershipStore.reactivate()"
      >
        Reactivate
      </Button>
      <p
        v-if="cancelConfirm || membershipStore.membership?.cancelAtPeriodEnd"
        class="text-sm text-muted-foreground"
      >
        Cancel will take effect on
        {{ membershipStore.membership?.currentPeriodEnd ? formatDate(membershipStore.membership.currentPeriodEnd) : '-' }}.
        You can continue borrowing until then.
      </p>
    </div>

    <div
      v-if="showCancelDialog"
      class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <div class="mx-4 w-full max-w-sm rounded-sm border border-border bg-card p-6 shadow-lg">
        <p class="font-serif text-lg font-bold">Cancel Subscription?</p>
        <p class="mt-2 text-sm text-muted-foreground">
          Your plan will remain active until the end of the billing period.
          You'll lose access to premium features after that.
        </p>
        <div class="mt-6 flex gap-3">
          <Button variant="archival" class="flex-1" :disabled="cancelling" @click="handleCancel">
            {{ cancelling ? 'Cancelling...' : 'Yes, Cancel' }}
          </Button>
          <Button variant="archivalOutline" class="flex-1" :disabled="cancelling" @click="showCancelDialog = false">
            Keep Subscription
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
