import {
  likeMedia,
  unlikeMedia,
  isLiked,
  getLikedIds,
  toggleLike,
} from '@/db/likes';

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

describe('likes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('likes a movie', () => {
    likeMedia(1726, 'movie');
    expect(mockRunSync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE INTO Liked'),
      [1726, 'movie'],
    );
  });

  it('likes a series', () => {
    likeMedia(1399, 'series');
    expect(mockRunSync).toHaveBeenCalledWith(
      expect.any(String),
      [1399, 'series'],
    );
  });

  it('unlikes an item scoped by media_type', () => {
    unlikeMedia(1726, 'movie');
    expect(mockRunSync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM Liked WHERE movie_id = ? AND media_type = ?'),
      [1726, 'movie'],
    );
  });

  it('scopes isLiked by media_type', () => {
    mockGetFirstSync.mockReturnValue(undefined);
    isLiked(1726, 'movie');
    expect(mockGetFirstSync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE movie_id = ? AND media_type = ?'),
      [1726, 'movie'],
    );
  });

  it('scopes getLikedIds by media_type', () => {
    mockGetAllSync.mockReturnValue([]);
    getLikedIds('series');
    expect(mockGetAllSync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE media_type = ?'),
      ['series'],
    );
  });

  describe('toggleLike', () => {
    it('likes the item and returns true when not currently liked', () => {
      mockGetFirstSync.mockReturnValue(undefined);
      const result = toggleLike(1726, 'movie');
      expect(result).toBe(true);
      expect(mockRunSync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR IGNORE INTO Liked'),
        [1726, 'movie'],
      );
    });

    it('unlikes the item and returns false when currently liked', () => {
      mockGetFirstSync.mockReturnValue({ movie_id: 1726 });
      const result = toggleLike(1726, 'movie');
      expect(result).toBe(false);
      expect(mockRunSync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM Liked'),
        [1726, 'movie'],
      );
    });
  });
});
