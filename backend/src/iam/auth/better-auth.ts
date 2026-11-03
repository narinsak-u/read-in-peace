// Better Auth instance. Lives in iam/infrastructure — depends on
// CoreConfigService and CoreDatabaseModule. Exposes the raw Better Auth client
// to main.ts (which mounts it on /api/auth) and to the BetterAuthAdapter.
import { Provider } from '@nestjs/common';
import { betterAuth } from 'better-auth/minimal';
import { genericOAuth } from 'better-auth/plugins';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../core/database/schema';
import { CoreConfigService } from '../../core/config/config.provider';
import { DATABASE } from '../../core/database/database.provider';

export const AUTH = Symbol('AUTH');

export const authProvider: Provider = {
  provide: AUTH,
  inject: [DATABASE, CoreConfigService],
  useFactory: (db: NodePgDatabase<typeof schema>, config: CoreConfigService) => {
    const centralIdentity = config.auth.centralIdentity;
    const oauth = centralIdentity
      ? [
          genericOAuth({
            config: [
              {
                providerId: 'central-identity',
                discoveryUrl: `${centralIdentity.issuer}/.well-known/openid-configuration`,
                clientId: centralIdentity.clientId,
                clientSecret: centralIdentity.clientSecret,
                scopes: ['openid', 'email', 'profile'],
                disableProviderLogout: true,
              },
            ],
          }),
        ]
      : [];
    return betterAuth({
      database: drizzleAdapter(db, { provider: 'pg', schema }),
      emailAndPassword: { enabled: true },
      account: { accountLinking: { disableImplicitLinking: true } },
      plugins: oauth,
      trustedOrigins: [...config.auth.trustedOrigins],
      baseURL: config.auth.baseUrl,
    });
  },
};
