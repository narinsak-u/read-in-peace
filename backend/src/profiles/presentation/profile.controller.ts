import { Controller, Get, Param } from '@nestjs/common';
import { ProfileService } from '../application/profile.service';

@Controller('api/profiles')
export class ProfileController {
  constructor(private readonly profiles: ProfileService) {}

  @Get(':id')
  async getProfile(@Param('id') id: string) {
    return this.profiles.getProfile(id);
  }
}
