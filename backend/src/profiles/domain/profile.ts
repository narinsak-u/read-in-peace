export const PROFILE_REPOSITORY = Symbol('PROFILE_REPOSITORY');

export interface ProfileUser {
  id: string;
  name: string;
  image: string | null;
  createdAt: Date;
}

export interface CategoryStat {
  category: string;
  borrowCount: number;
  purchaseCount: number;
}

export interface ProfileResponse {
  user: ProfileUser;
  categoryStats: CategoryStat[];
}

export interface ProfileRepository {
  findById(id: string): Promise<ProfileUser | null>;
  getCategoryStats(userId: string): Promise<CategoryStat[]>;
}
