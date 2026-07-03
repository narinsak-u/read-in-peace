export const PLAN_CONFIG = {
  free: { itemLimit: 15, monthlyPriceCents: 0 },
  curator: { itemLimit: 25, monthlyPriceCents: 500 },
  archivist: { itemLimit: 50, monthlyPriceCents: 1000 },
} as const;

export type Plan = keyof typeof PLAN_CONFIG;

export const PLAN_NAMES: Record<Plan, string> = {
  free: 'The Bibliophile',
  curator: 'The Curator',
  archivist: 'The Archivist',
};
