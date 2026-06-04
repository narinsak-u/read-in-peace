import { Module } from '@nestjs/common';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { RatingsController } from './ratings.controller';
import { RatingsService } from './ratings.service';

@Module({
  controllers: [BooksController, CommentsController, RatingsController],
  providers: [BooksService, CommentsService, RatingsService],
  exports: [BooksService, CommentsService],
})
export class BooksModule {}
