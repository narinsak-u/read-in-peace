import { InMemoryLikeRepository } from '../../../src/books/infrastructure/in-memory-like.repository';

describe('InMemoryLikeRepository', () => {
  let repo: InMemoryLikeRepository;

  beforeEach(() => {
    repo = new InMemoryLikeRepository();
  });

  it('starts with no likes', async () => {
    expect(await repo.isLikedBy('b1', 'u1')).toBe(false);
  });

  it('toggles a like on and off', async () => {
    const first = await repo.toggle('b1', 'u1');
    expect(first).toEqual({ liked: true, likeCount: 1 });
    const second = await repo.toggle('b1', 'u1');
    expect(second).toEqual({ liked: false, likeCount: 0 });
  });

  it('tracks likes per book independently', async () => {
    await repo.toggle('b1', 'u1');
    await repo.toggle('b2', 'u1');
    await repo.toggle('b1', 'u2');
    expect(await repo.toggle('b1', 'u3')).toEqual({
      liked: true,
      likeCount: 3,
    });
    expect(await repo.toggle('b2', 'u3')).toEqual({
      liked: true,
      likeCount: 2,
    });
  });
});
