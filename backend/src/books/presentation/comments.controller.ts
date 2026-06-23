import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, OptionalAuthGuard } from '../../iam/auth/auth.guard';
import { CurrentUser } from '../../iam/auth/current-user.decorator';
import { PoliciesGuard } from '../../iam/authorization/policies.guard';
import { Policies } from '../../iam/authorization/policies.decorator';
import { CommentsService } from '../application/comments.service';
import { CAN_DELETE_COMMENT } from '../authorization/policy.tokens';
import { CreateCommentDto } from './dto/create-comment.dto';

@Controller('api/books/:id/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  @UseGuards(OptionalAuthGuard)
  findAll(@Param('id') id: string, @CurrentUser() user?: { id: string }) {
    return this.commentsService.findByBook(id, user?.id);
  }

  @Post()
  @UseGuards(AuthGuard)
  create(
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.commentsService.create(id, user.id, dto);
  }

  @Delete(':commentId')
  @UseGuards(AuthGuard, PoliciesGuard)
  @Policies(CAN_DELETE_COMMENT)
  remove(
    @Param('commentId') commentId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.commentsService.remove(commentId, user.id);
  }

  @Post(':commentId/like')
  @UseGuards(AuthGuard)
  like(
    @Param('commentId') commentId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.commentsService.like(commentId, user.id);
  }

  @Delete(':commentId/like')
  @UseGuards(AuthGuard)
  unlike(
    @Param('commentId') commentId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.commentsService.unlike(commentId, user.id);
  }
}
