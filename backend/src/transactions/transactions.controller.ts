// REST controller for borrow/return, Stripe checkout, and user transaction history.
// All endpoints are auth-guarded. Maps to api/books/:id/borrow|return|create-checkout-session,
// api/confirm-purchase, api/user/borrows, and api/user/purchases.
import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  UseGuards,
  Body,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller()
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('api/books/:id/borrow')
  @UseGuards(AuthGuard)
  borrow(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.transactionsService.borrow(id, user.id);
  }

  @Post('api/books/:id/return')
  @UseGuards(AuthGuard)
  returnBook(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.transactionsService.returnBook(id, user.id);
  }

  @Post('api/books/:id/create-checkout-session')
  @UseGuards(AuthGuard)
  createCheckoutSession(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.transactionsService.createCheckoutSession(id, user.id);
  }

  @Post('api/cart/checkout')
  @UseGuards(AuthGuard)
  cartCheckout(
    @Body() body: { bookIds: string[] },
    @CurrentUser() user: { id: string },
  ) {
    return this.transactionsService.createCartCheckoutSession(
      body.bookIds,
      user.id,
    );
  }

  @Post('api/confirm-purchase')
  @UseGuards(AuthGuard)
  confirmPurchase(
    @Query('session_id') sessionId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.transactionsService.confirmPurchase(sessionId, user.id);
  }

  @Get('api/user/borrows')
  @UseGuards(AuthGuard)
  myBorrows(@CurrentUser() user: { id: string }) {
    return this.transactionsService.getUserBorrows(user.id);
  }

  @Get('api/user/purchases')
  @UseGuards(AuthGuard)
  myPurchases(@CurrentUser() user: { id: string }) {
    return this.transactionsService.getUserPurchases(user.id);
  }
}
