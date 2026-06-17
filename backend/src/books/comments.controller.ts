import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { AuthGuard } from '../auth/auth.guard';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { OptionalUser } from '../auth/optional-user.decorator';
import { CreateCommentDto } from './dto/create-comment.dto';

@Controller('api/books/:id/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  @UseGuards(OptionalAuthGuard)
  findAll(@Param('id') id: string, @OptionalUser() user?: { id: string }) {
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
  @UseGuards(AuthGuard)
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
