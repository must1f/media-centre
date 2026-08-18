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

  it('inserts the movie id with the correct SQL and params', () => {
    addToWatchlist(123);

    expect(mockRunSync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE INTO WatchlistItem'),
      [123],
    );
  });
});

describe('removeFromWatchlist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes the movie id with the correct SQL and params', () => {
    removeFromWatchlist(123);

    expect(mockRunSync).toHaveBeenCalledWith(
      'DELETE FROM WatchlistItem WHERE movie_id = ?',
      [123],
    );
  });
});

describe('isOnWatchlist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when a row is found', () => {
    mockGetFirstSync.mockReturnValue({ movie_id: 123 });

    expect(isOnWatchlist(123)).toBe(true);
    expect(mockGetFirstSync).toHaveBeenCalledWith(
      'SELECT movie_id FROM WatchlistItem WHERE movie_id = ?',
      [123],
    );
  });

  it('returns false when no row is found', () => {
    mockGetFirstSync.mockReturnValue(undefined);

    expect(isOnWatchlist(123)).toBe(false);
  });
});

describe('getWatchlistIds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns movie ids ordered by added_at desc', () => {
    mockGetAllSync.mockReturnValue([{ movie_id: 3 }, { movie_id: 1 }]);

    const result = getWatchlistIds();

    expect(result).toEqual([3, 1]);
    expect(mockGetAllSync).toHaveBeenCalledWith(
      'SELECT movie_id FROM WatchlistItem ORDER BY added_at DESC',
    );
  });
});

describe('toggleWatchlist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('removes and returns false when currently on the watchlist', () => {
    mockGetFirstSync.mockReturnValue({ movie_id: 123 });

    const result = toggleWatchlist(123);

    expect(result).toBe(false);
    expect(mockRunSync).toHaveBeenCalledWith(
      'DELETE FROM WatchlistItem WHERE movie_id = ?',
      [123],
    );
  });

  it('adds and returns true when not currently on the watchlist', () => {
    mockGetFirstSync.mockReturnValue(undefined);

    const result = toggleWatchlist(123);

    expect(result).toBe(true);
    expect(mockRunSync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE INTO WatchlistItem'),
      [123],
    );
  });
});
