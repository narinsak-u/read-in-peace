// MembershipRow — maps to the `memberships` DB table. Each user has at most
// one row (unique constraint on user_id). plan defaults to 'free' on creation;
// paid plans are set by the Stripe webhook after a successful subscription
// checkout.

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
