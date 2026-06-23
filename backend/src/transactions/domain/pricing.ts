// Pure pricing math for the transactions feature. No I/O, no Nest, no DB, no
// Stripe — importable from tests and from CheckoutService without ceremony.

export interface DiscountInput {
  price: string;
  category: string;
}

export interface DiscountResult {
  subtotal: number;
  tierPercent: number;
  tierDiscount: number;
  categoryBonus: number;
  every100Discount: number;
  total: number;
}

const EVERY_X_CENTS = 10000;
const EVERY_X_DISCOUNT_CENTS = 100;

export function applyDiscounts(books: DiscountInput[]): DiscountResult {
  const subtotal = books.reduce(
    (sum, b) => sum + Math.round(Number(b.price) * 100),
    0,
  );

  const count = books.length;
  const tierPercent = count >= 4 ? 30 : count === 3 ? 20 : count === 2 ? 10 : 0;
  const tierDiscount = Math.round(subtotal * (tierPercent / 100));
  let runningTotal = subtotal - tierDiscount;

  const catSubtotals = new Map<string, { subtotal: number; count: number }>();
  for (const book of books) {
    const price = Math.round(Number(book.price) * 100);
    const existing = catSubtotals.get(book.category) ?? {
      subtotal: 0,
      count: 0,
    };
    existing.subtotal += price;
    existing.count += 1;
    catSubtotals.set(book.category, existing);
  }

  let categoryBonus = 0;
  for (const { subtotal: catSubtotal, count } of catSubtotals.values()) {
    if (count >= 2) {
      categoryBonus += Math.round(catSubtotal * 0.1);
    }
  }
  runningTotal -= categoryBonus;

  const every100Discount =
    Math.floor(runningTotal / EVERY_X_CENTS) * EVERY_X_DISCOUNT_CENTS;
  runningTotal -= every100Discount;

  const total = Math.max(0, runningTotal);

  return {
    subtotal,
    tierPercent,
    tierDiscount,
    categoryBonus,
    every100Discount,
    total,
  };
}
