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
    expect(config.server.port).toBe(4000);
    expect(config.server.corsOrigins).toEqual(['http://localhost:3000']);
    expect(config.auth.baseUrl).toBe('http://localhost:3000');
    expect(config.frontend.url).toBe('http://localhost:3000');
  });

  it('respects explicit overrides', () => {
    const config = new CoreConfigService({
      ...validEnv,
      PORT: '5000',
      BETTER_AUTH_URL: 'https://auth.example.com',
      CORS_ORIGINS: 'https://a.com, https://b.com',
      FRONTEND_URL: 'https://app.example.com',
      NODE_ENV: 'production',
      LOG_LEVEL: 'debug',
    });
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
