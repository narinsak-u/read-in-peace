// IAM module — provides the authentication & authorization mechanisms used by
// every feature module:
//   - AuthGuard / OptionalAuthGuard (session validation)
//   - CurrentUser decorator (extract user from request)
//   - PoliciesGuard + Policy interface (per-feature authorization)
//
// This module is NOT @Global. Features that need guards/decorators import
// this module and re-export them. The Better Auth instance (`AUTH`) is also
// exported so main.ts can mount it on /api/auth.
import { Module } from '@nestjs/common';
import { AuthGuard, OptionalAuthGuard } from './auth/auth.guard';
import { authProvider, AUTH } from './auth/better-auth';
import {
  BetterAuthAdapter,
  authPortProvider,
} from './auth/better-auth.adapter';
import { AUTH_PORT } from './auth/auth.port';
import { PoliciesGuard } from './authorization/policies.guard';

@Module({
  providers: [
    authProvider,
    BetterAuthAdapter,
    authPortProvider,
    AuthGuard,
    OptionalAuthGuard,
    PoliciesGuard,
  ],
  exports: [AUTH, AUTH_PORT, AuthGuard, OptionalAuthGuard, PoliciesGuard],
})
export class IamModule {}
