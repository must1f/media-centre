import { likeMedia, unlikeMedia, isLiked, getLikedIds, toggleLike } from '@/db/likes';

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

describe('likeMedia', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('inserts a movie id with the correct SQL and params', () => {
    likeMedia(123, 'movie');

    expect(mockRunSync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE INTO Liked'),
      [123, 'movie'],
    );
  });

  it('inserts a series id with the correct SQL and params', () => {
    likeMedia(456, 'series');

    expect(mockRunSync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE INTO Liked'),
      [456, 'series'],
    );
  });
});

describe('unlikeMedia', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes the item scoped by media_type', () => {
    unlikeMedia(123, 'movie');

    expect(mockRunSync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM Liked WHERE movie_id = ? AND media_type = ?'),
      [123, 'movie'],
    );
  });
});

describe('isLiked', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when a row is found', () => {
    mockGetFirstSync.mockReturnValue({ movie_id: 123 });

    expect(isLiked(123, 'movie')).toBe(true);
    expect(mockGetFirstSync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE movie_id = ? AND media_type = ?'),
      [123, 'movie'],
    );
  });

  it('returns false when no row is found', () => {
    mockGetFirstSync.mockReturnValue(undefined);

    expect(isLiked(123, 'movie')).toBe(false);
  });

  it('scopes by media_type so a movie and series sharing an id do not collide', () => {
    mockGetFirstSync.mockReturnValue(undefined);

    isLiked(123, 'series');
    expect(mockGetFirstSync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE movie_id = ? AND media_type = ?'),
      [123, 'series'],
    );
  });
});

describe('getLikedIds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns ids ordered by liked_at desc, scoped by media_type', () => {
    mockGetAllSync.mockReturnValue([{ movie_id: 3 }, { movie_id: 1 }]);

    const result = getLikedIds('movie');

    expect(result).toEqual([3, 1]);
    expect(mockGetAllSync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE media_type = ? ORDER BY liked_at DESC'),
      ['movie'],
    );
  });

  it('scopes to series when asked', () => {
    mockGetAllSync.mockReturnValue([]);

    getLikedIds('series');

    expect(mockGetAllSync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE media_type = ?'),
      ['series'],
    );
  });
});

describe('toggleLike', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('unlikes and returns false when currently liked', () => {
    mockGetFirstSync.mockReturnValue({ movie_id: 123 });

    const result = toggleLike(123, 'movie');

    expect(result).toBe(false);
    expect(mockRunSync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM Liked WHERE movie_id = ? AND media_type = ?'),
      [123, 'movie'],
    );
  });

  it('likes and returns true when not currently liked', () => {
    mockGetFirstSync.mockReturnValue(undefined);

    const result = toggleLike(123, 'movie');

    expect(result).toBe(true);
    expect(mockRunSync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE INTO Liked'),
      [123, 'movie'],
    );
  });
});
