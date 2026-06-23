// NestJS param decorator that extracts the authenticated user from the request.
// Used in route handlers after AuthGuard or OptionalAuthGuard populates
// request.user. Whether the user is required is encoded by the guard and the
// caller's signature (`user: AuthUser` vs `user?: AuthUser`).
// Usage:
//   @UseGuards(AuthGuard) create(@CurrentUser() user: AuthUser) { ... }
//   @UseGuards(OptionalAuthGuard) find(@CurrentUser() user?: AuthUser) { ... }
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from './auth.port';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    return request.user;
  },
);
