import { describe, it, expect } from "vitest";
import { computeDiscount } from "~/utils/discount";

function item(overrides: Partial<{
  id: string;
  title: string;
  author: string;
  price: number;
  cover: string;
  crop: number | null;
  quantity: number;
  stock: number;
  category: string;
}> = {}) {
  return {
    id: overrides.id ?? "b1",
    title: overrides.title ?? "Test Book",
    author: overrides.author ?? "Test Author",
    price: overrides.price ?? 10,
    cover: overrides.cover ?? "cover.jpg",
    crop: overrides.crop ?? null,
    quantity: overrides.quantity ?? 1,
    stock: overrides.stock ?? 10,
    category: overrides.category ?? "fiction",
  };
}

describe("computeDiscount", () => {
  it("returns zeroed breakdown for empty cart", () => {
    const result = computeDiscount([], 0);
    expect(result).toEqual({
      subtotal: 0,
      tierPercent: 0,
      tierDiscount: 0,
      categoryBonus: 0,
      every100Discount: 0,
      planDiscount: 0,
      total: 0,
    });
  });

  it("applies 10% tier discount for 2 items", () => {
    const result = computeDiscount(
      [item({ id: "a", category: "cat_a" }), item({ id: "b", category: "cat_b" })],
      0,
    );
    // subtotal = 2000¢, tier 10% = 200¢, total = 1800¢
    expect(result.subtotal).toBe(2000);
    expect(result.tierPercent).toBe(10);
    expect(result.tierDiscount).toBe(200);
    expect(result.total).toBe(1800);
  });

  it("applies 20% tier discount for 3 items", () => {
    const result = computeDiscount(
      [
        item({ id: "a", category: "cat_a" }),
        item({ id: "b", category: "cat_b" }),
        item({ id: "c", category: "cat_c" }),
      ],
      0,
    );
    expect(result.tierPercent).toBe(20);
    expect(result.tierDiscount).toBe(600);
    expect(result.total).toBe(2400);
  });

  it("applies 30% tier discount for 4+ items", () => {
    const result = computeDiscount(
      [
        item({ id: "a", category: "cat_a" }),
        item({ id: "b", category: "cat_b" }),
        item({ id: "c", category: "cat_c" }),
        item({ id: "d", category: "cat_d" }),
        item({ id: "e", category: "cat_e" }),
      ],
      0,
    );
    expect(result.tierPercent).toBe(30);
    expect(result.tierDiscount).toBe(1500);
    expect(result.total).toBe(3500);
  });

  it("applies category bonus when 2+ items share a category", () => {
    const result = computeDiscount(
      [
        item({ id: "a", category: "fiction", price: 10, quantity: 1 }),
        item({ id: "b", category: "fiction", price: 20, quantity: 1 }),
      ],
      0,
    );
    // subtotal = 3000¢ (1000 + 2000)
    // tier 10% = 300¢ → 2700
    // category bonus: fiction subtotal = 3000¢, count=2 → 300¢
    // 2700 - 300 = 2400
    // every100: floor(2400/10000) = 0, no discount
    // total = 2400
    expect(result.subtotal).toBe(3000);
    expect(result.tierDiscount).toBe(300);
    expect(result.categoryBonus).toBe(300);
    expect(result.total).toBe(2400);
  });

  it("applies every-$100 discount when running total exceeds $100", () => {
    const items = Array.from({ length: 12 }, (_, i) =>
      item({ id: `b${i}`, price: 15, quantity: 1 }),
    );
    const result = computeDiscount(items, 0);
    // subtotal = 18000¢
    // tier 30% = 5400¢ → 12600
    // category bonus = 10% of each category's subtotal where count >= 2
    // all same cat → 18000 * 0.1 = 1800¢
    // 12600 - 1800 = 10800
    // every100: floor(10800 / 10000) = 1 → 100¢
    expect(result.every100Discount).toBe(100);
  });

  it("applies plan discount on running total after all other discounts", () => {
    const result = computeDiscount([item({ price: 100 })], 15);
    // subtotal = 10000¢, tier 0%, category bonus 0
    // every100: floor(10000 / 10000) = 1 → 100¢ → 9900
    // plan 15%: round(9900 * 0.15) = 1485¢ → 9900 - 1485 = 8415
    expect(result.planDiscount).toBe(1485);
    expect(result.total).toBe(8415);
  });

  it("never returns negative total", () => {
    // extreme discounts should floor at 0
    const result = computeDiscount(
      [item({ price: 5, quantity: 1 })],
      100,
    );
    // subtotal = 500¢, tier 0, cat 0, every100 0
    // plan 100%: round(500 * 1) = 500 → 0
    expect(result.total).toBe(0);
  });

  it("handles multiple items with different quantities and prices", () => {
    const result = computeDiscount(
      [
        item({ id: "a", price: 9.99, quantity: 2 }),
        item({ id: "b", price: 14.99, quantity: 1 }),
      ],
      0,
    );
    // subtotal = 2*999 + 1*1499 = 3497¢
    // tier 10% = 350¢ → 3147
    // cat bonus: same cat, subtotal 3497, count 2 → 350¢
    // 3147 - 350 = 2797
    // every100: floor(2797/10000) = 0
    // total = 2797
    expect(result.subtotal).toBe(3497);
    expect(result.tierPercent).toBe(10);
    expect(result.categoryBonus).toBe(350);
    expect(result.total).toBe(2797);
  });

  it("rounds cents correctly in subtotal", () => {
    const result = computeDiscount(
      [item({ price: 10.99, quantity: 3 })],
      0,
    );
    // Math.round(10.99 * 3 * 100) = Math.round(3297) = 3297¢
    expect(result.subtotal).toBe(3297);
  });
});
