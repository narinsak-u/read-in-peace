import { Injectable } from '@nestjs/common';
import { envSchema } from './env.schema';
import type {
  AppConfig,
  CoreDbConfig,
  CoreFrontendConfig,
  CoreServerConfig,
  IamAuthConfig,
  TransactionsStripeConfig,
} from './config.types';

const FALLBACK_BASE_URL = 'http://localhost:3000';

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
      secret: parsed.AUTH_SECRET,
    };
    this.stripe = { secretKey: parsed.STRIPE_SECRET_KEY };
  }
}
