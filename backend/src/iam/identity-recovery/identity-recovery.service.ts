import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
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
import type { BetterAuthInstance } from '../auth/better-auth';
import { CoreConfigService } from '../../core/config/config.provider';
import { AUTH } from '../auth/better-auth';
import {
  IDENTITY_RECOVERY_REPOSITORY,
  type IdentityRecoveryRepository,
} from './domain/identity-recovery.repository';
import { z } from 'zod';

const recoveryTtlMs = 5 * 60 * 1000;
const centralProvider = 'central-identity';
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
type RecoveryAuth = BetterAuthInstance;

@Injectable()
export class IdentityRecoveryService {
  constructor(
    @Inject(IDENTITY_RECOVERY_REPOSITORY) private readonly repository: IdentityRecoveryRepository,
    @Inject(AUTH) private readonly auth: RecoveryAuth,
    private readonly config: CoreConfigService,
  ) {}

  async begin(email: string, password: string): Promise<{ state: string; authorizationUrl: string }> {
    const identity = await this.repository.findCredential(email.trim().toLowerCase());
    const context = await this.auth.$context;
    if (!identity?.password || !await context.password.verify({
      hash: identity.password,
      password,
    })) throw new UnauthorizedException('Recovery proof failed.');
    return this.beginCentral(identity.userId);
  }

  async beginProvider(provider: RecoveryProvider): Promise<{ state: string; authorizationUrl: string }> {
    const settings = this.config.auth.recoveryProviders[provider];
    if (!settings) throw new UnauthorizedException('Recovery provider is unavailable.');
    const state = randomState();
    const nonce = provider === 'google' ? randomNonce() : undefined;
    const redirectUri = this.config.auth.recoveryProviderRedirectUri;
    if (!redirectUri) throw new UnauthorizedException('Recovery provider is unavailable.');
    const codeVerifier = randomPKCECodeVerifier();
    const challenge = await calculatePKCECodeChallenge(codeVerifier);
    const client = await this.providerClient(provider, settings.clientId, settings.clientSecret);
    const authorizationUrl = buildAuthorizationUrl(client, {
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: provider === 'google' ? 'openid email profile' : 'read:user',
      state,
      ...(nonce ? { nonce } : {}),
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });
    await this.repository.saveChallenge(`identity-recovery-provider:${state}`, {
      provider,
      nonce,
      codeVerifier,
    }, new Date(Date.now() + recoveryTtlMs));
    return { state, authorizationUrl: authorizationUrl.href };
  }

  async completeProvider(callbackUrl: URL, cookieState: string): Promise<{ state: string; authorizationUrl: string }> {
    const state = callbackUrl.searchParams.get('state');
    if (!state || state !== cookieState) throw new UnauthorizedException('Recovery proof failed.');
    const pending = await this.repository.consumeChallenge(`identity-recovery-provider:${state}`, new Date());
    if (!pending) throw new UnauthorizedException('Recovery proof failed.');
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
    const account = await this.repository.findProviderUser(details.provider, providerSubject);
    if (!account) throw new UnauthorizedException('Recovery proof failed.');
    return this.beginCentral(account.userId);
  }

  async complete(callbackUrl: URL, cookieState: string): Promise<void> {
    const state = callbackUrl.searchParams.get('state');
    if (!state || state !== cookieState) throw new UnauthorizedException('Recovery proof failed.');
    const pendingValue = await this.repository.consumeChallenge(`identity-recovery-central:${state}`, new Date());
    if (!pendingValue) throw new UnauthorizedException('Recovery proof failed.');
    const pending = centralChallengeSchema.parse(pendingValue);
    const central = this.config.auth.centralIdentity;
    const redirectUri = this.config.auth.recoveryRedirectUri;
    if (!central || !redirectUri) throw new UnauthorizedException('Central Identity is unavailable.');
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
    const existing = await this.repository.findCentralIdentityLink(pending.userId, claims.sub);
    if (existing.subjectUserId || existing.userHasLink) throw new UnauthorizedException('Conflicting identity link.');
    const context = await this.auth.$context;
    await context.internalAdapter.createAccount({
      id: randomUUID(),
      userId: pending.userId,
      providerId: centralProvider,
      accountId: claims.sub,
    });
  }

  private async beginCentral(userId: string): Promise<{ state: string; authorizationUrl: string }> {
    const central = this.config.auth.centralIdentity;
    const redirectUri = this.config.auth.recoveryRedirectUri;
    if (!central || !redirectUri) throw new UnauthorizedException('Central Identity is unavailable.');
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
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    await this.repository.saveChallenge(`identity-recovery-central:${state}`, {
      userId,
      nonce,
      codeVerifier,
    }, new Date(Date.now() + recoveryTtlMs));
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

}
