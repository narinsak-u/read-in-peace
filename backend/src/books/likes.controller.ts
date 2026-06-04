import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { LikesService } from './likes.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('api/books/:id/like')
@UseGuards(AuthGuard)
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post()
  toggle(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.likesService.toggle(id, user.id);
  }
}
