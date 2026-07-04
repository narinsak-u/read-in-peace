import { describe, it, expect } from 'vitest';
import { mapBorrowResponse, type BorrowsResponse } from '~/composables/useBorrows';

const entry: BorrowsResponse['data'][number] = {
  borrow: { id: 'br1', dueAt: '2026-07-18T12:00:00Z', currentPage: 42, totalPages: 200 },
  book: {
    id: 'b1', slug: 'test-book', title: 'Test Book', author: 'Author',
    cover: 'cover.jpg', crop: 30, shelf: 'FIC', category: 'fiction',
    price: '12.99', inStock: 5, avgRating: 4.2, ratingsCount: 10,
  },
};

describe('mapBorrowResponse', () => {
  it('maps a complete borrow entry', () => {
    const item = mapBorrowResponse(entry);
    expect(item.borrowId).toBe('br1');
    expect(item.bookId).toBe('b1');
    expect(item.bookSlug).toBe('test-book');
    expect(item.title).toBe('Test Book');
    expect(item.author).toBe('Author');
    expect(item.cover).toBe('cover.jpg');
    expect(item.crop).toBe(30);
    expect(item.shelf).toBe('FIC');
    expect(item.category).toBe('fiction');
    expect(item.dueAt).toBe('2026-07-18T12:00:00Z');
    expect(item.currentPage).toBe(42);
    expect(item.totalPages).toBe(200);
    expect(item.price).toBe('12.99');
    expect(item.inStock).toBe(5);
    expect(item.avgRating).toBe(4.2);
    expect(item.ratingsCount).toBe(10);
  });

  it('falls back to book id for slug when slug is missing', () => {
    const noSlug = {
      ...entry,
      book: { ...entry.book, slug: undefined },
    };
    const item = mapBorrowResponse(noSlug as any);
    expect(item.bookSlug).toBe('b1');
  });

  it('falls back to GEN for missing shelf', () => {
    const noShelf = {
      ...entry,
      book: { ...entry.book, shelf: undefined },
    };
    const item = mapBorrowResponse(noShelf as any);
    expect(item.shelf).toBe('GEN');
  });

  it('coerces numeric price to string', () => {
    const numPrice = {
      ...entry,
      book: { ...entry.book, price: 9.99 },
    };
    const item = mapBorrowResponse(numPrice as any);
    expect(item.price).toBe('9.99');
  });

  it('defaults avgRating to 0 when missing', () => {
    const noRating = {
      ...entry,
      book: { ...entry.book, avgRating: undefined },
    };
    const item = mapBorrowResponse(noRating as any);
    expect(item.avgRating).toBe(0);
  });

  it('defaults inStock to 0 when missing', () => {
    const noStock = {
      ...entry,
      book: { ...entry.book, inStock: undefined },
    };
    const item = mapBorrowResponse(noStock as any);
    expect(item.inStock).toBe(0);
  });

  it('defaults category to empty string when missing', () => {
    const noCat = {
      ...entry,
      book: { ...entry.book, category: undefined },
    };
    const item = mapBorrowResponse(noCat as any);
    expect(item.category).toBe('');
  });
});
