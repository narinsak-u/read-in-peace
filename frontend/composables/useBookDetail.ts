import { ref, shallowRef, onMounted } from 'vue';
import { toast } from 'vue-sonner';
import { useBooksStore } from '~/stores/books';
import { useDashboardStore } from '~/stores/dashboard';
import { useAuthStore } from '~/stores/auth';

export function useBookDetail(id: string) {
  const booksStore = useBooksStore();
  const dashboard = useDashboardStore();
  const auth = useAuthStore();

  const book = ref<import('~/stores/books').BookWithMeta | null>(null);
  const comments = ref<import('~/stores/books').Comment[]>([]);
  const hasBorrowed = shallowRef(false);

  onMounted(async () => {
    book.value = await booksStore.fetchBook(id);
    comments.value = await booksStore.fetchComments(id);

    if (auth.signedIn) {
      await Promise.all([
        dashboard.fetchBorrows(),
        booksStore.fetchLikeStatus(id),
        booksStore.fetchUserRating(id),
      ]);
      hasBorrowed.value = dashboard.borrowed.some((b) => b.borrow.bookId === id);
    }
  });

  async function submitReview(text: string) {
    if (!text.trim()) return;
    await booksStore.createComment(id, text.trim());
    comments.value = await booksStore.fetchComments(id);
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
    if (book.value?.inStock === 1) {
      toast.error('Only one copy left — this book is borrow-only');
      return;
    }
    await dashboard.buyBook(id);
  }

  async function handleBorrow() {
    if (hasBorrowed.value) {
      toast.error('You have already borrowed this book');
      return;
    }
    if (!book.value?.isAvailable) {
      toast.error('Book is currently not available for borrowing');
      return;
    }
    await dashboard.borrowBook(id);
  }

  return {
    book,
    comments,
    hasBorrowed,
    handleLike,
    handleRate,
    handleBuy,
    handleBorrow,
    submitReview,
  };
}
