import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('api/books/:id/rate')
@UseGuards(AuthGuard)
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post()
  rate(
    @Param('id') id: string,
    @Body('rating') rating: number,
    @CurrentUser() user: { id: string },
  ) {
    return this.ratingsService.upsert(id, user.id, rating);
  }
}
