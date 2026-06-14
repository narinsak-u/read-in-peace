// NestJS param decorator that extracts the authenticated user from the request.
// Used in route handlers after AuthGuard populates request.user.
// Usage: @CurrentUser() user: User
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import * as schema from '../db/schema';

type DatabaseUser = typeof schema.user.$inferSelect;

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: DatabaseUser }>();
    return request.user;
  },
);
