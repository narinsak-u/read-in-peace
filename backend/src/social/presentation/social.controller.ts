import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../iam/auth/auth.guard';
import { CurrentUser } from '../../iam/auth/current-user.decorator';
import { SocialService } from '../application/social.service';

@Controller('api/feed')
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Get()
  @UseGuards(AuthGuard)
  async getFeed(@CurrentUser() user?: { id: string }) {
    return this.socialService.getFeed(user?.id);
  }

  @Post()
  @UseGuards(AuthGuard)
  createPost(
    @Body('text') text: string,
    @CurrentUser() user: { id: string },
    @Body('rating') rating?: number,
  ) {
    return this.socialService.createPost(user.id, text, rating);
  }

  @Post(':id/like')
  @UseGuards(AuthGuard)
  toggleLike(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.socialService.toggleLike(id, user.id);
  }

  @Get(':id/like')
  @UseGuards(AuthGuard)
  getLikeStatus(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.socialService.getLikeStatus(id, user.id);
  }

  @Get(':id/replies')
  getReplies(@Param('id') id: string) {
    return this.socialService.getReplies(id);
  }

  @Post(':id/reply')
  @UseGuards(AuthGuard)
  createReply(
    @Param('id') id: string,
    @Body('text') text: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.socialService.createReply(id, user.id, text);
  }
}
