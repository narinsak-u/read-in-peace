// MembershipController — REST endpoints for the user-facing membership flow.
// All routes require authentication (AuthGuard).
//   POST /api/membership/checkout → create subscription checkout session
//   POST /api/membership/cancel   → set cancel_at_period_end
//   GET  /api/membership/me       → current membership + borrow counts
//   POST /api/membership/reactivate → unset cancel_at_period_end

import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../iam/auth/auth.guard';
import { CurrentUser } from '../../iam/auth/current-user.decorator';
import type { AuthUser } from '../../iam/auth/auth.port';
import { MembershipService } from '../application/membership.service';

@Controller()
export class MembershipController {
  constructor(private readonly membership: MembershipService) {}

  @Post('api/membership/checkout')
  @UseGuards(AuthGuard)
  createCheckoutSession(
    @Body('plan') plan: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.membership.createCheckoutSession(plan, user.id);
  }

  @Post('api/membership/cancel')
  @UseGuards(AuthGuard)
  cancel(@CurrentUser() user: AuthUser) {
    return this.membership.cancel(user.id);
  }

  @Get('api/membership/me')
  @UseGuards(AuthGuard)
  getMembership(@CurrentUser() user: AuthUser) {
    return this.membership.getMembershipWithBorrows(user.id);
  }

  @Post('api/membership/reactivate')
  @UseGuards(AuthGuard)
  reactivate(@CurrentUser() user: AuthUser) {
    return this.membership.reactivate(user.id);
  }
}
