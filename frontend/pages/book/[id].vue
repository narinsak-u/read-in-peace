<script setup lang="ts">
import { ArrowLeft, Heart, MessageSquare } from 'lucide-vue-next';
import { useBooksStore } from '~/stores/books';
import { useAuthStore } from '~/stores/auth';

const route = useRoute();
const id = route.params.id as string;

const { book, comments, hasBorrowed, handleLike, handleRate, handleBuy, handleBorrow, submitReview } = useBookDetail(id);

const booksStore = useBooksStore();
const auth = useAuthStore();

const showCommentForm = shallowRef(false);

definePageMeta({
  title: 'Book — Read in Pace',
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
      <BookDetails :book="book" />

      <BookActions :book="book" :has-borrowed="hasBorrowed" @buy="handleBuy" @borrow="handleBorrow" />

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
        <BookShare />
      </div>

      <BookRating
        :avg-rating="Number(book.avgRating)"
        :user-rating="booksStore.userRating[id] ?? null"
        @rate="handleRate"
      />

      <BookComments
        :comments="comments"
        :signed-in="auth.signedIn"
        :show-comment-form="showCommentForm"
        @submit="submitReview"
      />
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
