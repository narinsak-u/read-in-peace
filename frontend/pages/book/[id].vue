<script setup lang="ts">
import { ArrowLeft, Star, Heart, MessageSquare, Share2 } from "lucide-vue-next";
import { useBooksStore } from "~/stores/books";
import { useDashboardStore } from "~/stores/dashboard";
import { useAuthStore } from "~/stores/auth";

const route = useRoute();
const id = route.params.id as string;

const booksStore = useBooksStore();
const dashboard = useDashboardStore();
const auth = useAuthStore();

const book = ref<any>(null);
const comments = ref<any[]>([]);
const draft = ref("");
const showCommentForm = ref(false);
const showShare = ref(false);

onMounted(async () => {
  book.value = await booksStore.fetchBook(id);
  comments.value = await booksStore.fetchComments(id);
  if (auth.signedIn) {
    booksStore.fetchLikeStatus(id);
    booksStore.fetchUserRating(id);
  }
});

async function submitReview() {
  if (!draft.value.trim()) return;
  await booksStore.createComment(id, draft.value.trim());
  comments.value = await booksStore.fetchComments(id);
  draft.value = "";
}

async function handleLike() {
  await booksStore.toggleLike(id);
}

async function handleRate(rating: number) {
  await booksStore.rateBook(id, rating);
  if (book.value) {
    book.value.avgRating = (await booksStore.fetchBook(id)).avgRating;
  }
}

async function handleBuy() {
  await dashboard.buyBook(id);
}

async function handleBorrow() {
  await dashboard.borrowBook(id);
}

definePageMeta({
  title: "Book — Read in Pace",
});
</script>

<template>
  <Navbar />
  <main class="mx-auto max-w-5xl px-6 md:px-0 py-10">
    <NuxtLink
      to="/feed"
      class="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft class="h-4 w-4" /> Back to feed
    </NuxtLink>

    <template v-if="book">
      <div class="grid grid-cols-1 gap-12 md:grid-cols-2 md:items-start">
        <!-- Left column: Book cover -->
        <div class="flex justify-center md:sticky md:top-24">
          <div class="w-full max-w-md">
            <div
              class="w-full overflow-hidden rounded-lg shadow-lg shadow-black/20"
            >
              <img
                :src="book.cover"
                :alt="book.title"
                class="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>

        <!-- Right column: Book details -->
        <div class="flex flex-col">
          <p
            class="mb-2 text-sm uppercase tracking-widest text-muted-foreground"
          >
            {{ book.author }}
          </p>
          <h1 class="text-4xl font-semibold tracking-tight sm:text-5xl">
            {{ book.title }}
          </h1>

          <div class="mt-5 flex items-center gap-4">
            <span
              class="rounded-full bg-primary-soft px-4 py-1.5 text-sm font-semibold text-primary"
            >
              ${{ Number(book.price).toFixed(2) }}
            </span>
            <div class="flex items-center gap-1 text-sm text-muted-foreground">
              <Star class="h-4 w-4 fill-foreground text-foreground" />
              {{ Number(book.avgRating).toFixed(1) }} · {{ comments.length }} comments
            </div>
          </div>

          <p class="mt-6 text-base leading-relaxed text-muted-foreground">
            {{ book.synopsis }}
          </p>

          <div class="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              @click="handleBuy"
              class="flex-1 rounded-lg bg-primary px-6 py-3.5 font-medium text-primary-foreground transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/30"
            >
              Buy Now — ${{ Number(book.price).toFixed(2) }}
            </button>
            <button
              @click="handleBorrow"
              class="flex-1 rounded-lg border border-border px-6 py-3.5 font-medium transition-colors hover:bg-muted"
            >
              Borrow
            </button>
          </div>

          <div class="mt-6 flex items-center gap-2">
            <button
              @click="handleLike"
              class="flex h-11 w-11 items-center cursor-pointer justify-center rounded-lg border border-border transition-all hover:bg-muted"
              :class="booksStore.liked[book.id] ? 'text-destructive' : ''"
            >
              <Heart
                class="h-4 w-4"
                :class="booksStore.liked[book.id] ? 'fill-current' : ''"
              />
            </button>
            <button
              @click="showCommentForm = !showCommentForm"
              class="flex h-11 w-11 items-center justify-center cursor-pointer rounded-lg border border-border transition-colors hover:bg-muted"
              :class="showCommentForm ? 'bg-muted' : ''"
            >
              <MessageSquare class="h-4 w-4" />
            </button>

            <div class="relative">
              <button
                @click="showShare = !showShare"
                class="flex h-11 w-11 items-center cursor-pointer justify-center rounded-lg border border-border transition-colors hover:bg-muted"
                :class="showShare ? 'bg-muted' : ''"
              >
                <Share2 class="h-4 w-4" />
              </button>
              <div
                v-if="showShare"
                class="absolute left-full top-0 ml-3 flex flex-col gap-1 rounded-lg border border-border bg-card p-2 shadow-lg whitespace-nowrap"
              >
                <SocialShare
                  v-for="network in ['facebook', 'x', 'linkedin', 'reddit', 'threads', 'whatsapp']"
                  :key="network"
                  :network="network"
                  :styled="true"
                  @click="showShare = false"
                />
              </div>
            </div>
          </div>

          <!-- Star rating input -->
          <div class="mt-6 flex items-center gap-1">
            <span class="text-sm text-muted-foreground mr-2">Your rating:</span>
            <button
              v-for="star in 5"
              :key="star"
              @click="handleRate(star)"
              class="cursor-pointer transition-colors hover:text-amber-400"
              :class="(booksStore.userRating[id] ?? 0) >= star ? 'text-amber-400' : 'text-muted-foreground/30'"
            >
              <Star class="h-5 w-5" :class="(booksStore.userRating[id] ?? 0) >= star ? 'fill-current' : ''" />
            </button>
            <span v-if="book" class="ml-2 text-sm text-muted-foreground">
              {{ Number(book.avgRating).toFixed(1) }} avg
            </span>
          </div>

          <!-- Comments section -->
          <section class="mt-12 border-t border-border pt-10">
            <h2 class="text-2xl font-semibold tracking-tight">Comments</h2>

            <form
              v-if="auth.signedIn && showCommentForm"
              @submit.prevent="submitReview"
              class="mt-6 rounded-lg border border-border bg-card p-4"
            >
              <textarea
                v-model="draft"
                placeholder="Leave a comment"
                rows="3"
                class="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <div class="flex justify-end">
                <button
                  type="submit"
                  class="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
                >
                  Post comment
                </button>
              </div>
            </form>

            <div class="mt-8 space-y-6">
              <div v-for="c in comments" :key="c.id" class="flex gap-4">
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
                >
                  {{ c.user.name.charAt(0).toUpperCase() }}
                </div>
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <p class="font-medium">{{ c.user.name }}</p>
                    <span class="text-xs text-muted-foreground">{{ new Date(c.createdAt).toLocaleDateString() }}</span>
                  </div>
                  <p class="mt-1 text-sm text-muted-foreground">{{ c.text }}</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </template>
    <template v-else>
      <div class="mx-auto max-w-xl px-6 py-24 text-center">
        <p>Book not found.</p>
        <NuxtLink to="/feed" class="mt-4 inline-block text-primary underline">
          Back to feed
        </NuxtLink>
      </div>
    </template>
  </main>
</template>
