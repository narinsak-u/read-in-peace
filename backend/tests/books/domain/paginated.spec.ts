import { buildPaginated } from '../../../src/books/domain/paginated';

describe('buildPaginated', () => {
  it('returns the page meta with totalPages computed from total/limit', () => {
    const result = buildPaginated([1, 2, 3], 10, 1, 3);
    expect(result).toEqual({
      data: [1, 2, 3],
      meta: { page: 1, limit: 3, total: 10, totalPages: 4 },
    });
  });

  it('clamps totalPages to a minimum of 1 for empty lists', () => {
    const result = buildPaginated([], 0, 1, 10);
    expect(result.meta.totalPages).toBe(1);
  });

  it('handles exact multiples', () => {
    const result = buildPaginated([1, 2, 3, 4, 5, 6], 6, 1, 3);
    expect(result.meta.totalPages).toBe(2);
  });
});
