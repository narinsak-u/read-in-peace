import { CoreConfigService } from '../../../src/core/config/config.provider';

describe('CoreConfigService', () => {
  const validEnv = {
    DATABASE_URL: 'postgres://test:test@localhost:5432/test',
    STRIPE_SECRET_KEY: 'sk_test_xxx',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_xxx',
  };

  it('exposes typed config from minimal env', () => {
    const config = new CoreConfigService(validEnv);
    expect(config.db.url).toBe('postgres://test:test@localhost:5432/test');
    expect(config.stripe.secretKey).toBe('sk_test_xxx');
    expect(config.server.port).toBe(3000);
    expect(config.server.corsOrigins).toEqual(['https://reading.lvh.me:8080']);
    expect(config.auth.baseUrl).toBe('https://reading.lvh.me:8080');
    expect(config.auth.recoveryRedirectUri).toBe('https://reading.lvh.me:8080/api/identity-recovery/callback');
    expect(config.frontend.url).toBe('https://reading.lvh.me:8080');
  });

  it('respects explicit overrides', () => {
    const config = new CoreConfigService({
      ...validEnv,
      STRIPE_SECRET_KEY: 'sk_live_test_fixture',
      PORT: '5000',
      BETTER_AUTH_URL: 'https://auth.example.com',
      CORS_ORIGINS: 'https://a.com, https://b.com',
      FRONTEND_URL: 'https://app.example.com',
      NODE_ENV: 'production',
      AUTH_SECRET: 'test-only-auth-secret-long-enough',
      CENTRAL_IDENTITY_ISSUER: 'https://identity.example.com/api/auth',
      CENTRAL_IDENTITY_CLIENT_ID: 'test-client',
      CENTRAL_IDENTITY_CLIENT_SECRET: 'test-secret',
      READING_RECOVERY_OIDC_REDIRECT_URI: 'https://auth.example.com/api/identity-recovery/callback',
      READING_RECOVERY_PROVIDER_REDIRECT_URI: 'https://auth.example.com/api/identity-recovery/provider/callback',
      READING_RECOVERY_GOOGLE_CLIENT_ID: 'recovery-google-client',
      READING_RECOVERY_GOOGLE_CLIENT_SECRET: 'recovery-google-secret',
      READING_RECOVERY_GITHUB_CLIENT_ID: 'recovery-github-client',
      READING_RECOVERY_GITHUB_CLIENT_SECRET: 'recovery-github-secret',
    });
    expect(config.auth.recoveryRedirectUri).toBe('https://auth.example.com/api/identity-recovery/callback');
    expect(config.auth.recoveryProviderRedirectUri).toBe('https://auth.example.com/api/identity-recovery/provider/callback');
    expect(config.auth.recoveryProviders.google?.clientId).toBe('recovery-google-client');
    expect(config.auth.recoveryProviders.github?.clientId).toBe('recovery-github-client');
    expect(config.server.port).toBe(5000);
    expect(config.auth.baseUrl).toBe('https://auth.example.com');
    expect(config.auth.trustedOrigins).toEqual(['https://auth.example.com']);
    expect(config.server.corsOrigins).toEqual([
      'https://a.com',
      'https://b.com',
    ]);
    expect(config.frontend.url).toBe('https://app.example.com');
    expect(config.server.nodeEnv).toBe('production');
    expect(config.server.logLevel).toBe('debug');
  });
  it('rejects production config without all operator-owned identity settings', () => {
    expect(
      () =>
        new CoreConfigService({
          ...validEnv,
          NODE_ENV: 'production',
          BETTER_AUTH_URL: 'https://reading.example.com',
          FRONTEND_URL: 'https://reading.example.com',
          CORS_ORIGINS: 'https://reading.example.com',
        }),
    ).toThrow();
  });

  it('allows Stripe test credentials only for the isolated test-production origins', () => {
    const testProductionEnv = {
      ...validEnv,
      NODE_ENV: 'production',
      TEST_PRODUCTION: 'true',
      DATABASE_URL: 'postgres://postgres:postgres@localhost:5433/read_in_peace',
      BETTER_AUTH_URL: 'https://reading-test.lvh.me:8081',
      FRONTEND_URL: 'https://reading-test.lvh.me:8081',
      CORS_ORIGINS: 'https://reading-test.lvh.me:8081',
      AUTH_SECRET: 'isolated-test-production-auth-secret',
      CENTRAL_IDENTITY_ISSUER: 'https://auth-test.127.0.0.1.nip.io:8081/api/auth',
      CENTRAL_IDENTITY_CLIENT_ID: 'test-client',
      CENTRAL_IDENTITY_CLIENT_SECRET: 'test-secret',
      READING_RECOVERY_OIDC_REDIRECT_URI: 'https://reading-test.lvh.me:8081/api/identity-recovery/callback',
      READING_RECOVERY_PROVIDER_REDIRECT_URI: 'https://reading-test.lvh.me:8081/api/identity-recovery/provider/callback',
      READING_RECOVERY_GOOGLE_CLIENT_ID: 'test-recovery-google-client',
      READING_RECOVERY_GOOGLE_CLIENT_SECRET: 'test-recovery-google-secret',
      READING_RECOVERY_GITHUB_CLIENT_ID: 'test-recovery-github-client',
      READING_RECOVERY_GITHUB_CLIENT_SECRET: 'test-recovery-github-secret',
    };
    expect(() => new CoreConfigService(testProductionEnv)).not.toThrow();
    expect(() => new CoreConfigService({
      ...testProductionEnv,
      DATABASE_URL: 'postgres://live.example.com/read_in_peace',
    })).toThrow();
  });


  it('configures the independent Central Identity client credentials', () => {
    const config = new CoreConfigService({
      ...validEnv,
      CENTRAL_IDENTITY_ISSUER: 'https://auth.127.0.0.1.nip.io:8080/api/auth',
      CENTRAL_IDENTITY_CLIENT_ID: 'reading-client',
      CENTRAL_IDENTITY_CLIENT_SECRET: 'reading-secret',
    });
    expect(config.auth.centralIdentity).toEqual({
      issuer: 'https://auth.127.0.0.1.nip.io:8080/api/auth',
      clientId: 'reading-client',
      clientSecret: 'reading-secret',
    });
  });

  it('throws when DATABASE_URL is missing', () => {
    expect(
      () =>
        new CoreConfigService({
          STRIPE_SECRET_KEY: 'sk_x',
          STRIPE_WEBHOOK_SECRET: 'whsec_x',
        }),
    ).toThrow();
  });

  it('throws when STRIPE_SECRET_KEY is missing', () => {
    expect(
      () =>
        new CoreConfigService({
          DATABASE_URL: 'postgres://x',
          STRIPE_WEBHOOK_SECRET: 'whsec_x',
        }),
    ).toThrow();
  });

  it('throws when STRIPE_WEBHOOK_SECRET is missing', () => {
    expect(
      () =>
        new CoreConfigService({
          DATABASE_URL: 'postgres://x',
          STRIPE_SECRET_KEY: 'sk_x',
        }),
    ).toThrow();
  });
});
