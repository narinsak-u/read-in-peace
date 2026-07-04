import type { CartItem } from "~/stores/cart";

export interface DiscountBreakdown {
  subtotal: number;
  tierPercent: number;
  tierDiscount: number;
  categoryBonus: number;
  every100Discount: number;
  planDiscount: number;
  total: number;
}

interface CategorySubtotal {
  category: string;
  subtotal: number;
  count: number;
}

function getCategorySubtotals(items: readonly CartItem[]): CategorySubtotal[] {
  const map = new Map<string, { subtotal: number; count: number }>();
  for (const item of items) {
    const category = item.category ?? "uncategorized";
    const existing = map.get(category) ?? { subtotal: 0, count: 0 };
    existing.subtotal += Math.round(item.price * item.quantity * 100);
    existing.count += 1;
    map.set(category, existing);
  }
  return Array.from(map.entries()).map(([category, { subtotal, count }]) => ({
    category,
    subtotal,
    count,
  }));
}

export function computeDiscount(
  items: readonly CartItem[],
  planDiscountPercent: number = 0,
): DiscountBreakdown {
  const subtotal = items.reduce(
    (sum, i) => sum + Math.round(i.price * i.quantity * 100),
    0,
  );

  const count = items.length;
  const tierPercent = count >= 4 ? 30 : count === 3 ? 20 : count === 2 ? 10 : 0;
  const tierDiscount = Math.round(subtotal * (tierPercent / 100));
  let runningTotal = subtotal - tierDiscount;

  const catSubtotals = getCategorySubtotals(items);
  const categoryBonus = catSubtotals.reduce((sum, cat) => {
    if (cat.count >= 2) {
      return sum + Math.round(cat.subtotal * 0.1);
    }
    return sum;
  }, 0);
  runningTotal -= categoryBonus;

  const every100Discount = Math.floor(runningTotal / 10000) * 100;
  runningTotal -= every100Discount;

  const planDiscount = Math.round(runningTotal * (planDiscountPercent / 100));
  runningTotal -= planDiscount;

  const total = Math.max(0, runningTotal);

  return {
    subtotal,
    tierPercent,
    tierDiscount,
    categoryBonus,
    every100Discount,
    planDiscount,
    total,
  };
}
