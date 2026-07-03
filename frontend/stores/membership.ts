import { defineStore } from 'pinia';
import { shallowRef, watch } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { useFlash } from '~/composables/useFlash';

export interface MembershipInfo {
  id: string;
  plan: string;
  status: string;
  itemLimit: number;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  activeBorrows: number;
  borrowsRemaining: number;
}

export const useMembershipStore = defineStore('membership', () => {
  const membership = shallowRef<MembershipInfo | null>(null);
  const loading = shallowRef(false);
  const { flash } = useFlash();
  const auth = useAuthStore();

  async function fetchMembership() {
    if (!auth.signedIn) {
      membership.value = null;
      return;
    }
    loading.value = true;
    try {
      membership.value = await $fetch<MembershipInfo>('/api/membership/me');
    } catch {
      membership.value = null;
    } finally {
      loading.value = false;
    }
  }

  async function checkout(plan: string) {
    try {
      const res = await $fetch<{ url: string }>('/api/membership/checkout', {
        method: 'POST',
        body: { plan },
      });
      await navigateTo(res.url, { external: true });
    } catch (e: any) {
      flash(e?.data?.message || 'Failed to start checkout');
    }
  }

  async function cancel(): Promise<string | null> {
    try {
      const res = await $fetch<{ effectiveDate: string }>(
        '/api/membership/cancel',
        { method: 'POST' },
      );
      await fetchMembership();
      return res.effectiveDate;
    } catch (e: any) {
      flash(e?.data?.message || 'Failed to cancel subscription');
      return null;
    }
  }

  async function reactivate() {
    try {
      await $fetch('/api/membership/reactivate', { method: 'POST' });
      await fetchMembership();
      flash('Subscription reactivated');
    } catch (e: any) {
      flash(e?.data?.message || 'Failed to reactivate');
    }
  }

  watch(
    () => auth.signedIn,
    (signedIn) => {
      if (signedIn) {
        fetchMembership();
      } else {
        membership.value = null;
      }
    },
    { immediate: true },
  );

  return {
    membership: readonly(membership),
    loading: readonly(loading),
    fetchMembership,
    checkout,
    cancel,
    reactivate,
  };
});
