jest.mock('openid-client', () => ({
  authorizationCodeGrant: jest.fn(async () => ({
    claims: () => ({ iss: 'https://identity.example.test/api/auth', sub: 'central-user-1' }),
  })),
  buildAuthorizationUrl: jest.fn(() => new URL('https://identity.example.test/authorize')),
  calculatePKCECodeChallenge: jest.fn(async () => 'pkce-challenge'),
  ClientSecretBasic: jest.fn(),
  ClientSecretPost: jest.fn(),
  discovery: jest.fn(async () => ({})),
  randomNonce: jest.fn(() => 'nonce-1'),
  randomPKCECodeVerifier: jest.fn(() => 'verifier-1'),
  randomState: jest.fn(() => 'central-state-1'),
}));

jest.mock('../../../src/iam/auth/better-auth', () => ({ AUTH: Symbol('AUTH') }));
import { IdentityRecoveryService } from '../../../src/iam/identity-recovery/identity-recovery.service';
import type { IdentityRecoveryRepository } from '../../../src/iam/identity-recovery/domain/identity-recovery.repository';

class MemoryRecoveryRepository implements IdentityRecoveryRepository {
  private readonly challenges = new Map<string, unknown>();
  readonly links: { userId: string; accountId: string; providerId: string }[] = [];

  async saveChallenge(identifier: string, value: object) {
    this.challenges.set(identifier, value);
  }

  async consumeChallenge(identifier: string) {
    const value = this.challenges.get(identifier);
    this.challenges.delete(identifier);
    return value;
  }

  async findCredential(email: string) {
    return email === 'reader@example.test'
      ? { userId: 'reading-user-1', password: 'stored-password-hash' }
      : undefined;
  }

  async findProviderUser() {
    return undefined;
  }

  async findCentralIdentityLink(userId: string, accountId: string) {
    const subject = this.links.find((link) => link.accountId === accountId && link.providerId === 'central-identity');
    const owned = this.links.some((link) => link.userId === userId && link.providerId === 'central-identity');
    return { subjectUserId: subject?.userId, userHasLink: owned };
  }
}

describe('IdentityRecoveryService interface', () => {
  it('proves the existing password then persists only the validated Central Identity link', async () => {
    const repository = new MemoryRecoveryRepository();
    const passwordVerify = jest.fn(async ({ hash, password }: { hash: string; password: string }) =>
      hash === 'stored-password-hash' && password === 'existing-password');
    const context = {
      password: { verify: passwordVerify },
      internalAdapter: {
        createAccount: jest.fn(async (link: { userId: string; accountId: string; providerId: string }) => {
          repository.links.push(link);
        }),
      },
    };
    const auth = { $context: Promise.resolve(context) };
    const config = {
      auth: {
        recoveryProviders: {},
        recoveryProviderRedirectUri: undefined,
        recoveryRedirectUri: 'https://reading.example.test/api/identity-recovery/callback',
        centralIdentity: {
          issuer: 'https://identity.example.test/api/auth',
          clientId: 'reading-client',
          clientSecret: 'synthetic-secret',
        },
      },
    };
    const service = new IdentityRecoveryService(repository, auth, config as never);

    const authorization = await service.begin(' Reader@Example.Test ', 'existing-password');
    const callback = new URL(`https://reading.example.test/api/identity-recovery/callback?code=one-time&state=${authorization.state}`);
    await service.complete(callback, authorization.state);

    expect(passwordVerify).toHaveBeenCalledWith({ hash: 'stored-password-hash', password: 'existing-password' });
    expect(await repository.findCentralIdentityLink('reading-user-1', 'central-user-1'))
      .toEqual({ subjectUserId: 'reading-user-1', userHasLink: true });
  });

  it('rejects an invalid existing password without starting Central authorization', async () => {
    const repository = new MemoryRecoveryRepository();
    const auth = { $context: Promise.resolve({
      password: { verify: jest.fn(async () => false) },
      internalAdapter: { createAccount: jest.fn() },
    }) };
    const config = { auth: { recoveryProviders: {} } };
    const service = new IdentityRecoveryService(repository, auth as never, config as never);
    await expect(service.begin('reader@example.test', 'wrong-password')).rejects.toThrow('Recovery proof failed.');
  });
  it('fails closed when recovery-only Central Identity configuration is absent', async () => {
    const repository = new MemoryRecoveryRepository();
    const auth = { $context: Promise.resolve({
      password: { verify: jest.fn(async () => true) },
      internalAdapter: { createAccount: jest.fn() },
    }) };
    const service = new IdentityRecoveryService(repository, auth as never, {
      auth: { recoveryProviders: {} },
    } as never);
    await expect(service.begin('reader@example.test', 'existing-password'))
      .rejects.toThrow('Central Identity is unavailable.');
  });

  it('fails closed when recovery provider credentials are absent', async () => {
    const service = new IdentityRecoveryService(
      new MemoryRecoveryRepository(),
      { $context: Promise.resolve({}) } as never,
      { auth: { recoveryProviders: {} } } as never,
    );
    await expect(service.beginProvider('google')).rejects.toThrow('Recovery provider is unavailable.');
  });
});
