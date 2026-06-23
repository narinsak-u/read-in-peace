// REST controller for borrow/return, Stripe checkout, and user transaction
// history. Maps to:
//   POST /api/books/:id/borrow|return|create-checkout-session
//   POST /api/cart/checkout
//   POST /api/confirm-purchase
//   GET  /api/user/borrows
//   GET  /api/user/purchases
import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  UseGuards,
  Body,
} from '@nestjs/common';
import { AuthGuard } from '../../iam/auth/auth.guard';
import { CurrentUser } from '../../iam/auth/current-user.decorator';
import { BorrowsService } from '../application/borrows.service';
import { CheckoutService } from '../application/checkout.service';
import { PurchaseConfirmationService } from '../application/purchase-confirmation.service';

@Controller()
export class TransactionsController {
  constructor(
    private readonly borrows: BorrowsService,
    private readonly checkout: CheckoutService,
    private readonly confirmation: PurchaseConfirmationService,
  ) {}

  @Post('api/books/:id/borrow')
  @UseGuards(AuthGuard)
  borrow(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.borrows.borrow(id, user.id);
  }

  @Post('api/books/:id/return')
  @UseGuards(AuthGuard)
  returnBook(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.borrows.returnBook(id, user.id);
  }

  @Post('api/books/:id/create-checkout-session')
  @UseGuards(AuthGuard)
  createCheckoutSession(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.checkout.forBook(id, user.id);
  }

  @Post('api/cart/checkout')
  @UseGuards(AuthGuard)
  cartCheckout(
    @Body() body: { bookIds: string[] },
    @CurrentUser() user: { id: string },
  ) {
    return this.checkout.forCart(body.bookIds, user.id);
  }

  @Post('api/confirm-purchase')
  @UseGuards(AuthGuard)
  confirmPurchase(
    @Query('session_id') sessionId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.confirmation.confirm(sessionId, user.id);
  }

  @Get('api/user/borrows')
  @UseGuards(AuthGuard)
  myBorrows(
    @CurrentUser() user: { id: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.borrows.listForUser(
      user.id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 3,
    );
  }

  @Get('api/user/purchases')
  @UseGuards(AuthGuard)
  myPurchases(@CurrentUser() user: { id: string }) {
    return this.confirmation.listForUser(user.id);
  }
}
