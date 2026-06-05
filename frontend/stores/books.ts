import { defineStore } from 'pinia';
import { ref, shallowRef, computed } from 'vue';
import { toast } from 'vue-sonner';
import type { Book } from '~/data/books';

export interface BookWithMeta extends Book {
  likeCount: number;
  commentCount: number;
  avgRating: number;
  inStock: number;
  isAvailable: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Comment {
  id: string;
  bookId: string;
  userId: string;
  text: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    image: string | null;
  };
}

export const useBooksStore = defineStore('books', () => {
  const books = ref<BookWithMeta[]>([]);
  const trending = ref<BookWithMeta[]>([]);
  const currentBook = ref<BookWithMeta | null>(null);
  const comments = ref<Comment[]>([]);
  const liked = ref<Record<string, boolean>>({});
  const userRating = ref<Record<string, number>>({});
  const meta = ref<PaginationMeta>({ page: 1, limit: 12, total: 0, totalPages: 0 });
  const loading = shallowRef(false);

  async function fetchBooks(page = 1, limit = 12, category?: string) {
    loading.value = true;
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (category && category !== 'All') params.set('category', category);

      const res = await $fetch<{ data: BookWithMeta[]; meta: PaginationMeta }>(`/api/books?${params}`);
      books.value = res.data;
      meta.value = res.meta;
    } finally {
      loading.value = false;
    }
  }

  async function fetchTrending() {
    const res = await $fetch<BookWithMeta[]>('/api/books/trending');
    trending.value = res;
  }

  async function fetchBook(id: string) {
    const res = await $fetch<BookWithMeta>(`/api/books/${id}`);
    currentBook.value = res;
    return res;
  }

  async function createBook(data: {
    title: string;
    author: string;
    price: string;
    cover: string;
    synopsis: string;
    category: string;
    trending?: boolean;
  }) {
    try {
      const res = await $fetch('/api/books', { method: 'POST', body: data });
      toast.success('Book created');
      return res;
    } catch (e: any) {
      if (e?.statusCode === 401) toast.error('Please sign in to create a book');
      else toast.error('Failed to create book');
      throw e;
    }
  }

  async function updateBook(id: string, data: Partial<{
    title: string;
    author: string;
    price: string;
    cover: string;
    synopsis: string;
    category: string;
    trending: boolean;
  }>) {
    try {
      const res = await $fetch(`/api/books/${id}`, { method: 'PUT', body: data });
      toast.success('Book updated');
      return res;
    } catch (e: any) {
      if (e?.statusCode === 401) toast.error('Please sign in to edit a book');
      else toast.error('Failed to update book');
      throw e;
    }
  }

  async function deleteBook(id: string) {
    try {
      await $fetch(`/api/books/${id}`, { method: 'DELETE' });
      toast.success('Book deleted');
    } catch (e: any) {
      if (e?.statusCode === 401) toast.error('Please sign in to delete a book');
      else toast.error('Failed to delete book');
      throw e;
    }
  }

  async function toggleLike(id: string) {
    try {
      const res = await $fetch<{ liked: boolean; likeCount: number }>(`/api/books/${id}/like`, {
        method: 'POST',
      });
      liked.value = { ...liked.value, [id]: res.liked };
      return res;
    } catch (e: any) {
      if (e?.statusCode === 401) toast.error('Please sign in to like a book');
      throw e;
    }
  }

  async function fetchLikeStatus(bookId: string) {
    try {
      const res = await $fetch<{ liked: boolean }>(`/api/books/${bookId}/like`, {
        method: 'GET',
      });
      liked.value = { ...liked.value, [bookId]: res.liked };
    } catch {
      // not signed in — ignore
    }
  }

  async function fetchUserRating(bookId: string) {
    try {
      const res = await $fetch<{ userRating: number | null }>(`/api/books/${bookId}/rate`, {
        method: 'GET',
      });
      if (res.userRating !== null) {
        userRating.value = { ...userRating.value, [bookId]: res.userRating };
      }
    } catch {
      // not signed in — ignore
    }
  }

  async function fetchComments(bookId: string) {
    const res = await $fetch<Comment[]>(`/api/books/${bookId}/comments`);
    comments.value = res;
    return res;
  }

  async function createComment(bookId: string, text: string) {
    try {
      return await $fetch(`/api/books/${bookId}/comments`, {
        method: 'POST',
        body: { text },
      });
    } catch (e: any) {
      if (e?.statusCode === 401) toast.error('Please sign in to comment');
      throw e;
    }
  }

  async function deleteComment(bookId: string, commentId: string) {
    try {
      await $fetch(`/api/books/${bookId}/comments/${commentId}`, {
        method: 'DELETE',
      });
    } catch (e: any) {
      if (e?.statusCode === 401) toast.error('Please sign in to delete a comment');
      throw e;
    }
  }

  async function rateBook(bookId: string, rating: number) {
    try {
      const res = await $fetch<{ avgRating: number; userRating: number }>(`/api/books/${bookId}/rate`, {
        method: 'POST',
        body: { rating },
      });
      userRating.value = { ...userRating.value, [bookId]: res.userRating };
      return res;
    } catch (e: any) {
      if (e?.statusCode === 401) toast.error('Please sign in to rate a book');
      throw e;
    }
  }

  return {
    books, trending, currentBook, comments, liked, userRating, meta, loading,
    fetchBooks, fetchTrending, fetchBook, createBook, updateBook, deleteBook,
    toggleLike, fetchLikeStatus, fetchUserRating, fetchComments, createComment, deleteComment, rateBook,
  };
});
