import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, eq, gt, like, lt } from 'drizzle-orm';
import { DATABASE, type Database } from '../../../core/database/database.provider';
import * as schema from '../../../core/database/schema';
import type { IdentityRecoveryRepository } from '../domain/identity-recovery.repository';

@Injectable()
export class DrizzleIdentityRecoveryRepository implements IdentityRecoveryRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}
  async saveChallenge(identifier: string, value: object, expiresAt: Date): Promise<void> {
    await this.db.delete(schema.verification).where(and(
      like(schema.verification.identifier, 'identity-recovery-%'),
      lt(schema.verification.expiresAt, new Date()),
    ));
    await this.db.insert(schema.verification).values({
      id: randomUUID(),
      identifier,
      value: JSON.stringify(value),
      expiresAt,
    });
  }

  async consumeChallenge(identifier: string, now: Date): Promise<unknown | undefined> {
    const [pending] = await this.db.delete(schema.verification).where(and(
      eq(schema.verification.identifier, identifier),
      gt(schema.verification.expiresAt, now),
    )).returning({ value: schema.verification.value });
    return pending ? JSON.parse(pending.value) as unknown : undefined;
  }

  async findCredential(email: string) {
    const [identity] = await this.db.select({ userId: schema.user.id })
      .from(schema.user).where(eq(schema.user.email, email)).limit(1);
    if (!identity) return undefined;
    const [credential] = await this.db.select({ password: schema.account.password })
      .from(schema.account).where(and(
        eq(schema.account.userId, identity.userId),
        eq(schema.account.providerId, 'credential'),
      )).limit(1);
    return { userId: identity.userId, password: credential?.password ?? null };
  }

  async findProviderUser(providerId: string, accountId: string) {
    const [account] = await this.db.select({ userId: schema.account.userId })
      .from(schema.account).where(and(
        eq(schema.account.providerId, providerId),
        eq(schema.account.accountId, accountId),
      )).limit(1);
    return account;
  }

  async findCentralIdentityLink(userId: string, accountId: string) {
    const [subject] = await this.db.select({ userId: schema.account.userId })
      .from(schema.account).where(and(
        eq(schema.account.providerId, 'central-identity'),
        eq(schema.account.accountId, accountId),
      )).limit(1);
    const [link] = await this.db.select({ accountId: schema.account.accountId })
      .from(schema.account).where(and(
        eq(schema.account.providerId, 'central-identity'),
        eq(schema.account.userId, userId),
      )).limit(1);
    return { subjectUserId: subject?.userId, userHasLink: Boolean(link) };
  }
}
