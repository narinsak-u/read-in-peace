<script setup lang="ts">
import { Button } from "~/components/ui/button";
import { buttonVariants } from "~/components/ui/button/variants";

const route = useRoute();
const { notice, flash } = useFlash();

interface BookData {
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
}

const books: Record<string, BookData> = {
  "architecture-of-memory": {
    title: "The Architecture of Memory",
    author: "Elena Rossi-Vaughn",
    cover: "/images/architecture-memory.png",
    crop: null,
    rating: 4.2,
    ratings: 384,
    price: "21.00",
    available: 3,
    shelf: "720.1 ARC",
    pages: 340,
    year: 2026,
    description:
      "A luminous inquiry into the buildings we remember and the rooms we cannot forget. Moving between memorials, family homes, and imagined cities, Rossi-Vaughn asks how architecture becomes an archive of private and collective life.",
  },
  "the-hidden-sea": {
    title: "The Hidden Sea",
    author: "Eliot Harbor",
    cover: "/images/book-cover-sheet.png",
    crop: 2,
    rating: 4.7,
    ratings: 612,
    price: "18.50",
    available: 5,
    shelf: "551.46 HAR",
    pages: 288,
    year: 2026,
    description:
      "A journey beneath the surface of the world\u2019s oceans, blending natural history, human curiosity, and the strange beauty of the deep into an unforgettable work of narrative nonfiction.",
  },
  "logic-and-form": {
    title: "Logic & Form",
    author: "Adrian Wakefield",
    cover: "/images/book-cover-sheet.png",
    crop: 3,
    rating: 4.3,
    ratings: 271,
    price: "24.00",
    available: 1,
    shelf: "160 WAK",
    pages: 312,
    year: 2025,
    description:
      "Selected essays on reason, beauty, and the hidden structures that shape how we think. Precise without being austere, Wakefield makes philosophy feel wonderfully close at hand.",
  },
  "paper-shadows": {
    title: "Paper Shadows",
    author: "Maeve Lincoln",
    cover: "/images/book-cover-sheet.png",
    crop: 4,
    rating: 4.8,
    ratings: 908,
    price: "16.00",
    available: 0,
    shelf: "FIC LIN",
    pages: 224,
    year: 2026,
    description:
      "Seven short fictions about the stories we tell, the selves we leave behind, and the quiet thresholds between memory and invention.",
  },
  "the-long-night": {
    title: "The Long Night",
    author: "Daniel Hastings",
    cover: "/images/book-cover-sheet.png",
    crop: 5,
    rating: 4.1,
    ratings: 447,
    price: "19.99",
    available: 2,
    shelf: "FIC HAS",
    pages: 368,
    year: 2025,
    description:
      "When the world holds its breath, a remote household must decide what they owe one another. An atmospheric novel of isolation, loyalty, and the first light after darkness.",
  },
};

const bookId = route.params.id as string;
const book = computed(() => books[bookId]);

definePageMeta({
  layout: 'default',
});

useHead({
  title: computed(() => {
    const b = books[route.params.id as string];
    return b
      ? `${b.title} by ${b.author} \u2014 Read in Peace`
      : "Book \u2014 Read in Peace";
  }),
  meta: computed(() => {
    const b = books[route.params.id as string];
    return b ? [{ name: "description", content: b.description }] : [];
  }),
});
</script>

<template>
  <!-- Empty State -->
  <div
    v-if="!book"
    class="flex min-h-screen items-center justify-center bg-background px-6 text-center"
  >
    <div>
      <p class="font-mono text-xs uppercase text-primary">Catalog note 404</p>
      <h1 class="mt-2 font-serif text-4xl">This volume isn't on the shelf.</h1>
      <NuxtLink to="/feed" :class="buttonVariants({ variant: 'archival', className: 'mt-6' })">Return to library</NuxtLink>
    </div>
  </div>

  <div v-else class="min-h-screen bg-background pb-16 text-foreground">
    <Nav mode="book" />

    <main class="mx-auto max-w-7xl px-4 py-10 md:px-6 lg:py-14">
      <section
        class="animate-enter grid gap-10 border-b border-border pb-14 lg:grid-cols-[300px_1fr_280px] lg:gap-14"
      >
        <div class="mx-auto w-full max-w-[300px]">
          <CoverImage
            :crop="book.crop"
            :src="book.cover"
            :alt="`${book.title} book cover`"
            class="aspect-[2/3] w-full shadow-2xl"
          />
        </div>

        <BookHero :book="book" :flash="flash" />

        <BookBorrowCard :book="book" :book-id="bookId" :flash="flash" />
      </section>

      <BookReviews :flash="flash" />
    </main>
  </div>
</template>
