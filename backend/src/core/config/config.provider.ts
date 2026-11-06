import { Injectable } from '@nestjs/common';
import { envSchema } from './env.schema';
import type {
  AppConfig,
  CoreDbConfig,
  CoreFrontendConfig,
  CoreServerConfig,
  IamAuthConfig,
  MembershipStripeConfig,
  TransactionsStripeConfig,
} from './config.types';

const FALLBACK_BASE_URL = 'https://reading.localhost:8080';

/**
 * @explaination
 * raw` comes from `process.env`, passed in at `config.module.ts:13`:
 *
 * ```ts
 * useFactory: () => new CoreConfigService(process.env),
 * ```
 * The chain: `process.env` (Node.js global)
 *  → `raw` parameter → `envSchema.parse(raw)` (Zod validation + defaulting)
 *  → `parsed` object → config slices like `this.server.port = parsed.PORT`.
 */

@Injectable()
export class CoreConfigService implements AppConfig {
  readonly db: CoreDbConfig;
  readonly server: CoreServerConfig;
  readonly frontend: CoreFrontendConfig;
  readonly auth: IamAuthConfig;
  readonly stripe: TransactionsStripeConfig;
  readonly membership: MembershipStripeConfig;

  constructor(raw: NodeJS.ProcessEnv) {
    const parsed = envSchema.parse(raw);
    const baseUrl = parsed.BETTER_AUTH_URL ?? FALLBACK_BASE_URL;

    this.db = { url: parsed.DATABASE_URL };
    this.server = {
      port: parsed.PORT,
      corsOrigins: (parsed.CORS_ORIGINS ?? FALLBACK_BASE_URL)
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
      nodeEnv: parsed.NODE_ENV,
      logLevel: parsed.LOG_LEVEL,
    };
    this.frontend = {
      url: parsed.FRONTEND_URL ?? parsed.BETTER_AUTH_URL ?? FALLBACK_BASE_URL,
    };
    this.auth = {
      baseUrl,
      trustedOrigins: [baseUrl],
      recoveryRedirectUri: parsed.READING_RECOVERY_OIDC_REDIRECT_URI,
      recoveryProviderRedirectUri: parsed.READING_RECOVERY_PROVIDER_REDIRECT_URI,
      recoveryProviders: {
        ...(parsed.READING_RECOVERY_GOOGLE_CLIENT_ID &&
        parsed.READING_RECOVERY_GOOGLE_CLIENT_SECRET
          ? {
              google: {
                clientId: parsed.READING_RECOVERY_GOOGLE_CLIENT_ID,
                clientSecret: parsed.READING_RECOVERY_GOOGLE_CLIENT_SECRET,
              },
            }
          : {}),
        ...(parsed.READING_RECOVERY_GITHUB_CLIENT_ID &&
        parsed.READING_RECOVERY_GITHUB_CLIENT_SECRET
          ? {
              github: {
                clientId: parsed.READING_RECOVERY_GITHUB_CLIENT_ID,
                clientSecret: parsed.READING_RECOVERY_GITHUB_CLIENT_SECRET,
              },
            }
          : {}),
      },
      secret: parsed.AUTH_SECRET,
      centralIdentity:
        parsed.CENTRAL_IDENTITY_ISSUER &&
        parsed.CENTRAL_IDENTITY_CLIENT_ID &&
        parsed.CENTRAL_IDENTITY_CLIENT_SECRET
          ? {
              issuer: parsed.CENTRAL_IDENTITY_ISSUER,
              clientId: parsed.CENTRAL_IDENTITY_CLIENT_ID,
              clientSecret: parsed.CENTRAL_IDENTITY_CLIENT_SECRET,
            }
          : undefined,
    };
    this.stripe = { secretKey: parsed.STRIPE_SECRET_KEY };
    this.membership = { webhookSecret: parsed.STRIPE_WEBHOOK_SECRET };
  }
}
