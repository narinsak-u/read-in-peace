<script setup lang="ts">
import { CheckCircle, BookOpen } from 'lucide-vue-next';
import { useAuthStore } from '~/stores/auth';
import { usePurchases } from '~/composables/usePurchases';

definePageMeta({
  title: 'Dashboard — Read in Peace',
  description: 'Your purchases and reading activity.',
});

const route = useRoute();
const router = useRouter();
const { flash } = useFlash();
const auth = useAuthStore();

const tab = shallowRef<'purchased'>('purchased');
const confirming = shallowRef(false);

const {
  purchases,
  loaded,
  confirmPurchase,
  refresh,
} = usePurchases();

async function onConfirmPurchase(sessionId: string) {
  confirming.value = true;
  try {
    await confirmPurchase(sessionId);
    flash('Purchase confirmed! Welcome to your library.');
    await router.replace({ query: {} });
  } catch (e: any) {
    flash(e?.data?.message || 'Could not confirm purchase.');
  } finally {
    confirming.value = false;
  }
}

onMounted(async () => {
  const sessionId = route.query.session_id as string | undefined;
  if (sessionId) {
    await onConfirmPurchase(sessionId);
  }
  await refresh();
});
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <Nav mode="cart" />
    <main class="mx-auto max-w-6xl px-4 py-10 md:px-6 lg:py-14">
      <div class="border-b border-border pb-5">
        <p class="font-mono text-[10px] uppercase tracking-widest text-primary">
          Your collection
        </p>
        <h1 class="mt-2 font-serif text-4xl font-bold md:text-5xl">
          My Library
        </h1>
      </div>

      <!-- Tabs -->
      <div class="mt-6 flex gap-1 border-b border-border">
        <button
          class="border-b-2 cursor-pointer px-4 py-2 font-serif text-sm transition-colors"
          :class="
            tab === 'purchased'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          "
          @click="tab = 'purchased'"
        >
          Purchased
        </button>
        <button
          class="border-b-2 px-4 py-2 font-serif text-sm transition-colors"
          :class="
            tab === 'borrowed'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          "
          @click="tab = 'borrowed'"
        >
          Borrowed
        </button>
      </div>

      <div v-if="confirming" class="mt-8 text-center">
        <p class="font-serif italic text-muted-foreground">
          Confirming your purchase...
        </p>
      </div>

      <div v-else-if="!auth.signedIn" class="mt-16 text-center">
        <BookOpen class="mx-auto size-10 text-muted-foreground" />
        <h2 class="mt-4 font-serif text-2xl">Sign in to see your library</h2>
        <p class="mt-2 text-sm text-muted-foreground">
          <button
            class="text-primary hover:underline"
            @click="auth.openAuthModal()"
          >
            Sign in
          </button>
          to view your library.
        </p>
      </div>

      <!-- Purchased tab -->
      <template v-else-if="tab === 'purchased'">
        <div v-if="!loaded" class="mt-16 text-center">
          <p class="font-serif italic text-muted-foreground">
            Loading your purchases...
          </p>
        </div>

        <div v-else-if="purchases.length === 0" class="mt-16 text-center">
          <BookOpen class="mx-auto size-10 text-muted-foreground" />
          <h2 class="mt-4 font-serif text-2xl">No purchases yet</h2>
          <p class="mt-2 text-sm text-muted-foreground">
            Books you buy will appear here. Browse the library to find your next
            keep.
          </p>
          <NuxtLink
            to="/feed"
            class="mt-6 inline-block rounded-sm bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
          >
            Browse the library
          </NuxtLink>
        </div>

        <div v-else class="mt-8 divide-y divide-border">
          <article
            v-for="entry in purchases"
            :key="entry.purchase?.id ?? entry.book?.id"
            class="flex gap-5 py-6"
          >
            <CoverImage
              :crop="entry.book?.crop ?? null"
              :src="entry.book?.cover ?? ''"
              :alt="`${entry.book?.title ?? 'Book'} cover`"
              class="h-28 w-20 shrink-0 shadow-md"
            />
            <div class="flex min-w-0 flex-1 flex-col justify-center">
              <h2 class="font-serif text-lg font-bold">
                <NuxtLink
                  :to="`/book/${entry.book?.slug ?? entry.book?.id}`"
                  class="hover:text-primary"
                >
                  {{ entry.book?.title ?? "Unknown Title" }}
                </NuxtLink>
              </h2>
              <p class="mt-0.5 text-sm italic text-muted-foreground">
                by {{ entry.book?.author ?? "Unknown" }}
              </p>
              <p class="mt-2 font-mono text-xs text-primary">
                ${{ entry.book?.price ?? "0" }}
              </p>
              <p
                v-if="entry.purchase?.purchasedAt"
                class="mt-1 font-mono text-[10px] text-muted-foreground"
              >
                Purchased
                {{ new Date(entry.purchase.purchasedAt).toLocaleDateString() }}
              </p>
            </div>
            <div class="flex items-center">
              <CheckCircle class="size-5 text-primary" />
            </div>
          </article>
        </div>
      </template>

      <!-- Borrowed tab -->
      <template v-else>
        <div v-if="!library.borrowsLoaded" class="mt-16 text-center">
          <p class="font-serif italic text-muted-foreground">
            Loading your borrows...
          </p>
        </div>

        <div v-else-if="library.borrows.length === 0" class="mt-16 text-center">
          <BookOpen class="mx-auto size-10 text-muted-foreground" />
          <h2 class="mt-4 font-serif text-2xl">No active borrows</h2>
          <p class="mt-2 text-sm text-muted-foreground">
            Books you borrow will appear here. Browse the library to find your
            next read.
          </p>
          <NuxtLink
            to="/feed"
            class="mt-6 inline-block rounded-sm bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
          >
            Browse the library
          </NuxtLink>
        </div>

        <div v-else class="mt-8 divide-y divide-border">
          <article
            v-for="loan in library.borrows"
            :key="loan.borrowId"
            class="flex gap-5 py-6"
          >
            <CoverImage
              :crop="loan.crop"
              :src="loan.cover"
              :alt="`${loan.title} cover`"
              class="h-28 w-20 shrink-0 shadow-md"
            />
            <div class="flex min-w-0 flex-1 flex-col justify-center">
              <h2 class="font-serif text-lg font-bold">
                <NuxtLink
                  :to="`/book/${loan.bookSlug}`"
                  class="hover:text-primary"
                >
                  {{ loan.title }}
                </NuxtLink>
              </h2>
              <p class="mt-0.5 text-sm italic text-muted-foreground">
                by {{ loan.author }}
              </p>
              <p class="mt-1 font-mono text-[10px] text-muted-foreground">
                Due {{ new Date(loan.dueAt).toLocaleDateString() }}
              </p>
              <div class="mt-2">
                <div
                  class="h-1.5 w-full max-w-[200px] overflow-hidden rounded-full bg-foreground/5"
                >
                  <div
                    class="h-full bg-primary transition-all"
                    :style="{
                      width: `${loan.totalPages > 0 ? Math.round((loan.currentPage / loan.totalPages) * 100) : 0}%`,
                    }"
                  />
                </div>
                <p class="mt-1 font-mono text-[10px] text-muted-foreground">
                  Page {{ loan.currentPage }} of {{ loan.totalPages }}
                </p>
              </div>
            </div>
            <div class="flex items-start">
              <button
                class="rounded-sm border border-border px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                @click="returnBook(loan.bookId, loan.title)"
              >
                Return
              </button>
            </div>
          </article>
        </div>
      </template>
    </main>
  </div>
</template>
