import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../iam/auth/auth.guard';
import { OptionalAuthGuard } from '../../iam/auth/auth.guard';
import { CurrentUser } from '../../iam/auth/current-user.decorator';
import { ProfileService } from '../application/profile.service';
import type { AuthUser } from '../../iam/auth/auth.port';

@Controller('api/profiles')
export class ProfileController {
  constructor(private readonly profiles: ProfileService) {}

  @Get(':id')
  @UseGuards(OptionalAuthGuard)
  async getProfile(@Param('id') id: string, @CurrentUser() user?: AuthUser) {
    return this.profiles.getProfile(id, user?.id);
  }

  @Post(':id/follow')
  @UseGuards(AuthGuard)
  async toggleFollow(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.profiles.toggleFollow(user.id, id);
  }
}
