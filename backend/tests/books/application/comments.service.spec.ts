import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CommentsService } from '../../../src/books/application/comments.service';
import {
  COMMENT_REPOSITORY,
  type CommentRepository,
  type CommentWithUser,
} from '../../../src/books/domain/comment';
import {
  RATING_REPOSITORY,
  type RatingRepository,
} from '../../../src/books/domain/engagement';
import { DATABASE } from '../../../src/core/database/database.provider';
import type { CreateCommentDto } from '../../../src/books/presentation/dto/create-comment.dto';

const makeComment = (
  id: string,
  bookId: string,
  userId: string,
  parentId: string | null,
): CommentWithUser => ({
  id,
  bookId,
  userId,
  parentId,
  text: 'text',
  rating: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  user: { id: userId, name: 'User', image: null },
});

describe('CommentsService', () => {
  let svc: CommentsService;
  let comments: jest.Mocked<CommentRepository>;
  let ratings: jest.Mocked<RatingRepository>;
  let db: { transaction: jest.Mock };

  const mockTx = {};

  beforeEach(async () => {
    comments = {
      findByBook: jest.fn(),
      findById: jest.fn(),
      findRaw: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      countLikesFor: jest.fn(),
      likedSetFor: jest.fn(),
      like: jest.fn(),
      unlike: jest.fn(),
    };

    ratings = {
      findUserRating: jest.fn(),
      upsert: jest.fn(),
      recordFromComment: jest.fn(),
      getAvgForBook: jest.fn(),
    };

    db = {
      transaction: jest.fn().mockImplementation((cb) => cb(mockTx)),
    };

    const mod = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: COMMENT_REPOSITORY, useValue: comments },
        { provide: RATING_REPOSITORY, useValue: ratings },
        { provide: DATABASE, useValue: db },
      ],
    }).compile();

    svc = mod.get<CommentsService>(CommentsService);
  });

  describe('findByBook', () => {
    it('groups top-level comments with their replies', async () => {
      const c1 = makeComment('c1', 'b1', 'u1', null);
      const c2 = makeComment('c2', 'b1', 'u1', null);
      const r1 = makeComment('r1', 'b1', 'u2', 'c1');
      const r2 = makeComment('r2', 'b1', 'u2', 'c1');

      comments.findByBook.mockResolvedValue([c1, c2, r1, r2]);
      comments.countLikesFor.mockResolvedValue(
        new Map([
          ['c1', 3],
          ['c2', 1],
          ['r1', 0],
          ['r2', 5],
        ]),
      );

      const result = await svc.findByBook('b1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('c1');
      expect(result[0].replies).toHaveLength(2);
      expect(result[0].replies[0].id).toBe('r1');
      expect(result[0].replies[1].id).toBe('r2');
      expect(result[1].id).toBe('c2');
      expect(result[1].replies).toHaveLength(0);
      expect(result[0].likeCount).toBe(3);
    });

    it('includes likedByUser when currentUserId is given', async () => {
      const c1 = makeComment('c1', 'b1', 'u1', null);
      comments.findByBook.mockResolvedValue([c1]);
      comments.countLikesFor.mockResolvedValue(new Map([['c1', 1]]));
      comments.likedSetFor.mockResolvedValue(new Map([['c1', true]]));

      const result = await svc.findByBook('b1', 'u1');
      expect(result[0].likedByUser).toBe(true);
      expect(comments.likedSetFor).toHaveBeenCalledWith(['c1'], 'u1');
    });

    it('defaults likedByUser to false when no user', async () => {
      const c1 = makeComment('c1', 'b1', 'u1', null);
      comments.findByBook.mockResolvedValue([c1]);
      comments.countLikesFor.mockResolvedValue(new Map([['c1', 1]]));

      const result = await svc.findByBook('b1');
      expect(result[0].likedByUser).toBe(false);
      expect(comments.likedSetFor).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    const dto: CreateCommentDto = { text: 'Great book!' };

    it('creates a top-level comment and records rating in a transaction', async () => {
      comments.create.mockResolvedValue(makeComment('c1', 'b1', 'u1', null));
      comments.findByBook.mockResolvedValue([
        makeComment('c1', 'b1', 'u1', null),
      ]);

      const result = await svc.create('b1', 'u1', dto);

      expect(db.transaction).toHaveBeenCalled();
      expect(comments.create).toHaveBeenCalledWith(
        {
          bookId: 'b1',
          userId: 'u1',
          text: 'Great book!',
          parentId: null,
          rating: null,
        },
        mockTx,
      );
      expect(ratings.recordFromComment).toHaveBeenCalledWith(mockTx, {
        bookId: 'b1',
        userId: 'u1',
        rating: null,
      });
      expect(result.likeCount).toBe(0);
      expect(result.likedByUser).toBe(false);
    });

    it('rejects a reply that includes a rating', async () => {
      comments.findRaw.mockResolvedValue({
        id: 'c1',
        bookId: 'b1',
        userId: 'u1',
        parentId: null,
        text: 'parent',
        rating: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const replyDto: CreateCommentDto = {
        text: 'reply',
        parentId: 'c1',
        rating: 4,
      };
      await expect(svc.create('b1', 'u1', replyDto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('throws NotFoundException when parent comment does not exist', async () => {
      comments.findRaw.mockResolvedValue(null);
      const replyDto: CreateCommentDto = { text: 'reply', parentId: 'missing' };

      await expect(svc.create('b1', 'u1', replyDto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(comments.findRaw).toHaveBeenCalledWith('missing');
    });

    it('throws BadRequestException when parent belongs to a different book', async () => {
      comments.findRaw.mockResolvedValue({
        id: 'c1',
        bookId: 'b2',
        userId: 'u1',
        parentId: null,
        text: 'parent',
        rating: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const replyDto: CreateCommentDto = { text: 'reply', parentId: 'c1' };

      await expect(svc.create('b1', 'u1', replyDto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('creates a reply when parent is valid and belongs to the same book', async () => {
      comments.findRaw.mockResolvedValue({
        id: 'c1',
        bookId: 'b1',
        userId: 'u1',
        parentId: null,
        text: 'parent',
        rating: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const replyDto: CreateCommentDto = { text: 'reply', parentId: 'c1' };
      comments.create.mockResolvedValue(makeComment('r1', 'b1', 'u1', 'c1'));
      comments.findByBook.mockResolvedValue([
        makeComment('r1', 'b1', 'u1', 'c1'),
      ]);

      const result = await svc.create('b1', 'u1', replyDto);

      expect(comments.create).toHaveBeenCalledWith(
        {
          bookId: 'b1',
          userId: 'u1',
          text: 'reply',
          parentId: 'c1',
          rating: null,
        },
        mockTx,
      );
      expect(ratings.recordFromComment).toHaveBeenCalledWith(mockTx, {
        bookId: 'b1',
        userId: 'u1',
        rating: null,
      });
      expect(result.id).toBe('r1');
    });
  });

  describe('remove', () => {
    it('deletes the comment when the user is the owner', async () => {
      comments.findRaw.mockResolvedValue({
        id: 'c1',
        bookId: 'b1',
        userId: 'u1',
        parentId: null,
        text: 'x',
        rating: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await svc.remove('c1', 'u1');
      expect(comments.delete).toHaveBeenCalledWith('c1');
    });

    it('throws ForbiddenException when the user is not the owner', async () => {
      comments.findRaw.mockResolvedValue({
        id: 'c1',
        bookId: 'b1',
        userId: 'u2',
        parentId: null,
        text: 'x',
        rating: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(svc.remove('c1', 'u1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(comments.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when comment does not exist', async () => {
      comments.findRaw.mockResolvedValue(null);
      await expect(svc.remove('missing', 'u1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('like', () => {
    it('delegates to comments.like', async () => {
      comments.like.mockResolvedValue({ liked: true, likeCount: 2 });
      const result = await svc.like('c1', 'u1');
      expect(result).toEqual({ liked: true, likeCount: 2 });
      expect(comments.like).toHaveBeenCalledWith('c1', 'u1');
    });
  });

  describe('unlike', () => {
    it('delegates to comments.unlike', async () => {
      comments.unlike.mockResolvedValue({ liked: false, likeCount: 1 });
      const result = await svc.unlike('c1', 'u1');
      expect(result).toEqual({ liked: false, likeCount: 1 });
      expect(comments.unlike).toHaveBeenCalledWith('c1', 'u1');
    });
  });
});
