import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ProfileResponse } from '../domain/profile';
import { PROFILE_REPOSITORY } from '../domain/profile';
import type { ProfileRepository } from '../domain/profile';

@Injectable()
export class ProfileService {
  constructor(
    @Inject(PROFILE_REPOSITORY) private readonly profiles: ProfileRepository,
  ) {}

  async getProfile(profileId: string): Promise<ProfileResponse> {
    const user = await this.profiles.findById(profileId);
    if (!user) throw new NotFoundException('User not found');

    const categoryStats = await this.profiles.getCategoryStats(profileId);
    return { user, categoryStats };
  }
}
