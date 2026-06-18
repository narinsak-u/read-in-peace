// Registers books and comments controllers and services.
// Exports BooksService and CommentsService for cross-module use (e.g. purchases, admin).
import { Module } from '@nestjs/common';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

@Module({
  controllers: [BooksController, CommentsController],
  providers: [BooksService, CommentsService],
  exports: [BooksService, CommentsService],
})
export class BooksModule {}
