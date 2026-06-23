// Generic guard that resolves and runs any number of policies bound to the
// route via @Policies(token, ...). Each policy is looked up by string token
// from the active DI container; tokens are declared by the features that
// own the resource (e.g. books/ defines CAN_EDIT_BOOK and binds a policy
// implementation to that token).
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import { POLICIES_KEY } from './policies.decorator';
import { Policy, PolicyContext } from './policy.types';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const tokens = this.reflector.getAllAndOverride<string[]>(POLICIES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!tokens || tokens.length === 0) return true;

    const request = context.switchToHttp().getRequest<{
      user?: PolicyContext['user'];
      params: Record<string, string>;
      body: unknown;
    }>();
    if (!request.user) throw new UnauthorizedException();

    const ctx: PolicyContext = {
      user: request.user,
      params: request.params ?? {},
      body: request.body,
    };

    for (const token of tokens) {
      const policy = await this.moduleRef.resolve<Policy>(token, undefined, {
        strict: false,
      });
      await policy.check(ctx);
    }
    return true;
  }
}
