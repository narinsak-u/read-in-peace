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
import type { BookRepository } from '../domain/book.repository';
import { BOOK_REPOSITORY } from '../domain/book.repository';

@Injectable()
export class EditBookPolicy implements Policy {
  readonly action = 'edit_book';
  constructor(
    @Inject(BOOK_REPOSITORY) private readonly books: BookRepository,
  ) {}

  async check(ctx: PolicyContext): Promise<boolean> {
    const bookId = ctx.params['id'];
    if (!bookId) throw new NotFoundException('Book id missing');
    const owner = await this.books.findOwner(bookId);
    if (!owner) throw new NotFoundException('Book not found');
    if (owner !== ctx.user.id) {
      throw new ForbiddenException('You can only edit your own books');
    }
    return true;
  }
}
