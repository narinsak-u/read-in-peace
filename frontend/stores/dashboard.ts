import { defineStore } from 'pinia';
import { ref } from 'vue';
import { toast } from 'vue-sonner';
import type { Book } from '~/data/books';

interface BorrowRecord {
  borrow: {
    id: string;
    bookId: string;
    userId: string;
    borrowedAt: string;
    returnedAt: string | null;
  };
  book: Book;
}

interface PurchaseRecord {
  purchase: {
    id: string;
    bookId: string;
    userId: string;
    purchasedAt: string;
  };
  book: Book;
}

export const useDashboardStore = defineStore('dashboard', () => {
  const borrowed = ref<BorrowRecord[]>([]);
  const purchased = ref<PurchaseRecord[]>([]);

  async function fetchBorrows() {
    const res = await $fetch<BorrowRecord[]>('/api/user/borrows');
    borrowed.value = res;
  }

  async function fetchPurchases() {
    const res = await $fetch<PurchaseRecord[]>('/api/user/purchases');
    purchased.value = res;
  }

  async function borrowBook(id: string) {
    try {
      await $fetch(`/api/books/${id}/borrow`, { method: 'POST' });
      await fetchBorrows();
    } catch (e: any) {
      if (e?.statusCode === 401) toast.error('Please sign in to borrow a book');
      throw e;
    }
  }

  async function returnBook(id: string) {
    try {
      await $fetch(`/api/books/${id}/return`, { method: 'POST' });
      await fetchBorrows();
    } catch (e: any) {
      if (e?.statusCode === 401) toast.error('Please sign in to return a book');
      throw e;
    }
  }

  async function buyBook(id: string) {
    try {
      await $fetch(`/api/books/${id}/buy`, { method: 'POST' });
      await fetchPurchases();
    } catch (e: any) {
      if (e?.statusCode === 401) toast.error('Please sign in to buy a book');
      throw e;
    }
  }

  return { borrowed, purchased, fetchBorrows, fetchPurchases, borrowBook, returnBook, buyBook };
});
