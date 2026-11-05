import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, eq, gt, like, lt } from 'drizzle-orm';
import {
  authorizationCodeGrant,
  buildAuthorizationUrl,
  calculatePKCECodeChallenge,
  ClientSecretBasic,
  ClientSecretPost,
  Configuration,
  discovery,
  randomNonce,
  randomPKCECodeVerifier,
  randomState,
} from 'openid-client';
import { DATABASE, type Database } from '../../core/database/database.provider';
import * as schema from '../../core/database/schema';
import { CoreConfigService } from '../../core/config/config.provider';
import { AUTH } from '../auth/better-auth';
import { z } from 'zod';

const RECOVERY_TTL_MS = 5 * 60 * 1000;
const CENTRAL_PROVIDER = 'central-identity';
type RecoveryProvider = 'google' | 'github';
const providerChallengeSchema = z.object({
  provider: z.enum(['google', 'github']),
  nonce: z.string().optional(),
  codeVerifier: z.string(),
});
const centralChallengeSchema = z.object({
  userId: z.string(),
  nonce: z.string(),
  codeVerifier: z.string(),
});
interface RecoveryAuth {
  $context: {
    password: { verify(input: { hash: string; password: string }): Promise<boolean> };
    internalAdapter: {
      createAccount(account: {
        id: string;
        userId: string;
        providerId: string;
        accountId: string;
      }): Promise<unknown>;
    };
  };
}

@Injectable()
export class IdentityRecoveryService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(AUTH) private readonly auth: RecoveryAuth,
    private readonly config: CoreConfigService,
  ) {}

  async begin(email: string, password: string): Promise<{ state: string; authorizationUrl: string }> {
    const [identity] = await this.db.select({ id: schema.user.id })
      .from(schema.user).where(eq(schema.user.email, email.trim().toLowerCase())).limit(1);
    const [credential] = identity
      ? await this.db.select({ password: schema.account.password }).from(schema.account).where(and(
          eq(schema.account.userId, identity.id),
          eq(schema.account.providerId, 'credential'),
        )).limit(1)
      : [];
    if (!identity || !credential?.password || !await this.auth.$context.password.verify({
      hash: credential.password,
      password,
    })) throw new UnauthorizedException('Recovery proof failed.');
    return this.beginCentral(identity.id);
  }

  async beginProvider(provider: RecoveryProvider): Promise<{ state: string; authorizationUrl: string }> {
    const settings = this.config.auth.recoveryProviders[provider];
    if (!settings) throw new UnauthorizedException('Recovery provider is unavailable.');
    const state = randomState();
    const nonce = provider === 'google' ? randomNonce() : undefined;
    const codeVerifier = randomPKCECodeVerifier();
    const challenge = await calculatePKCECodeChallenge(codeVerifier);
    const client = await this.providerClient(provider, settings.clientId, settings.clientSecret);
    const authorizationUrl = buildAuthorizationUrl(client, {
      redirect_uri: this.config.auth.recoveryProviderRedirectUri,
      response_type: 'code',
      scope: provider === 'google' ? 'openid email profile' : 'read:user',
      state,
      ...(nonce ? { nonce } : {}),
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });
    await this.saveChallenge(`identity-recovery-provider:${state}`, {
      provider,
      nonce,
      codeVerifier,
    });
    return { state, authorizationUrl: authorizationUrl.href };
  }

  async completeProvider(callbackUrl: URL, cookieState: string): Promise<{ state: string; authorizationUrl: string }> {
    const state = callbackUrl.searchParams.get('state');
    if (!state || state !== cookieState) throw new UnauthorizedException('Recovery proof failed.');
    const pending = await this.consumeChallenge(`identity-recovery-provider:${state}`);
    const details = providerChallengeSchema.parse(pending);
    const settings = this.config.auth.recoveryProviders[details.provider];
    if (!settings) throw new UnauthorizedException('Recovery proof failed.');
    const client = await this.providerClient(details.provider, settings.clientId, settings.clientSecret);
    const tokens = await authorizationCodeGrant(client, callbackUrl, {
      pkceCodeVerifier: details.codeVerifier,
      expectedState: state,
      ...(details.nonce ? { expectedNonce: details.nonce, idTokenExpected: true } : {}),
    });
    let providerSubject: string;
    if (details.provider === 'google') {
      const claims = tokens.claims();
      if (!claims?.sub) throw new UnauthorizedException('Recovery proof failed.');
      providerSubject = claims.sub;
    } else {
      const userResponse = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: 'application/vnd.github+json' },
      });
      if (!userResponse.ok) throw new UnauthorizedException('Recovery proof failed.');
      const githubUser: unknown = await userResponse.json();
      if (!githubUser || typeof githubUser !== 'object' || !('id' in githubUser) || typeof githubUser.id !== 'number') {
        throw new UnauthorizedException('Recovery proof failed.');
      }
      providerSubject = String(githubUser.id);
    }
    const [account] = await this.db.select({ userId: schema.account.userId })
      .from(schema.account).where(and(
        eq(schema.account.providerId, details.provider),
        eq(schema.account.accountId, providerSubject),
      )).limit(1);
    if (!account) throw new UnauthorizedException('Recovery proof failed.');
    return this.beginCentral(account.userId);
  }

  async complete(callbackUrl: URL, cookieState: string): Promise<void> {
    const state = callbackUrl.searchParams.get('state');
    if (!state || state !== cookieState) throw new UnauthorizedException('Recovery proof failed.');
    const pending = centralChallengeSchema.parse(
      await this.consumeChallenge(`identity-recovery-central:${state}`),
    );
    const central = this.config.auth.centralIdentity;
    if (!central) throw new UnauthorizedException('Central Identity is unavailable.');
    const client = await discovery(
      new URL(central.issuer),
      central.clientId,
      undefined,
      ClientSecretBasic(central.clientSecret),
    );
    const tokens = await authorizationCodeGrant(client, callbackUrl, {
      pkceCodeVerifier: pending.codeVerifier,
      expectedState: state,
      expectedNonce: pending.nonce,
      idTokenExpected: true,
    });
    const claims = tokens.claims();
    if (!claims?.iss || !claims.sub || claims.iss !== central.issuer) {
      throw new UnauthorizedException('Recovery proof failed.');
    }
    const existing = await this.db.select({ userId: schema.account.userId })
      .from(schema.account).where(and(
        eq(schema.account.providerId, CENTRAL_PROVIDER),
        eq(schema.account.accountId, claims.sub),
      )).limit(1);
    const localLink = await this.db.select({ accountId: schema.account.accountId })
      .from(schema.account).where(and(
        eq(schema.account.providerId, CENTRAL_PROVIDER),
        eq(schema.account.userId, pending.userId),
      )).limit(1);
    if (existing.length || localLink.length) throw new UnauthorizedException('Conflicting identity link.');
    await this.auth.$context.internalAdapter.createAccount({
      id: randomUUID(),
      userId: pending.userId,
      providerId: CENTRAL_PROVIDER,
      accountId: claims.sub,
    });
  }

  private async beginCentral(userId: string): Promise<{ state: string; authorizationUrl: string }> {
    const central = this.config.auth.centralIdentity;
    if (!central) throw new UnauthorizedException('Central Identity is unavailable.');
    const state = randomState();
    const nonce = randomNonce();
    const codeVerifier = randomPKCECodeVerifier();
    const codeChallenge = await calculatePKCECodeChallenge(codeVerifier);
    const client = await discovery(
      new URL(central.issuer),
      central.clientId,
      undefined,
      ClientSecretBasic(central.clientSecret),
    );
    const authorizationUrl = buildAuthorizationUrl(client, {
      redirect_uri: this.config.auth.recoveryRedirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    await this.saveChallenge(`identity-recovery-central:${state}`, { userId, nonce, codeVerifier });
    return { state, authorizationUrl: authorizationUrl.href };
  }

  private async providerClient(provider: RecoveryProvider, clientId: string, clientSecret: string): Promise<Configuration> {
    if (provider === 'google') {
      const issuer = await discovery(new URL('https://accounts.google.com'), clientId, undefined, ClientSecretBasic(clientSecret));
      return issuer;
    }
    return new Configuration({
      issuer: 'https://github.com',
      authorization_endpoint: 'https://github.com/login/oauth/authorize',
      token_endpoint: 'https://github.com/login/oauth/access_token',
    }, clientId, undefined, ClientSecretPost(clientSecret));
  }

  private async saveChallenge(identifier: string, value: object): Promise<void> {
    await this.db.delete(schema.verification).where(and(
      like(schema.verification.identifier, 'identity-recovery-%'),
      lt(schema.verification.expiresAt, new Date()),
    ));
    await this.db.insert(schema.verification).values({
      id: randomUUID(),
      identifier,
      value: JSON.stringify(value),
      expiresAt: new Date(Date.now() + RECOVERY_TTL_MS),
    });
  }

  private async consumeChallenge(identifier: string): Promise<unknown> {
    const [pending] = await this.db.delete(schema.verification).where(and(
      eq(schema.verification.identifier, identifier),
      gt(schema.verification.expiresAt, new Date()),
    )).returning({ value: schema.verification.value });
    if (!pending) throw new UnauthorizedException('Recovery proof failed.');
    return JSON.parse(pending.value) as unknown;
  }
}
