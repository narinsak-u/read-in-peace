// MembershipRepository — interface for persisting membership rows.
// The DI token (MEMBERSHIP_REPOSITORY) lets services depend on the interface
// while the Drizzle implementation is injected at the module level.
// findByUserId returns null for users who have never interacted with the
// membership system; upsert creates-or-replaces by the natural key (userId).

import type { MembershipRow } from './membership.entity';

export const MEMBERSHIP_REPOSITORY = Symbol('MEMBERSHIP_REPOSITORY');

export interface MembershipRepository {
  findByUserId(userId: string): Promise<MembershipRow | null>;
  upsert(
    userId: string,
    data: Partial<Omit<MembershipRow, 'id' | 'userId' | 'createdAt'>>,
  ): Promise<MembershipRow>;
}
