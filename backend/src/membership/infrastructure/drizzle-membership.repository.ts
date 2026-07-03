// DrizzleMembershipRepository — Drizzle ORM implementation of
// MembershipRepository. Uses onConflictDoUpdate (unique constraint on user_id)
// for atomic upsert: insert if absent, update given fields if present.

import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../core/database/database.provider';
import * as schema from '../../core/database/schema';
import type { MembershipRow } from '../domain/membership.entity';
import type { MembershipRepository } from '../domain/membership.repository';

@Injectable()
export class DrizzleMembershipRepository implements MembershipRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findByUserId(userId: string): Promise<MembershipRow | null> {
    const [row] = await this.db
      .select()
      .from(schema.memberships)
      .where(eq(schema.memberships.userId, userId))
      .limit(1);
    return (row as MembershipRow) ?? null;
  }

  async upsert(
    userId: string,
    data: Partial<Omit<MembershipRow, 'id' | 'userId' | 'createdAt'>>,
  ): Promise<MembershipRow> {
    const [row] = await this.db
      .insert(schema.memberships)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      .values({ userId, ...data } as any)
      .onConflictDoUpdate({
        target: schema.memberships.userId,
        set: data,
      })
      .returning();
    return row as MembershipRow;
  }
}
