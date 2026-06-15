<script setup lang="ts">
import { BookMarked, Library } from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import { useAuthStore } from '~/stores/auth';
import { useDashboardStore } from '~/stores/dashboard';
import { useCartStore } from '~/stores/cart';
import type { BookWithMeta } from '~/stores/books';

const auth = useAuthStore();
const dashboard = useDashboardStore();
const cartStore = useCartStore();
const route = useRoute();
const tab = shallowRef<'borrowed' | 'purchased'>(
  (route.query.tab as 'borrowed' | 'purchased') || 'borrowed',
);

const borrowedBooks = computed(() => dashboard.borrowed);
const purchasedBooks = computed(() => dashboard.purchased);
const list = computed(() =>
  tab.value === 'borrowed' ? dashboard.borrowed : dashboard.purchased,
);

function setTab(t: 'borrowed' | 'purchased') {
  tab.value = t;
  navigateTo({ query: { tab: t } }, { replace: true });
}

onMounted(async () => {
  if (route.query.session_id) {
    try {
      await dashboard.confirmPurchase(route.query.session_id as string);
      cartStore.clear();
      toast.success('Purchase complete!');
    } catch {
      toast.error('Purchase confirmation failed');
    }
  }
  await Promise.all([dashboard.fetchBorrows(), dashboard.fetchPurchases()]);
});

definePageMeta({
  layout: 'app',
  title: 'My Shelf — Read in Pace',
});
</script>

<template>
  <div class="animate-enter">
    <p class="text-sm text-muted-foreground">Welcome back</p>
    <h1 class="mt-1 text-4xl font-semibold tracking-tight">
      {{ auth.user?.name || 'Reader' }}
    </h1>
  </div>

  <div class="animate-enter [animation-delay:100ms] flex gap-6 border-b border-border/60">
    <button
      @click="setTab('borrowed')"
      class="flex items-center gap-2 pb-3 cursor-pointer text-sm font-medium transition-all duration-200 border-b-2 -mb-px"
      :class="
        tab === 'borrowed'
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      "
    >
      <BookMarked class="h-4 w-4" /> Borrowed {{ borrowedBooks.length }}
    </button>
    <button
      @click="setTab('purchased')"
      class="flex items-center gap-2 pb-3 cursor-pointer text-sm font-medium transition-all duration-200 border-b-2 -mb-px"
      :class="
        tab === 'purchased'
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      "
    >
      <Library class="h-4 w-4" /> Purchased {{ purchasedBooks.length }}
    </button>
  </div>

  <div class="animate-enter [animation-delay:200ms]">
    <template v-if="list.length === 0">
      <div class="rounded-2xl border border-dashed border-border/60 py-20 text-center">
        <p class="text-muted-foreground">Nothing here yet.</p>
        <NuxtLink to="/explore" class="mt-3 inline-block text-sm font-medium text-primary hover:underline">
          Find something to read
        </NuxtLink>
      </div>
    </template>
    <template v-else>
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <BookCard
          v-for="item in list"
          :key="'borrow' in item ? item.borrow.id : item.purchase.id"
          :book="item.book as BookWithMeta"
          :variant="tab"
        />
      </div>
    </template>
  </div>
</template>
