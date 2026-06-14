<script setup lang="ts">
import { BookMarked, Library } from "lucide-vue-next";
import { toast } from "vue-sonner";
import { useAuthStore } from "~/stores/auth";
import { useDashboardStore } from "~/stores/dashboard";

const auth = useAuthStore();
const dashboard = useDashboardStore();
const route = useRoute();
const tab = shallowRef<"borrowed" | "purchased">(
  (route.query.tab as "borrowed" | "purchased") || "borrowed",
);

const borrowedBooks = computed(() => dashboard.borrowed);
const purchasedBooks = computed(() => dashboard.purchased);
const list = computed(() =>
  tab.value === "borrowed" ? dashboard.borrowed : dashboard.purchased,
);

onMounted(async () => {
  if (route.query.session_id) {
    try {
      await dashboard.confirmPurchase(route.query.session_id as string);
      toast.success("Purchase complete!");
    } catch {
      toast.error("Purchase confirmation failed");
    }
  }
  await Promise.all([dashboard.fetchBorrows(), dashboard.fetchPurchases()]);
});

definePageMeta({
  title: "My Dashboard — Read in Pace",
});
</script>

<template>
  <Navbar />
  <main class="mx-auto max-w-5xl px-6 md:px-0 py-10">
    <div class="mb-10">
      <p class="text-sm text-muted-foreground">Welcome back</p>
      <h1 class="mt-1 text-4xl font-semibold tracking-tight">
        {{ auth.user?.name || "Reader" }}
      </h1>
    </div>

    <div class="mb-8 flex gap-6 border-b border-border/60">
      <button
        @click="tab = 'borrowed'"
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
        @click="tab = 'purchased'"
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

    <template v-if="list.length === 0">
      <div
        class="rounded-2xl border border-dashed border-border/60 py-20 text-center"
      >
        <p class="text-muted-foreground">Nothing here yet.</p>
        <NuxtLink
          to="/feed"
          class="mt-3 inline-block text-sm font-medium text-primary hover:underline"
        >
          Find something to read
        </NuxtLink>
      </div>
    </template>
    <template v-else>
      <div
        class="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
      >
        <BookCard
          v-for="item in list"
          :key="item.borrow?.id || item.purchase?.id"
          :book="item.book"
          :variant="tab"
        />
      </div>
    </template>
  </main>
</template>
