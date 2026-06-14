import type { CartItem } from '~/stores/cart';

export interface DiscountBreakdown {
  subtotal: number;        // cents
  tierPercent: number;
  tierDiscount: number;    // cents
  categoryBonus: number;   // cents
  every100Discount: number; // cents
  total: number;           // cents
}

interface CategorySubtotal {
  category: string;
  subtotal: number;        // cents
  count: number;
}

function getCategorySubtotals(items: CartItem[]): CategorySubtotal[] {
  const map = new Map<string, { subtotal: number; count: number }>();
  for (const item of items) {
    const existing = map.get(item.category) ?? { subtotal: 0, count: 0 };
    existing.subtotal += Math.round(item.price * 100);
    existing.count += 1;
    map.set(item.category, existing);
  }
  return Array.from(map.entries()).map(([category, { subtotal, count }]) => ({
    category,
    subtotal,
    count,
  }));
}

export function computeDiscount(items: CartItem[]): DiscountBreakdown {
  const subtotal = items.reduce((sum, i) => sum + Math.round(i.price * 100), 0);

  // Stage 1 — Quantity Tier
  const count = items.length;
  const tierPercent = count >= 4 ? 30 : count === 3 ? 20 : count === 2 ? 10 : 0;
  const tierDiscount = Math.round(subtotal * (tierPercent / 100));
  let runningTotal = subtotal - tierDiscount;

  // Stage 2 — Category Bonus (on original category subtotals)
  const catSubtotals = getCategorySubtotals(items);
  const categoryBonus = catSubtotals.reduce((sum, cat) => {
    if (cat.count >= 2) {
      return sum + Math.round(cat.subtotal * 0.1);
    }
    return sum;
  }, 0);
  runningTotal -= categoryBonus;

  // Stage 3 — Every $100 (10000 cents)
  const every100Discount = Math.floor(runningTotal / 10000) * 100;
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
