// Generic authorization contract. The iam module provides the *mechanism* —
// this interface, the @Policies() decorator, and the PoliciesGuard that
// resolves policies by token. Each feature provides its own *policies* that
// implement `Policy` and are bound to CAN_* tokens (defined alongside the
// feature they protect).
import type { AuthUser } from '../auth/auth.port';

export interface PolicyContext {
  user: AuthUser;
  params: Record<string, string>;
  body: unknown;
}

export interface Policy {
  readonly action: string;
  check(ctx: PolicyContext): Promise<boolean>;
}
