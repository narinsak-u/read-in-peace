<script setup lang="ts">
import {
  ArrowLeft, BookOpen, Check, Heart, MessageCircle, ShoppingBag, Star,
} from 'lucide-vue-next';
import { Button } from '~/components/ui/button';
import { useCartStore } from '~/stores/cart';

const route = useRoute();
const router = useRouter();
const cart = useCartStore();

const books: Record<string, {
  title: string;
  author: string;
  cover: string;
  crop: number | null;
  rating: number;
  ratings: number;
  price: string;
  available: number;
  shelf: string;
  pages: number;
  year: number;
  description: string;
}> = {
  'architecture-of-memory': {
    title: 'The Architecture of Memory', author: 'Elena Rossi-Vaughn', cover: '/images/architecture-memory.png', crop: null,
    rating: 4.2, ratings: 384, price: '21.00', available: 3, shelf: '720.1 ARC', pages: 340, year: 2026,
    description: 'A luminous inquiry into the buildings we remember and the rooms we cannot forget. Moving between memorials, family homes, and imagined cities, Rossi-Vaughn asks how architecture becomes an archive of private and collective life.',
  },
  'the-hidden-sea': {
    title: 'The Hidden Sea', author: 'Eliot Harbor', cover: '/images/book-cover-sheet.png', crop: 2,
    rating: 4.7, ratings: 612, price: '18.50', available: 5, shelf: '551.46 HAR', pages: 288, year: 2026,
    description: "A journey beneath the surface of the world's oceans, blending natural history, human curiosity, and the strange beauty of the deep into an unforgettable work of narrative nonfiction.",
  },
  'logic-and-form': {
    title: 'Logic & Form', author: 'Adrian Wakefield', cover: '/images/book-cover-sheet.png', crop: 3,
    rating: 4.3, ratings: 271, price: '24.00', available: 1, shelf: '160 WAK', pages: 312, year: 2025,
    description: 'Selected essays on reason, beauty, and the hidden structures that shape how we think. Precise without being austere, Wakefield makes philosophy feel wonderfully close at hand.',
  },
  'paper-shadows': {
    title: 'Paper Shadows', author: 'Maeve Lincoln', cover: '/images/book-cover-sheet.png', crop: 4,
    rating: 4.8, ratings: 908, price: '16.00', available: 0, shelf: 'FIC LIN', pages: 224, year: 2026,
    description: 'Seven short fictions about the stories we tell, the selves we leave behind, and the quiet thresholds between memory and invention.',
  },
  'the-long-night': {
    title: 'The Long Night', author: 'Daniel Hastings', cover: '/images/book-cover-sheet.png', crop: 5,
    rating: 4.1, ratings: 447, price: '19.99', available: 2, shelf: 'FIC HAS', pages: 368, year: 2025,
    description: 'When the world holds its breath, a remote household must decide what they owe one another. An atmospheric novel of isolation, loyalty, and the first light after darkness.',
  },
};

const bookId = route.params.id as string;
const book = books[bookId];

definePageMeta({
  title: 'Book — Read in Pace',
  description: 'Discover this book and join its reader discussion.',
});

useHead({
  title: computed(() => {
    const b = books[route.params.id as string];
    return b ? `${b.title} by ${b.author} — Read in Pace` : 'Book — Read in Pace';
  }),
  meta: computed(() => {
    const b = books[route.params.id as string];
    return b ? [{ name: 'description', content: b.description }] : [];
  }),
});

const borrowed = ref(false);
const saved = ref(false);
const rating = ref(0);
const reviewText = ref('');

interface Review {
  id: number;
  initials: string;
  name: string;
  time: string;
  rating: number;
  text: string;
  likes: number;
  replies: string[];
}

const reviews = ref<Review[]>([
  { id: 1, initials: 'AM', name: 'Aris M.', time: '14m ago', rating: 5, text: 'The chapter on brutalist memorials is devastating. I kept returning to its idea that a building can remember on our behalf.', likes: 12, replies: ['That was the passage that stayed with me too. — Mina K.'] },
  { id: 2, initials: 'LW', name: 'Leo Wang', time: '2h ago', rating: 4, text: 'Measured, elegant, and full of unexpected connections. The middle essays wander, but the final one brings everything home.', likes: 8, replies: [] },
]);

const replyingTo = ref<number | null>(null);
const replyText = ref('');
const notice = ref('');

function flash(message: string) {
  notice.value = message;
  window.setTimeout(() => { notice.value = ''; }, 2400);
}

function publishReview() {
  if (!rating.value || !reviewText.value.trim()) return;
  reviews.value.unshift({
    id: Date.now(),
    initials: 'JS',
    name: 'Jamie S.',
    time: 'Just now',
    rating: rating.value,
    text: reviewText.value.trim(),
    likes: 0,
    replies: [],
  });
  rating.value = 0;
  reviewText.value = '';
  flash('Your review is now part of the discussion.');
}

function publishReply(reviewId: number) {
  if (!replyText.value.trim()) return;
  reviews.value = reviews.value.map((r) =>
    r.id === reviewId ? { ...r, replies: [...r.replies, `${replyText.value.trim()} — Jamie S.`] } : r,
  );
  replyText.value = '';
  replyingTo.value = null;
}

function addLike(item: Review) {
  item.likes++;
}
</script>

<template>
  <div v-if="!book" class="flex min-h-screen items-center justify-center bg-background px-6 text-center">
    <div>
      <p class="font-mono text-xs uppercase text-primary">Catalog note 404</p>
      <h1 class="mt-2 font-serif text-4xl">This volume isn't on the shelf.</h1>
      <Button as-child variant="archival" class="mt-6">
        <NuxtLink to="/home">Return to library</NuxtLink>
      </Button>
    </div>
  </div>

  <div v-else class="min-h-screen bg-background pb-16 text-foreground">
    <header class="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
      <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        <NuxtLink to="/home" class="font-serif text-xl font-bold italic text-primary">Read in Pace</NuxtLink>
        <div class="flex items-center gap-2">
          <Button as-child variant="archivalGhost">
            <NuxtLink to="/home"><ArrowLeft /> Back to the stacks</NuxtLink>
          </Button>
          <Button variant="archivalGhost" size="icon" class="relative" @click="router.push('/cart')">
            <ShoppingBag />
            <span v-if="cart.itemCount > 0" class="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[8px] text-primary-foreground">{{ cart.itemCount }}</span>
          </Button>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-10 md:px-6 lg:py-14">
      <section class="animate-enter grid gap-10 border-b border-border pb-14 lg:grid-cols-[300px_1fr_280px] lg:gap-14">
        <div class="mx-auto w-full max-w-[300px]">
          <CoverImage :crop="book.crop" :src="book.cover" :alt="`${book.title} book cover`" class="aspect-[2/3] w-full shadow-2xl" />
        </div>

        <div class="flex flex-col justify-center">
          <div class="mb-5 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>{{ book.year }}</span><span>•</span><span>{{ book.pages }} pages</span><span>•</span><span>Shelf {{ book.shelf }}</span>
          </div>
          <h1 class="max-w-2xl font-serif text-4xl font-bold leading-tight md:text-6xl">{{ book.title }}</h1>
          <p class="mt-3 font-serif text-xl italic text-muted-foreground">by {{ book.author }}</p>
          <div class="mt-7 flex items-center gap-3">
            <span class="text-lg text-primary">★★★★<span class="text-foreground/10">★</span></span>
            <strong>{{ book.rating }}</strong>
            <span class="text-sm text-muted-foreground">from {{ book.ratings }} reader ratings</span>
          </div>
          <p class="mt-8 max-w-2xl text-base leading-7 text-foreground/75">{{ book.description }}</p>
          <div class="mt-8 flex flex-wrap gap-3">
            <Button variant="archivalGhost" @click="saved = !saved"><Heart :class="saved ? 'fill-current text-primary' : ''" /> {{ saved ? 'Saved to list' : 'Save to list' }}</Button>
            <Button variant="archivalGhost" @click="document.getElementById('discussion')?.scrollIntoView({ behavior: 'smooth' })"><MessageCircle /> Read discussion</Button>
          </div>
        </div>

        <aside class="self-center border border-border bg-card p-6 shadow-sm">
          <p class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Borrowing status</p>
          <div class="mt-4 flex items-start gap-3">
            <span :class="`mt-1 size-2 rounded-full ${book.available > 0 ? 'bg-primary' : 'bg-muted-foreground'}`" />
            <div>
              <p class="font-medium">{{ borrowed ? 'On your desk' : book.available > 0 ? 'Available now' : 'Currently checked out' }}</p>
              <p class="mt-1 text-xs leading-5 text-muted-foreground">{{ borrowed ? 'Due July 5, 2026 · 21-day loan' : book.available > 0 ? `${book.available} ${book.available === 1 ? 'copy' : 'copies'} ready to borrow` : 'Join the waitlist to be notified' }}</p>
            </div>
          </div>
          <Button class="mt-6 w-full" variant="archival" :disabled="borrowed" @click="() => { borrowed = true; flash(`${book.title} is now on your desk.`); }">
            <BookOpen /> {{ borrowed ? 'Borrowed' : book.available > 0 ? 'Borrow for 21 days' : 'Join waitlist' }}
          </Button>
          <div v-if="borrowed" class="mt-3 flex items-center gap-2 bg-accent px-3 py-2 text-xs text-accent-foreground">
            <Check class="size-4" /> Loan confirmed
          </div>
          <div class="my-6 border-t border-border" />
          <p class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Keep a copy</p>
          <p class="mt-2 font-serif text-3xl font-bold">${{ book.price }}</p>
          <p class="mt-1 text-xs text-muted-foreground">Hardcover · Ships in 2–3 days</p>
          <Button class="mt-4 w-full" variant="archivalOutline" @click="() => { cart.addItem({ id: bookId, title: book.title, author: book.author, price: Number(book.price), cover: book.cover, crop: book.crop }); flash(`${book.title} added to your basket.`); }">
            <ShoppingBag /> Purchase copy
          </Button>
        </aside>
      </section>

      <section id="discussion" class="scroll-mt-24 py-14">
        <div class="grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <div class="mb-8 flex items-end justify-between border-b border-border pb-3">
              <div>
                <p class="font-mono text-[10px] uppercase tracking-widest text-primary">Reader room</p>
                <h2 class="mt-1 font-serif text-3xl">Reviews & discussion</h2>
              </div>
              <span class="text-sm text-muted-foreground">{{ reviews.length }} conversations</span>
            </div>
            <div class="divide-y divide-border">
              <article v-for="item in reviews" :key="item.id" class="py-7 first:pt-0">
                <div class="flex gap-4">
                  <span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold">{{ item.initials }}</span>
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <strong class="text-sm">{{ item.name }}</strong>
                      <span class="font-mono text-[10px] text-muted-foreground">{{ item.time }}</span>
                      <span class="ml-auto text-sm text-primary" :aria-label="`${item.rating} out of 5 stars`">
                        {{ '★'.repeat(item.rating) }}<span class="text-foreground/10">{{ '★'.repeat(5 - item.rating) }}</span>
                      </span>
                    </div>
                    <p class="mt-3 max-w-3xl leading-7 text-foreground/80">{{ item.text }}</p>
                    <div class="mt-3 flex gap-2">
                      <Button size="sm" variant="archivalGhost" @click="addLike(item)">Like ({{ item.likes }})</Button>
                      <Button size="sm" variant="archivalGhost" @click="replyingTo = replyingTo === item.id ? null : item.id">Reply ({{ item.replies.length }})</Button>
                    </div>
                    <div v-if="item.replies.length > 0" class="mt-4 space-y-3 border-l border-primary/20 pl-4">
                      <p v-for="(text, i) in item.replies" :key="i" class="text-sm leading-6 text-muted-foreground">{{ text }}</p>
                    </div>
                    <div v-if="replyingTo === item.id" class="mt-4">
                      <textarea v-model="replyText" rows="2" placeholder="Write your reply..." class="w-full resize-none rounded-sm border border-border bg-card p-3 text-sm focus:ring-1 focus:ring-ring" />
                      <div class="mt-2 flex justify-end gap-2">
                        <Button size="sm" variant="archivalGhost" @click="() => { replyingTo = null; replyText = ''; }">Cancel</Button>
                        <Button size="sm" variant="archival" :disabled="!replyText.trim()" @click="publishReply(item.id)">Post Reply</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>

          <aside class="lg:sticky lg:top-28 lg:self-start">
            <div class="border border-border bg-card p-6">
              <p class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Add your voice</p>
              <h3 class="mt-2 font-serif text-lg">What did you think of this volume?</h3>
              <div class="mb-4 mt-4 flex gap-1" :aria-label="`Your rating: ${rating} out of 5`">
                <button v-for="value in 5" :key="value" type="button" :aria-label="`Rate ${value} stars`" @click="rating = value">
                  <Star :class="`size-6 ${value <= rating ? 'fill-current text-primary' : 'text-border'}`" />
                </button>
              </div>
              <textarea v-model="reviewText" rows="4" placeholder="Write from the margins..." class="w-full resize-none rounded-sm border border-border bg-card p-3 text-sm focus:ring-1 focus:ring-ring" />
              <Button class="mt-4 w-full" variant="archival" :disabled="!rating || !reviewText.trim()" @click="publishReview">Publish review</Button>
            </div>
          </aside>
        </div>
      </section>
    </main>

    <Teleport to="body">
      <div v-if="notice" role="status" class="fixed right-5 top-20 z-50 border border-border bg-foreground px-4 py-3 text-sm text-background shadow-xl">
        {{ notice }}
      </div>
    </Teleport>
  </div>
</template>
