import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BooksService } from '../../../src/books/application/books.service';
import {
  BOOK_REPOSITORY,
  BOOK_READ_MODEL,
  type BookProjection,
  type BookRepository,
  type BookReadModel,
} from '../../../src/books/domain/book.repository';
import {
  LIKE_REPOSITORY,
  RATING_REPOSITORY,
  type LikeRepository,
  type RatingRepository,
} from '../../../src/books/domain/engagement';
import type {
  BookRow,
  NewBook,
  UpdateBook,
} from '../../../src/books/domain/book';

const fakeBookRow = (id: string): BookRow => ({
  id,
  slug: `book-${id}`,
  title: `Book ${id}`,
  author: 'Author',
  price: '25.00',
  cover: '',
  synopsis: '',
  category: 'Fiction',
  crop: null,
  shelf: 'A1',
  year: 2024,
  trending: false,
  inStock: 5,
  isAvailable: true,
  totalPages: 300,
  createdBy: 'u1',
  createdAt: new Date(),
  updatedAt: new Date(),
});

const fakeProjection = (id: string): BookProjection => ({
  ...fakeBookRow(id),
  likeCount: 3,
  commentCount: 2,
  avgRating: 4.2,
  ratingsCount: 10,
});

const paginatedResult = (books: BookProjection[]) => ({
  data: books,
  meta: { page: 1, limit: 10, total: books.length, totalPages: 1 },
});

describe('BooksService', () => {
  let svc: BooksService;
  let books: jest.Mocked<BookRepository>;
  let readModel: jest.Mocked<BookReadModel>;
  let likes: jest.Mocked<LikeRepository>;
  let ratings: jest.Mocked<RatingRepository>;

  beforeEach(async () => {
    books = {
      findById: jest.fn(),
      findByIdOrSlug: jest.fn(),
      findOwner: jest.fn(),
      findPricingForPurchase: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      incrementStock: jest.fn(),
      decrementStock: jest.fn(),
      acquireLockForBorrow: jest.fn(),
    };

    readModel = {
      findFullById: jest.fn(),
      findFullByIdOrSlug: jest.fn(),
      findFullPaginated: jest.fn(),
      findNewArrivals: jest.fn(),
      getTrending: jest.fn(),
      attachToBorrows: jest.fn(),
      attachToPurchases: jest.fn(),
      search: jest.fn(),
    };

    likes = {
      isLikedBy: jest.fn(),
      toggle: jest.fn(),
    };

    ratings = {
      findUserRating: jest.fn(),
      upsert: jest.fn(),
      recordFromComment: jest.fn(),
      getAvgForBook: jest.fn(),
    };

    const mod = await Test.createTestingModule({
      providers: [
        BooksService,
        { provide: BOOK_REPOSITORY, useValue: books },
        { provide: BOOK_READ_MODEL, useValue: readModel },
        { provide: LIKE_REPOSITORY, useValue: likes },
        { provide: RATING_REPOSITORY, useValue: ratings },
      ],
    }).compile();

    svc = mod.get<BooksService>(BooksService);
  });

  describe('findAll', () => {
    it('delegates to readModel.findFullPaginated', async () => {
      readModel.findFullPaginated.mockResolvedValue(paginatedResult([]));
      const result = await svc.findAll(1, 20, 'Fiction');
      expect(result).toEqual(paginatedResult([]));
      expect(readModel.findFullPaginated).toHaveBeenCalledWith(
        1,
        20,
        'Fiction',
      );
    });

    it('omits category when not provided', async () => {
      readModel.findFullPaginated.mockResolvedValue(paginatedResult([]));
      await svc.findAll(2, 10);
      expect(readModel.findFullPaginated).toHaveBeenCalledWith(
        2,
        10,
        undefined,
      );
    });
  });

  describe('findOne', () => {
    it('returns the book projection when found', async () => {
      readModel.findFullByIdOrSlug.mockResolvedValue(fakeProjection('b1'));
      const result = await svc.findOne('b1');
      expect(result.id).toBe('b1');
      expect(result.title).toBe('Book b1');
      expect(result.avgRating).toBe(4.2);
    });

    it('throws NotFoundException when missing', async () => {
      readModel.findFullByIdOrSlug.mockResolvedValue(null);
      await expect(svc.findOne('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findNewArrivals', () => {
    it('delegates to readModel.findNewArrivals with limit 4', async () => {
      readModel.findNewArrivals.mockResolvedValue([fakeProjection('b1')]);
      const result = await svc.findNewArrivals();
      expect(result).toHaveLength(1);
      expect(readModel.findNewArrivals).toHaveBeenCalledWith(4);
    });
  });

  describe('getTrending', () => {
    it('delegates to readModel.getTrending with limit 3', async () => {
      readModel.getTrending.mockResolvedValue([fakeProjection('b1')]);
      const result = await svc.getTrending();
      expect(result).toHaveLength(1);
      expect(readModel.getTrending).toHaveBeenCalledWith(3);
    });
  });

  describe('create', () => {
    it('delegates to books.create', async () => {
      const data: NewBook = {
        slug: 'new-book',
        title: 'New',
        author: 'A',
        price: '10.00',
        cover: '',
        synopsis: '',
        category: 'Fiction',
        shelf: 'A1',
        year: 2025,
      };
      const expected = fakeBookRow('new');
      books.create.mockResolvedValue(expected);
      const result = await svc.create(data, 'u1');
      expect(result).toEqual(expected);
      expect(books.create).toHaveBeenCalledWith(data, 'u1');
    });
  });

  describe('update', () => {
    it('delegates to books.update', async () => {
      const data: UpdateBook = { title: 'Updated' };
      books.update.mockResolvedValue(fakeBookRow('b1'));
      const result = await svc.update('b1', data);
      expect(result.id).toBe('b1');
      expect(result.title).toBe('Book b1');
      expect(books.update).toHaveBeenCalledWith('b1', data);
    });

    it('throws NotFoundException when book missing', async () => {
      books.update.mockResolvedValue(null);
      await expect(svc.update('missing', {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('delegates to books.delete', async () => {
      books.delete.mockResolvedValue(true);
      await expect(svc.remove('b1')).resolves.toBeUndefined();
      expect(books.delete).toHaveBeenCalledWith('b1');
    });

    it('throws NotFoundException when book missing', async () => {
      books.delete.mockResolvedValue(false);
      await expect(svc.remove('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('isLiked', () => {
    it('delegates to likes.isLikedBy', async () => {
      likes.isLikedBy.mockResolvedValue(true);
      const result = await svc.isLiked('b1', 'u1');
      expect(result).toBe(true);
      expect(likes.isLikedBy).toHaveBeenCalledWith('b1', 'u1');
    });
  });

  describe('toggleLike', () => {
    it('delegates to likes.toggle', async () => {
      likes.toggle.mockResolvedValue({ liked: true, likeCount: 5 });
      const result = await svc.toggleLike('b1', 'u1');
      expect(result).toEqual({ liked: true, likeCount: 5 });
      expect(likes.toggle).toHaveBeenCalledWith('b1', 'u1');
    });
  });

  describe('getUserRating', () => {
    it('delegates to ratings.findUserRating', async () => {
      ratings.findUserRating.mockResolvedValue(4);
      const result = await svc.getUserRating('b1', 'u1');
      expect(result).toBe(4);
      expect(ratings.findUserRating).toHaveBeenCalledWith('b1', 'u1');
    });
  });

  describe('rateBook', () => {
    it('delegates to ratings.upsert', async () => {
      await svc.rateBook('b1', 'u1', 5);
      expect(ratings.upsert).toHaveBeenCalledWith('b1', 'u1', 5);
    });
  });
});
