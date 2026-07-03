export type MembershipStatus = 'active' | 'canceled' | 'past_due';

export interface MembershipRow {
  id: string;
  userId: string;
  plan: string;
  status: MembershipStatus;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  itemLimit: number;
  createdAt: Date;
  updatedAt: Date;
}
