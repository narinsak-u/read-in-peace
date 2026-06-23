import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DeleteBookPolicy } from '../../../src/books/authorization/delete-book.policy';
import { DeleteCommentPolicy } from '../../../src/books/authorization/delete-comment.policy';
import { EditBookPolicy } from '../../../src/books/authorization/edit-book.policy';
import type { BookRepository } from '../../../src/books/domain/book.repository';
import type { CommentRepository } from '../../../src/books/domain/comment';

const alice = {
  id: 'alice',
  name: 'A',
  email: 'a@x',
  emailVerified: false,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const makeBookRepo = (createdBy: string | null) =>
  ({
    findById: async () => null,
    findByIdOrSlug: async () => null,
    findOwner: async () => createdBy,
    findPricingForPurchase: async () => [],
    create: async () => ({}) as never,
    update: async () => null,
    delete: async () => false,
    incrementStock: async () => undefined,
    decrementStock: async () => null,
    acquireLockForBorrow: async () => null,
  }) as unknown as BookRepository;

const makeCommentRepo = (userId: string | null) =>
  ({
    findByBook: async () => [],
    findById: async () => null,
    findRaw: async () =>
      userId
        ? {
            id: 'c1',
            bookId: 'b1',
            userId,
            parentId: null,
            text: 'x',
            rating: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        : null,
    create: async () => ({}) as never,
    delete: async () => undefined,
    countLikesFor: async () => new Map(),
    likedSetFor: async () => new Map(),
    like: async () => ({ liked: true, likeCount: 1 }),
    unlike: async () => ({ liked: false, likeCount: 0 }),
  }) as unknown as CommentRepository;

const bookPolicy = (owner: string | null) =>
  new EditBookPolicy(makeBookRepo(owner));

const deleteBookPolicy = (owner: string | null) =>
  new DeleteBookPolicy(makeBookRepo(owner));

const commentPolicy = (owner: string | null) =>
  new DeleteCommentPolicy(makeCommentRepo(owner));

describe('EditBookPolicy', () => {
  it('allows the owner', async () => {
    await expect(
      bookPolicy('alice').check({
        user: alice,
        params: { id: 'b1' },
        body: {},
      }),
    ).resolves.toBe(true);
  });

  it('forbids non-owners', async () => {
    await expect(
      bookPolicy('bob').check({
        user: alice,
        params: { id: 'b1' },
        body: {},
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws NotFound if book missing', async () => {
    await expect(
      bookPolicy(null).check({
        user: alice,
        params: { id: 'b1' },
        body: {},
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFound if id missing', async () => {
    await expect(
      bookPolicy('alice').check({
        user: alice,
        params: {},
        body: {},
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('DeleteBookPolicy', () => {
  it('forbids non-owners with the delete verb', async () => {
    await expect(
      deleteBookPolicy('bob').check({
        user: alice,
        params: { id: 'b1' },
        body: {},
      }),
    ).rejects.toThrow(/delete your own books/);
  });
});

describe('DeleteCommentPolicy', () => {
  it('allows the owner', async () => {
    await expect(
      commentPolicy('alice').check({
        user: alice,
        params: { id: 'c1' },
        body: {},
      }),
    ).resolves.toBe(true);
  });

  it('forbids non-owners', async () => {
    await expect(
      commentPolicy('bob').check({
        user: alice,
        params: { id: 'c1' },
        body: {},
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws NotFound if comment missing', async () => {
    await expect(
      commentPolicy(null).check({
        user: alice,
        params: { id: 'c1' },
        body: {},
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
