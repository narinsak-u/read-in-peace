import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import { PoliciesGuard } from '../../../src/iam/authorization/policies.guard';
import type { Policy } from '../../../src/iam/authorization/policy.types';

const makeUser = (id: string) => ({
  id,
  name: id,
  email: `${id}@x.com`,
  emailVerified: false,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const makeCtx = (overrides?: {
  user?: unknown;
  params?: Record<string, string>;
  body?: unknown;
}): ExecutionContext => {
  const req = {
    user: overrides?.user,
    params: overrides?.params ?? {},
    body: overrides?.body ?? {},
  };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
};

describe('PoliciesGuard', () => {
  let reflector: jest.Mocked<Reflector>;
  let moduleRef: jest.Mocked<ModuleRef>;
  let guard: PoliciesGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    moduleRef = {
      resolve: jest.fn(),
    } as unknown as jest.Mocked<ModuleRef>;

    guard = new PoliciesGuard(reflector, moduleRef);
  });

  it('passes when no policies are attached to the route', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const result = await guard.canActivate(makeCtx());
    expect(result).toBe(true);
    expect(moduleRef.resolve).not.toHaveBeenCalled();
  });

  it('passes when policies array is empty', async () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    const result = await guard.canActivate(makeCtx());
    expect(result).toBe(true);
  });

  it('throws UnauthorizedException when no user is on the request', async () => {
    reflector.getAllAndOverride.mockReturnValue(['CAN_EDIT_BOOK']);
    await expect(
      guard.canActivate(makeCtx({ user: undefined })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('resolves and runs each policy', async () => {
    reflector.getAllAndOverride.mockReturnValue([
      'CAN_EDIT_BOOK',
      'CAN_DELETE_BOOK',
    ]);

    const policy1: Policy = {
      action: 'edit',
      check: jest.fn().mockResolvedValue(true),
    };
    const policy2: Policy = {
      action: 'delete',
      check: jest.fn().mockResolvedValue(true),
    };

    moduleRef.resolve
      .mockResolvedValueOnce(policy1)
      .mockResolvedValueOnce(policy2);

    const alice = makeUser('alice');
    const result = await guard.canActivate(
      makeCtx({ user: alice, params: { id: 'b1' } }),
    );

    expect(result).toBe(true);
    expect(moduleRef.resolve).toHaveBeenCalledTimes(2);
    expect(moduleRef.resolve).toHaveBeenCalledWith('CAN_EDIT_BOOK', undefined, {
      strict: false,
    });
    expect(moduleRef.resolve).toHaveBeenCalledWith(
      'CAN_DELETE_BOOK',
      undefined,
      { strict: false },
    );
    expect(policy1.check).toHaveBeenCalledWith({
      user: alice,
      params: { id: 'b1' },
      body: {},
    });
    expect(policy2.check).toHaveBeenCalledWith({
      user: alice,
      params: { id: 'b1' },
      body: {},
    });
  });

  it('throws when a policy fails', async () => {
    reflector.getAllAndOverride.mockReturnValue(['CAN_EDIT_BOOK']);

    const failingPolicy: Policy = {
      action: 'edit',
      check: jest.fn().mockRejectedValue(new Error('Not allowed')),
    };

    moduleRef.resolve.mockResolvedValue(failingPolicy);

    const alice = makeUser('alice');
    await expect(
      guard.canActivate(makeCtx({ user: alice, params: { id: 'b1' } })),
    ).rejects.toThrow('Not allowed');
  });

  it('passes body through the policy context', async () => {
    reflector.getAllAndOverride.mockReturnValue(['CAN_EDIT_BOOK']);

    const policy: Policy = {
      action: 'edit',
      check: jest.fn().mockResolvedValue(true),
    };

    moduleRef.resolve.mockResolvedValue(policy);

    const alice = makeUser('alice');
    await guard.canActivate(
      makeCtx({ user: alice, params: { id: 'b1' }, body: { title: 'New' } }),
    );

    expect(policy.check).toHaveBeenCalledWith({
      user: alice,
      params: { id: 'b1' },
      body: { title: 'New' },
    });
  });
});
