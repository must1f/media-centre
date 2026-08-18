// __tests__/db/series.test.ts
import { upsertSeries, getSeries, setSeriesRating, getRatedSeries, getAllCachedSeries } from '@/db/series';

const mockRunSync = jest.fn();
const mockGetFirstSync = jest.fn();
const mockGetAllSync = jest.fn();

jest.mock('@/db/client', () => ({
  __esModule: true,
  default: {
    runSync: (...args: any[]) => mockRunSync(...args),
    getFirstSync: (...args: any[]) => mockGetFirstSync(...args),
    getAllSync: (...args: any[]) => mockGetAllSync(...args),
  },
}));

describe('upsertSeries', () => {
  beforeEach(() => jest.clearAllMocks());

  it('inserts with correct SQL and params', () => {
    upsertSeries({
      tmdb_id: 1399,
      name: 'The Syndicate',
      poster_path: '/poster.jpg',
      dominant_color: null,
      first_air_year: 2022,
      genres: '["Drama"]',
      overview: 'A crime family.',
      status: 'Returning Series',
    });

    expect(mockRunSync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO Series'),
      [1399, 'The Syndicate', '/poster.jpg', null, 2022, '["Drama"]', 'A crime family.', 'Returning Series'],
    );
    expect(mockRunSync.mock.calls[0][0]).toContain('ON CONFLICT(tmdb_id) DO UPDATE SET');
  });
});

describe('getSeries', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns null when not cached', () => {
    mockGetFirstSync.mockReturnValue(undefined);
    expect(getSeries(999)).toBeNull();
  });

  it('returns the cached row', () => {
    const row = { tmdb_id: 1399, name: 'The Syndicate' };
    mockGetFirstSync.mockReturnValue(row);
    expect(getSeries(1399)).toBe(row);
  });
});

describe('setSeriesRating', () => {
  beforeEach(() => jest.clearAllMocks());

  it('blocks overwriting an existing review without forceOverwrite', () => {
    mockGetFirstSync.mockReturnValue({ tmdb_id: 1399, my_review: 'Old review' });
    const result = setSeriesRating(1399, 4.5, 'New review', false);
    expect(result).toBe(false);
    expect(mockRunSync).not.toHaveBeenCalled();
  });

  it('writes when forceOverwrite is true', () => {
    mockGetFirstSync.mockReturnValue({ tmdb_id: 1399, my_review: 'Old review' });
    const result = setSeriesRating(1399, 4.5, 'New review', true);
    expect(result).toBe(true);
    expect(mockRunSync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE Series'),
      [4.5, 'New review', 1399],
    );
  });
});

describe('getRatedSeries / getAllCachedSeries', () => {
  beforeEach(() => jest.clearAllMocks());

  it('queries rated series ordered by rating', () => {
    mockGetAllSync.mockReturnValue([]);
    getRatedSeries();
    expect(mockGetAllSync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE my_rating IS NOT NULL ORDER BY my_rating DESC'),
    );
  });

  it('queries all cached series', () => {
    mockGetAllSync.mockReturnValue([]);
    getAllCachedSeries();
    expect(mockGetAllSync).toHaveBeenCalledWith('SELECT * FROM Series');
  });
});
