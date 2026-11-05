import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  TEST_PRODUCTION: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  BETTER_AUTH_URL: z.url().optional(),
  FRONTEND_URL: z.url().optional(),
  CORS_ORIGINS: z.string().optional(),
  CENTRAL_IDENTITY_ISSUER: z.url().optional(),
  CENTRAL_IDENTITY_CLIENT_ID: z.string().optional(),
  CENTRAL_IDENTITY_CLIENT_SECRET: z.string().optional(),
  READING_RECOVERY_OIDC_REDIRECT_URI: z.url().optional(),
  READING_RECOVERY_PROVIDER_REDIRECT_URI: z.url().optional(),
  READING_RECOVERY_GOOGLE_CLIENT_ID: z.string().optional(),
  READING_RECOVERY_GOOGLE_CLIENT_SECRET: z.string().optional(),
  READING_RECOVERY_GITHUB_CLIENT_ID: z.string().optional(),
  READING_RECOVERY_GITHUB_CLIENT_SECRET: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY is required'),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, 'STRIPE_WEBHOOK_SECRET is required'),
  AUTH_SECRET: z.string().min(16).optional(),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
}).refine(
  (env) =>
    env.NODE_ENV !== 'production' ||
    [
      env.DATABASE_URL,
      env.BETTER_AUTH_URL,
      env.FRONTEND_URL,
      env.CORS_ORIGINS,
      env.AUTH_SECRET,
      env.STRIPE_SECRET_KEY,
      env.STRIPE_WEBHOOK_SECRET,
      env.CENTRAL_IDENTITY_ISSUER,
      env.CENTRAL_IDENTITY_CLIENT_ID,
      env.CENTRAL_IDENTITY_CLIENT_SECRET,
      env.READING_RECOVERY_OIDC_REDIRECT_URI,
      env.READING_RECOVERY_PROVIDER_REDIRECT_URI,
      env.READING_RECOVERY_GOOGLE_CLIENT_ID,
      env.READING_RECOVERY_GOOGLE_CLIENT_SECRET,
      env.READING_RECOVERY_GITHUB_CLIENT_ID,
      env.READING_RECOVERY_GITHUB_CLIENT_SECRET,
    ].every(
      (value) =>
        typeof value === 'string' &&
        value.length > 0 &&
        !value.includes('OPERATOR_MUST_CONFIGURE') &&
        !value.startsWith('<'),
    ) &&
    (env.TEST_PRODUCTION
      ? env.STRIPE_SECRET_KEY.startsWith('sk_test_') &&
        env.DATABASE_URL === 'postgres://postgres:postgres@localhost:5433/read_in_peace' &&
        env.BETTER_AUTH_URL === 'https://reading-test.lvh.me:8081' &&
        env.FRONTEND_URL === 'https://reading-test.lvh.me:8081' &&
        env.CENTRAL_IDENTITY_ISSUER === 'https://auth-test.127.0.0.1.nip.io:8081/api/auth'
      : !env.STRIPE_SECRET_KEY.startsWith('sk_test_')),
  'Production requires operator-provided database, auth, payment, Central Identity, and recovery settings.',
).refine(
  (env) =>
    Boolean(env.READING_RECOVERY_GOOGLE_CLIENT_ID) === Boolean(env.READING_RECOVERY_GOOGLE_CLIENT_SECRET) &&
    Boolean(env.READING_RECOVERY_GITHUB_CLIENT_ID) === Boolean(env.READING_RECOVERY_GITHUB_CLIENT_SECRET),
  'Recovery provider client IDs and secrets must be configured together.',
);

export type Env = z.infer<typeof envSchema>;
