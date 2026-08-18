import { addToWatchlist, removeFromWatchlist, isOnWatchlist, getWatchlistIds, toggleWatchlist } from '@/db/watchlist';

// Mock client database singleton
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

describe('addToWatchlist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('inserts a movie id with the correct SQL and params', () => {
    addToWatchlist(123, 'movie');

    expect(mockRunSync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE INTO WatchlistItem'),
      [123, 'movie'],
    );
  });

  it('inserts a series id with the correct SQL and params', () => {
    addToWatchlist(456, 'series');

    expect(mockRunSync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE INTO WatchlistItem'),
      [456, 'series'],
    );
  });
});

describe('removeFromWatchlist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes the item scoped by media_type', () => {
    removeFromWatchlist(123, 'movie');

    expect(mockRunSync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM WatchlistItem WHERE movie_id = ? AND media_type = ?'),
      [123, 'movie'],
    );
  });
});

describe('isOnWatchlist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when a row is found', () => {
    mockGetFirstSync.mockReturnValue({ movie_id: 123 });

    expect(isOnWatchlist(123, 'movie')).toBe(true);
    expect(mockGetFirstSync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE movie_id = ? AND media_type = ?'),
      [123, 'movie'],
    );
  });

  it('returns false when no row is found', () => {
    mockGetFirstSync.mockReturnValue(undefined);

    expect(isOnWatchlist(123, 'movie')).toBe(false);
  });

  it('scopes by media_type so a movie and series sharing an id do not collide', () => {
    mockGetFirstSync.mockReturnValue(undefined);

    isOnWatchlist(123, 'series');
    expect(mockGetFirstSync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE movie_id = ? AND media_type = ?'),
      [123, 'series'],
    );
  });
});

describe('getWatchlistIds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns ids ordered by added_at desc, scoped by media_type', () => {
    mockGetAllSync.mockReturnValue([{ movie_id: 3 }, { movie_id: 1 }]);

    const result = getWatchlistIds('movie');

    expect(result).toEqual([3, 1]);
    expect(mockGetAllSync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE media_type = ? ORDER BY added_at DESC'),
      ['movie'],
    );
  });

  it('scopes to series when asked', () => {
    mockGetAllSync.mockReturnValue([]);

    getWatchlistIds('series');

    expect(mockGetAllSync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE media_type = ?'),
      ['series'],
    );
  });
});

describe('toggleWatchlist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('removes and returns false when currently on the watchlist', () => {
    mockGetFirstSync.mockReturnValue({ movie_id: 123 });

    const result = toggleWatchlist(123, 'movie');

    expect(result).toBe(false);
    expect(mockRunSync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM WatchlistItem WHERE movie_id = ? AND media_type = ?'),
      [123, 'movie'],
    );
  });

  it('adds and returns true when not currently on the watchlist', () => {
    mockGetFirstSync.mockReturnValue(undefined);

    const result = toggleWatchlist(123, 'movie');

    expect(result).toBe(true);
    expect(mockRunSync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE INTO WatchlistItem'),
      [123, 'movie'],
    );
  });
});
