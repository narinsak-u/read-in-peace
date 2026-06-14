// NestJS guard that validates requests via Better Auth session tokens.
// Extracts the user session from incoming headers and attaches the user to the request.
// Throws UnauthorizedException when no valid session exists.
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { auth } from './better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import * as schema from '../db/schema';

type DatabaseUser = typeof schema.user.$inferSelect;

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: DatabaseUser }>();
    const headers = fromNodeHeaders(request.headers);

    const result = await auth.api.getSession({
      headers,
    });

    if (!result) {
      throw new UnauthorizedException();
    }

    request.user = result.user as DatabaseUser;
    return true;
  }
}
