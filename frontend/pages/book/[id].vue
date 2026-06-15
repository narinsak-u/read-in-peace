<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next';
import { useBooksStore } from '~/stores/books';
import { useCartStore } from '~/stores/cart';

const route = useRoute();
const id = route.params.id as string;

const { book, comments, hasBorrowed, handleLike, handleRate, handleBorrow } = useBookDetail(id);

const booksStore = useBooksStore();
const cartStore = useCartStore();

const reviewText = shallowRef('');
const reviewRating = shallowRef(0);
const submitting = shallowRef(false);

async function submitReview() {
  if (!reviewText.value.trim()) return;
  submitting.value = true;
  try {
    if (reviewRating.value > 0) {
      await booksStore.rateBook(id, reviewRating.value);
    }
    await booksStore.createComment(id, reviewText.value);
    reviewText.value = '';
    reviewRating.value = 0;
    await booksStore.fetchComments(id);
    await booksStore.fetchBook(id);
  } catch {
  } finally {
    submitting.value = false;
  }
}

function handleBuy() {
  cartStore.addItem({
    bookId: book.value!.id,
    title: book.value!.title,
    author: book.value!.author,
    cover: book.value!.cover,
    price: Number(book.value!.price),
    category: book.value!.category,
    crop: book.value!.crop,
  });
}

definePageMeta({
  layout: 'app',
  title: 'Book — Read in Pace',
});
</script>

<template>
  <main class="animate-enter mx-auto max-w-5xl px-6 md:px-0 py-10">
    <NuxtLink
      to="/explore"
      class="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft class="h-4 w-4" /> Back to explore
    </NuxtLink>

    <template v-if="book">
      <div class="grid grid-cols-1 gap-12 md:grid-cols-2 md:items-start">
        <!-- Left: Cover -->
        <div class="flex justify-center md:sticky md:top-24">
          <div class="w-full max-w-md">
            <div
              :class="`cover-crop cover-${book.crop}`"
              class="w-full overflow-hidden rounded-sm border border-border/60 shadow-md"
            >
              <img
                :src="book.cover"
                :alt="book.title"
                class="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>

        <!-- Right: Details -->
        <div>
          <div class="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase text-muted-foreground">
            <span>Shelf: {{ book.id.slice(0, 8).toUpperCase() }}</span>
          </div>
          <h1 class="font-serif text-3xl font-bold">{{ book.title }}</h1>
          <p class="mb-6 italic text-muted-foreground">by {{ book.author }}</p>

          <div class="mb-4 flex items-center gap-1">
            <span class="text-lg text-primary">
              {{ '★★★★★'.slice(0, Math.round(Number(book.avgRating))) }}
            </span>
            <span class="text-lg text-foreground/10">
              {{ '★★★★★'.slice(Math.round(Number(book.avgRating))) }}
            </span>
            <span class="ml-2 text-sm text-muted-foreground">
              {{ Number(book.avgRating).toFixed(1) }}
            </span>
          </div>

          <p class="mb-8 text-sm leading-relaxed">{{ book.synopsis }}</p>

          <!-- Borrow Card -->
          <div class="mb-4 flex items-center justify-between rounded-sm border border-border bg-card p-4">
            <div>
              <p class="text-sm font-semibold">Borrow this book</p>
              <p class="text-xs text-muted-foreground">21-day loan from date of borrow</p>
            </div>
            <Button
              variant="archival"
              :disabled="book.inStock < 1 || hasBorrowed"
              @click="handleBorrow"
            >
              {{ hasBorrowed ? 'Already borrowed' : book.inStock < 1 ? 'Unavailable' : `Borrow (${book.inStock} available)` }}
            </Button>
          </div>

          <!-- Purchase Card -->
          <div class="flex items-center justify-between rounded-sm border border-border bg-card p-4">
            <div>
              <p class="text-sm font-semibold">Buy for ${{ Number(book.price).toFixed(2) }}</p>
              <p class="text-xs text-muted-foreground">Permanent copy</p>
            </div>
            <Button
              variant="archivalOutline"
              :disabled="book.inStock < 1"
              @click="handleBuy"
            >
              Purchase
            </Button>
          </div>
        </div>
      </div>

      <!-- Reader Room -->
      <div class="mt-16">
        <div class="mb-6 flex items-baseline justify-between border-b border-border pb-2">
          <h2 class="font-serif text-2xl">Reader Room</h2>
          <span class="font-mono text-[10px] uppercase text-muted-foreground">
            {{ comments.length }} {{ comments.length === 1 ? 'review' : 'reviews' }}
          </span>
        </div>

        <template v-if="comments.length === 0">
          <p class="py-12 text-center text-muted-foreground italic">
            No reviews yet. Be the first to share your thoughts.
          </p>
        </template>

        <div v-else class="space-y-6">
          <article
            v-for="comment in comments"
            :key="comment.id"
            class="border-l border-foreground/5 pl-4"
          >
            <div class="mb-1 flex items-center gap-2">
              <span class="flex size-6 items-center justify-center rounded-full bg-muted text-[8px] font-bold">
                {{ comment.user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() }}
              </span>
              <span class="text-[11px] font-bold uppercase">{{ comment.user.name }}</span>
              <span class="font-mono text-[10px] text-muted-foreground">
                {{ new Date(comment.createdAt).toLocaleDateString() }}
              </span>
            </div>
            <p class="text-sm leading-snug text-foreground/80">{{ comment.text }}</p>
          </article>
        </div>

        <!-- Review Form -->
        <div class="mt-8 rounded-sm border border-border bg-card p-5">
          <h3 class="mb-3 font-serif text-lg">Add your thoughts</h3>
          <div class="mb-3 flex gap-1">
            <button
              v-for="n in 5"
              :key="n"
              type="button"
              :aria-label="`Rate ${n} stars`"
              @click="reviewRating = n"
              class="cursor-pointer text-lg"
              :class="n <= reviewRating ? 'text-primary' : 'text-border'"
            >
              {{ n <= reviewRating ? '★' : '☆' }}
            </button>
          </div>
          <textarea
            v-model="reviewText"
            rows="3"
            placeholder="What did you think of this book?"
            class="mb-3 w-full resize-none rounded-sm border border-border bg-input p-3 text-sm placeholder-muted-foreground focus:ring-1 focus:ring-ring"
          />
          <Button
            variant="archival"
            :disabled="!reviewText.trim() || submitting"
            @click="submitReview"
          >
            {{ submitting ? 'Publishing' : 'Publish Review' }}
          </Button>
        </div>
      </div>
    </template>
  </main>
</template>
