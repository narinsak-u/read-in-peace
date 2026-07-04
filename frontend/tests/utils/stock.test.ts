import { describe, it, expect } from "vitest";
import { stockActions } from "~/utils/stock";

const inStockBook = { id: "b1", inStock: 5, slug: "test-book" };
const outOfStockBook = { id: "b2", inStock: 0, slug: "sold-out" };
const lowStockBook = { id: "b3", inStock: 1, slug: "last-copy" };

describe("stockActions", () => {
  it("allows borrow and buy when in stock and not borrowed", () => {
    const result = stockActions(inStockBook, new Set());
    expect(result.isBorrowed).toBe(false);
    expect(result.canBorrow).toBe(true);
    expect(result.canBuy).toBe(true);
    expect(result.unavailable).toBe(false);
  });

  it("disables borrow when already borrowed, but buy still available", () => {
    const result = stockActions(inStockBook, new Set(["test-book"]));
    expect(result.isBorrowed).toBe(true);
    expect(result.canBorrow).toBe(false);
    expect(result.canBuy).toBe(true);
    expect(result.unavailable).toBe(false);
  });

  it("shows unavailable when out of stock and not borrowed", () => {
    const result = stockActions(outOfStockBook, new Set());
    expect(result.canBorrow).toBe(false);
    expect(result.canBuy).toBe(false);
    expect(result.unavailable).toBe(true);
  });

  it("canBorrow true when inStock >= 1 even if only 1", () => {
    const result = stockActions(lowStockBook, new Set());
    expect(result.canBorrow).toBe(true);
    expect(result.canBuy).toBe(false); // inStock < 2
  });

  it("isPurchased true when ownedCount > 0", () => {
    const counts = new Map([["b1", 1]]);
    const result = stockActions(inStockBook, new Set(), counts);
    expect(result.isPurchased).toBe(true);
    expect(result.ownedCount).toBe(1);
  });

  it("isPurchased false when purchasedCounts is undefined", () => {
    const result = stockActions(inStockBook, new Set());
    expect(result.isPurchased).toBe(false);
    expect(result.ownedCount).toBe(0);
  });

  it("isPurchased false when book not in purchased map", () => {
    const counts = new Map([["other", 2]]);
    const result = stockActions(inStockBook, new Set(), counts);
    expect(result.isPurchased).toBe(false);
    expect(result.ownedCount).toBe(0);
  });

  it("tracks ownedCount for multiple purchases", () => {
    const counts = new Map([["b1", 3]]);
    const result = stockActions(inStockBook, new Set(), counts);
    expect(result.isPurchased).toBe(true);
    expect(result.ownedCount).toBe(3);
  });
});
