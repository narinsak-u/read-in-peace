// BooksService — use cases for the books feature. Owns no Drizzle imports;
// depends only on the domain repository contracts declared in domain/.
// The infrastructure layer (DrizzleBookRepository, DrizzleBookReadModel) is
// injected at the module boundary.
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { BOOK_READ_MODEL, BOOK_REPOSITORY } from '../domain/book.repository';
import type { BookReadModel, BookRepository } from '../domain/book.repository';
import { LIKE_REPOSITORY, RATING_REPOSITORY } from '../domain/engagement';
import type { LikeRepository, RatingRepository } from '../domain/engagement';
import type { NewBook, UpdateBook } from '../domain/book';

@Injectable()
export class BooksService {
  constructor(
    @Inject(BOOK_REPOSITORY) private readonly books: BookRepository,
    @Inject(BOOK_READ_MODEL) private readonly readModel: BookReadModel,
    @Inject(LIKE_REPOSITORY) private readonly likes: LikeRepository,
    @Inject(RATING_REPOSITORY) private readonly ratings: RatingRepository,
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

  create(data: NewBook, userId: string) {
    return this.books.create(data, userId);
  }

  async update(id: string, data: UpdateBook) {
    const updated = await this.books.update(id, data);
    if (!updated) throw new NotFoundException('Book not found');
    return updated;
  }

  async remove(id: string) {
    const deleted = await this.books.delete(id);
    if (!deleted) throw new NotFoundException('Book not found');
  }

  isLiked(bookId: string, userId: string) {
    return this.likes.isLikedBy(bookId, userId);
  }

  toggleLike(bookId: string, userId: string) {
    return this.likes.toggle(bookId, userId);
  }

  getUserRating(bookId: string, userId: string) {
    return this.ratings.findUserRating(bookId, userId);
  }

  rateBook(bookId: string, userId: string, rating: number) {
    return this.ratings.upsert(bookId, userId, rating);
  }
}
