// Typed config slices. Each feature owns its slice; the CoreConfigService
// aggregates them at startup. Adding a new env var means: extend env.schema.ts,
// add a slice here, expose it from the constructor, and consume from the feature.

export interface CoreDbConfig {
  readonly url: string;
}

export interface CoreServerConfig {
  readonly port: number;
  readonly corsOrigins: readonly string[];
  readonly nodeEnv: 'development' | 'production' | 'test';
  readonly logLevel:
    | 'fatal'
    | 'error'
    | 'warn'
    | 'info'
    | 'debug'
    | 'trace'
    | 'silent';
}

export interface CoreFrontendConfig {
  readonly url: string;
}

export interface IamAuthConfig {
  readonly baseUrl: string;
  readonly trustedOrigins: readonly string[];
  readonly secret: string | undefined;
}

export interface TransactionsStripeConfig {
  readonly secretKey: string;
}

export interface AppConfig {
  readonly db: CoreDbConfig;
  readonly server: CoreServerConfig;
  readonly frontend: CoreFrontendConfig;
  readonly auth: IamAuthConfig;
  readonly stripe: TransactionsStripeConfig;
}
