export const IDENTITY_RECOVERY_REPOSITORY = Symbol('IDENTITY_RECOVERY_REPOSITORY');

export interface IdentityRecoveryRepository {
  saveChallenge(identifier: string, value: object, expiresAt: Date): Promise<void>;
  consumeChallenge(identifier: string, now: Date): Promise<unknown | undefined>;
  findCredential(email: string): Promise<{ userId: string; password: string | null } | undefined>;
  findProviderUser(providerId: string, accountId: string): Promise<{ userId: string } | undefined>;
  findCentralIdentityLink(userId: string, accountId: string): Promise<{ subjectUserId?: string; userHasLink: boolean }>;
}
