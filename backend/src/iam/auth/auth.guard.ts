// NestJS guard that validates requests via AuthPort. Subclass
// `OptionalAuthGuard` is provided for routes that should pass through with
// `user: undefined` when no session is present (read-side endpoints that
// personalize when signed in).
import {
  Inject,
  Injectable,
  Optional,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AUTH_PORT, type AuthPort, type AuthUser } from './auth.port';

export interface AuthGuardOptions {
  required?: boolean;
}

@Injectable()
export class AuthGuard implements CanActivate {
  protected readonly required: boolean;

  constructor(
    @Inject(AUTH_PORT) private readonly port: AuthPort,
    @Optional() options?: AuthGuardOptions,
  ) {
    this.required = options?.required !== false;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();

    const result = await this.port.getSession(request.headers);

    if (!result) {
      if (this.required) {
        throw new UnauthorizedException();
      }
      return true;
    }

    request.user = result.user;
    return true;
  }
}

@Injectable()
export class OptionalAuthGuard extends AuthGuard {
  constructor(@Inject(AUTH_PORT) port: AuthPort) {
    super(port, { required: false });
  }
}
