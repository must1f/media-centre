import {
  addToWatchlist,
  removeFromWatchlist,
  isOnWatchlist,
  getWatchlistIds,
  toggleWatchlist,
} from '@/db/watchlist';

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

describe('watchlist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds a movie to the watchlist', () => {
    addToWatchlist(1726, 'movie');
    expect(mockRunSync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE INTO WatchlistItem'),
      [1726, 'movie'],
    );
  });

  it('adds a series to the watchlist', () => {
    addToWatchlist(1399, 'series');
    expect(mockRunSync).toHaveBeenCalledWith(
      expect.any(String),
      [1399, 'series'],
    );
  });

  it('removes an item from the watchlist scoped by media_type', () => {
    removeFromWatchlist(1726, 'movie');
    expect(mockRunSync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM WatchlistItem WHERE movie_id = ? AND media_type = ?'),
      [1726, 'movie'],
    );
  });

  it('scopes isOnWatchlist by media_type', () => {
    mockGetFirstSync.mockReturnValue(undefined);
    isOnWatchlist(1726, 'movie');
    expect(mockGetFirstSync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE movie_id = ? AND media_type = ?'),
      [1726, 'movie'],
    );
  });

  it('scopes getWatchlistIds by media_type', () => {
    mockGetAllSync.mockReturnValue([]);
    getWatchlistIds('series');
    expect(mockGetAllSync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE media_type = ?'),
      ['series'],
    );
  });

  describe('toggleWatchlist', () => {
    it('adds the item and returns true when not currently on the watchlist', () => {
      mockGetFirstSync.mockReturnValue(undefined);
      const result = toggleWatchlist(1726, 'movie');
      expect(result).toBe(true);
      expect(mockRunSync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR IGNORE INTO WatchlistItem'),
        [1726, 'movie'],
      );
    });

    it('removes the item and returns false when currently on the watchlist', () => {
      mockGetFirstSync.mockReturnValue({ movie_id: 1726 });
      const result = toggleWatchlist(1726, 'movie');
      expect(result).toBe(false);
      expect(mockRunSync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM WatchlistItem'),
        [1726, 'movie'],
      );
    });
  });
});
