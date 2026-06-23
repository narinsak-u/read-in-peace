// Adapter from Better Auth's API to the iam AuthPort interface. Lets the
// guards depend on a small, testable contract (AuthPort) instead of Better
// Auth's full surface.
import { Inject, Injectable } from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import { AUTH } from './better-auth';
import {
  AUTH_PORT,
  type AuthPort,
  type AuthSession,
  type AuthUser,
} from './auth.port';

type AuthInstance = {
  api: {
    getSession: (args: {
      headers: unknown;
    }) => Promise<{ user: AuthUser; session: AuthSession['session'] } | null>;
  };
};

@Injectable()
export class BetterAuthAdapter implements AuthPort {
  constructor(@Inject(AUTH) private readonly auth: AuthInstance) {}

  async getSession(
    headers: Record<string, unknown>,
  ): Promise<AuthSession | null> {
    const result = await this.auth.api.getSession({
      headers: fromNodeHeaders(headers as never),
    });
    if (!result) return null;
    return { user: result.user, session: result.session };
  }
}

export const authPortProvider = {
  provide: AUTH_PORT,
  useExisting: BetterAuthAdapter,
};
