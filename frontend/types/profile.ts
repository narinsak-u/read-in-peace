export interface ProfileUser {
  id: string;
  name: string;
  image: string | null;
  createdAt: string;
}

export interface CategoryStat {
  category: string;
  borrowCount: number;
  purchaseCount: number;
}

export interface FollowInfo {
  following: boolean;
  followerCount: number;
}

export interface ProfileResponse {
  user: ProfileUser;
  categoryStats: CategoryStat[];
  follow: FollowInfo | null;
}
