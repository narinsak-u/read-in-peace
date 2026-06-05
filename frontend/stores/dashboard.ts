import { defineStore } from 'pinia';
import { shallowRef } from 'vue';
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
  const borrowed = shallowRef<BorrowRecord[]>([]);
  const purchased = shallowRef<PurchaseRecord[]>([]);

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
      toast.success('Book borrowed');
    } catch (e: any) {
      if (e?.statusCode === 401) toast.error('Please sign in to borrow a book');
      else toast.error('Failed to borrow book');
      throw e;
    }
  }

  async function returnBook(id: string) {
    try {
      await $fetch(`/api/books/${id}/return`, { method: 'POST' });
      await fetchBorrows();
      toast.success('Book returned');
    } catch (e: any) {
      if (e?.statusCode === 401) toast.error('Please sign in to return a book');
      else toast.error('Failed to return book');
      throw e;
    }
  }

  async function buyBook(id: string) {
    try {
      const res = await $fetch<{ url: string }>(
        `/api/books/${id}/create-checkout-session`,
        { method: 'POST' },
      );
      window.location.href = res.url;
    } catch (e: any) {
      if (e?.statusCode === 401) toast.error('Please sign in to buy a book');
      else toast.error(e?.message || 'Failed to start checkout');
      throw e;
    }
  }

  async function confirmPurchase(sessionId: string) {
    await $fetch(`/api/confirm-purchase?session_id=${sessionId}`, {
      method: 'POST',
    });
    await fetchPurchases();
  }

  return { borrowed, purchased, fetchBorrows, fetchPurchases, borrowBook, returnBook, buyBook, confirmPurchase };
});
