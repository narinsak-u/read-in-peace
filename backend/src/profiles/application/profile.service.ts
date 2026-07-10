import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { ProfileResponse, FollowInfo } from '../domain/profile';
import { PROFILE_REPOSITORY } from '../domain/profile';
import type { ProfileRepository } from '../domain/profile';

@Injectable()
export class ProfileService {
  constructor(
    @Inject(PROFILE_REPOSITORY) private readonly profiles: ProfileRepository,
  ) {}

  async getProfile(
    profileId: string,
    currentUserId?: string,
  ): Promise<ProfileResponse> {
    const user = await this.profiles.findById(profileId);
    if (!user) throw new NotFoundException('User not found');

    const [categoryStats, follow] = await Promise.all([
      this.profiles.getCategoryStats(profileId),
      currentUserId ? this.getFollowStatus(currentUserId, profileId) : null,
    ]);

    return { user, categoryStats, follow };
  }

  private async getFollowStatus(
    followerId: string,
    profileId: string,
  ): Promise<FollowInfo> {
    const [following, followerCount] = await Promise.all([
      this.profiles.isFollowing(followerId, profileId),
      this.profiles.countFollowers(profileId),
    ]);
    return { following, followerCount };
  }

  async toggleFollow(
    followerId: string,
    followingId: string,
  ): Promise<{ following: boolean; followerCount: number }> {
    if (followerId === followingId) {
      throw new ForbiddenException('You cannot follow yourself');
    }
    const target = await this.profiles.findById(followingId);
    if (!target) throw new NotFoundException('User not found');
    return this.profiles.toggleFollow(followerId, followingId);
  }
}
