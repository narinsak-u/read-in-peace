export interface Plan {
  name: string;
  id: string;
  monthlyPrice: number | null;
  itemLimit: string;
  returnWindow: string;
  buyToKeepDiscount: string;
  highlighted?: boolean;
  badge?: string;
}

export const plans: Plan[] = [
  {
    name: 'The Bibliophile',
    id: 'free',
    monthlyPrice: null,
    itemLimit: '15 Items',
    returnWindow: '7 Days',
    buyToKeepDiscount: '5% Off',
  },
  {
    name: 'The Curator',
    id: 'curator',
    monthlyPrice: 5,
    itemLimit: '25 Items',
    returnWindow: '2 Weeks',
    buyToKeepDiscount: '15% Off',
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    name: 'The Archivist',
    id: 'archivist',
    monthlyPrice: 10,
    itemLimit: '50 Items',
    returnWindow: '1 Month',
    buyToKeepDiscount: '25% Off',
  },
];

export const features = [
  { key: 'itemLimit' as const, label: 'Borrow limit' },
  { key: 'returnWindow' as const, label: 'Return window' },
  { key: 'buyToKeepDiscount' as const, label: 'Buy-to-keep discount' },
];
