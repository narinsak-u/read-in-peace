import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  Policy,
  PolicyContext,
} from '../../iam/authorization/policy.types';
import type { CommentRepository } from '../domain/comment';
import { COMMENT_REPOSITORY } from '../domain/comment';

@Injectable()
export class DeleteCommentPolicy implements Policy {
  readonly action = 'delete_comment';
  constructor(
    @Inject(COMMENT_REPOSITORY) private readonly comments: CommentRepository,
  ) {}

  async check(ctx: PolicyContext): Promise<boolean> {
    const commentId = ctx.params['commentId'] ?? ctx.params['id'];
    if (!commentId) throw new NotFoundException('Comment id missing');
    const comment = await this.comments.findRaw(commentId);
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== ctx.user.id) {
      throw new ForbiddenException('You can only delete your own comments');
    }
    return true;
  }
}
