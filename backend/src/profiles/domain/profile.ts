export const PROFILE_REPOSITORY = Symbol('PROFILE_REPOSITORY');

export interface ProfileUser {
  id: string;
  name: string;
  image: string | null;
  createdAt: Date;
}

export interface FollowInfo {
  following: boolean;
  followerCount: number;
}

export interface CategoryStat {
  category: string;
  borrowCount: number;
  purchaseCount: number;
}

export interface ProfileResponse {
  user: ProfileUser;
  categoryStats: CategoryStat[];
  follow: FollowInfo | null;
}

export interface ProfileRepository {
  findById(id: string): Promise<ProfileUser | null>;
  getCategoryStats(userId: string): Promise<CategoryStat[]>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  countFollowers(userId: string): Promise<number>;
  toggleFollow(
    followerId: string,
    followingId: string,
  ): Promise<{ following: boolean; followerCount: number }>;
}
