// In-memory fake of LikeRepository. No Drizzle, no Postgres, no Docker.
import { Injectable } from '@nestjs/common';
import type { LikeRepository } from '../interfaces/like.repository';

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

