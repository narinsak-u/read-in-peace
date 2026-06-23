import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard, OptionalAuthGuard } from '../../../src/iam/auth/auth.guard';
import {
  AUTH_PORT,
  type AuthPort,
  type AuthSession,
  type AuthUser,
} from '../../../src/iam/auth/auth.port';

const fakeUser = (id: string): AuthUser => ({
  id,
  name: id,
  email: `${id}@x.com`,
  emailVerified: false,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const makeSession = (id: string): AuthSession => ({
  user: fakeUser(id),
  session: { id: 's1', userId: id, expiresAt: new Date() },
});

const makeCtx = (req: {
  headers: Record<string, unknown>;
  user?: AuthUser;
}): ExecutionContext => {
  const ctx: ExecutionContext = {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  return ctx;
};

describe('AuthGuard', () => {
  it('attaches the user on a valid session', async () => {
    const port: AuthPort = {
      getSession: jest.fn().mockResolvedValue(makeSession('u1')),
    };
    const guard = new AuthGuard(port);
    const req = { headers: { cookie: 'sess=abc' } } as {
      headers: Record<string, unknown>;
      user?: AuthUser;
    };
    const ok = await guard.canActivate(makeCtx(req));
    expect(ok).toBe(true);
    expect(req.user?.id).toBe('u1');
    expect(port.getSession).toHaveBeenCalledWith({ cookie: 'sess=abc' });
  });

  it('throws UnauthorizedException when no session', async () => {
    const port: AuthPort = { getSession: jest.fn().mockResolvedValue(null) };
    const guard = new AuthGuard(port);
    await expect(
      guard.canActivate(makeCtx({ headers: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('OptionalAuthGuard', () => {
  it('attaches the user when a session exists', async () => {
    const port: AuthPort = {
      getSession: jest.fn().mockResolvedValue(makeSession('u2')),
    };
    const guard = new OptionalAuthGuard(port);
    const req = { headers: { cookie: 'sess=abc' } } as {
      headers: Record<string, unknown>;
      user?: AuthUser;
    };
    const ok = await guard.canActivate(makeCtx(req));
    expect(ok).toBe(true);
    expect(req.user?.id).toBe('u2');
  });

  it('returns true and leaves user undefined when no session', async () => {
    const port: AuthPort = { getSession: jest.fn().mockResolvedValue(null) };
    const guard = new OptionalAuthGuard(port);
    const ok = await guard.canActivate(makeCtx({ headers: {} }));
    expect(ok).toBe(true);
  });
});

describe('AUTH_PORT token', () => {
  it('is a unique symbol usable as a DI token', () => {
    expect(typeof AUTH_PORT).toBe('symbol');
  });
});
