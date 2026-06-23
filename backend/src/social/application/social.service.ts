import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { POST_REPOSITORY, type PostRepository } from '../domain/post';

@Injectable()
export class SocialService {
  constructor(
    @Inject(POST_REPOSITORY) private readonly posts: PostRepository,
  ) {}

  getFeed(userId?: string) {
    return this.posts.feed(20, userId);
  }

  createPost(userId: string, text: string, rating?: number) {
    return this.posts.create(userId, text, rating);
  }

  toggleLike(postId: string, userId: string) {
    return this.posts.toggleLike(postId, userId);
  }

  async getLikeStatus(postId: string, userId: string) {
    const liked = await this.posts.isLikedBy(postId, userId);
    return { liked };
  }

  getReplies(postId: string) {
    return this.posts.getReplies(postId);
  }

  async createReply(postId: string, userId: string, text: string) {
    const post = await this.posts.findById(postId);
    if (!post) throw new NotFoundException('Post not found');
    return this.posts.createReply(postId, userId, text);
  }
}
