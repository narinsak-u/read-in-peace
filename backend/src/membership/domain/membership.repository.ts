import type { MembershipRow } from './membership.entity';

export const MEMBERSHIP_REPOSITORY = Symbol('MEMBERSHIP_REPOSITORY');

export interface MembershipRepository {
  findByUserId(userId: string): Promise<MembershipRow | null>;
  upsert(
    userId: string,
    data: Partial<Omit<MembershipRow, 'id' | 'userId' | 'createdAt'>>,
  ): Promise<MembershipRow>;
}
