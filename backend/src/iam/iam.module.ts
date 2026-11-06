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
import { IdentityRecoveryController } from './identity-recovery/identity-recovery.controller';
import { IdentityRecoveryService } from './identity-recovery/identity-recovery.service';
import { IDENTITY_RECOVERY_REPOSITORY } from './identity-recovery/domain/identity-recovery.repository';
import { DrizzleIdentityRecoveryRepository } from './identity-recovery/infrastructure/drizzle-identity-recovery.repository';

@Module({
  controllers: [IdentityRecoveryController],
  providers: [
    authProvider,
    BetterAuthAdapter,
    authPortProvider,
    AuthGuard,
    OptionalAuthGuard,
    PoliciesGuard,
    DrizzleIdentityRecoveryRepository,
    { provide: IDENTITY_RECOVERY_REPOSITORY, useExisting: DrizzleIdentityRecoveryRepository },
    IdentityRecoveryService,
  ],
  exports: [AUTH, AUTH_PORT, AuthGuard, OptionalAuthGuard, PoliciesGuard],
})
export class IamModule {}
