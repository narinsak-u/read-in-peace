// In-memory LikeRepository for unit tests. The Drizzle implementation is
// the production wiring; this fake lets policy/service tests run without
// touching the database.
import { Injectable } from '@nestjs/common';
import { LikeRepository } from '../domain/engagement';

@Injectable()
export class InMemoryLikeRepository implements LikeRepository {
  private likes = new Map<string, Set<string>>();

  isLikedBy(bookId: string, userId: string): Promise<boolean> {
    return Promise.resolve(this.likes.get(bookId)?.has(userId) ?? false);
  }

  toggle(
    bookId: string,
    userId: string,
  ): Promise<{ liked: boolean; likeCount: number }> {
    const set = this.likes.get(bookId) ?? new Set<string>();
    const wasLiked = set.has(userId);
    if (wasLiked) set.delete(userId);
    else set.add(userId);
    this.likes.set(bookId, set);
    return Promise.resolve({ liked: !wasLiked, likeCount: set.size });
  }
}
