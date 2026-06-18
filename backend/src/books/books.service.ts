// Business logic for books: CRUD, paginated listing, stock management, and trending.
// All Drizzle access goes through BookRepository and BookReadModel — the cross-table
// meta-projection (with likeCount, commentCount, avgRating) lives in BookReadModel only.
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  BOOK_REPO,
  type BookRepository,
  type NewBook,
} from '../repositories/tokens';
import { BOOK_READ_MODEL, type BookReadModel } from '../repositories/tokens';
import {
  LIKE_REPO,
  RATING_REPO,
  type LikeRepository,
  type RatingRepository,
} from '../repositories/tokens';
import type { CreateBookDto } from './dto/create-book.dto';
import type { UpdateBookDto } from './dto/update-book.dto';

@Injectable()
export class BooksService {
  constructor(
    @Inject(BOOK_REPO) private readonly books: BookRepository,
    @Inject(BOOK_READ_MODEL) private readonly readModel: BookReadModel,
    @Inject(LIKE_REPO) private readonly likes: LikeRepository,
    @Inject(RATING_REPO) private readonly ratings: RatingRepository,
  ) {}

  findAll(page: number, limit: number, category?: string) {
    return this.readModel.findFullPaginated(page, limit, category);
  }

  async findOne(idOrSlug: string) {
    const book = await this.readModel.findFullByIdOrSlug(idOrSlug);
    if (!book) throw new NotFoundException('Book not found');
    return book;
  }

  findNewArrivals() {
    return this.readModel.findNewArrivals(4);
  }

  getTrending() {
    return this.readModel.getTrending(3);
  }

  async create(data: CreateBookDto, userId: string) {
    return this.books.create(data as NewBook, userId);
  }

  async update(id: string, data: UpdateBookDto, userId: string) {
    const updated = await this.books.update(id, data);
    if (!updated) throw new NotFoundException('Book not found');
    return updated;
  }

  async remove(id: string, userId: string) {
    const deleted = await this.books.delete(id);
    if (!deleted) throw new NotFoundException('Book not found');
  }

  isLiked(bookId: string, userId: string) {
    return this.likes.isLikedBy(bookId, userId);
  }

  async toggleLike(bookId: string, userId: string) {
    const liked = await this.likes.toggle(bookId, userId);
    return { liked };
  }

  getUserRating(bookId: string, userId: string) {
    return this.ratings.findUserRating(bookId, userId);
  }

  async rateBook(bookId: string, userId: string, rating: number) {
    return this.ratings.upsert(bookId, userId, rating);
  }
}
