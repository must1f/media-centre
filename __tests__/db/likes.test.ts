import { likeMovie, unlikeMovie, isLiked, getLikedMovieIds, toggleLike } from '@/db/likes';

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

describe('likeMovie', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('inserts the movie id with the correct SQL and params', () => {
    likeMovie(123);

    expect(mockRunSync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE INTO Liked'),
      [123],
    );
  });
});

describe('unlikeMovie', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes the movie id with the correct SQL and params', () => {
    unlikeMovie(123);

    expect(mockRunSync).toHaveBeenCalledWith(
      'DELETE FROM Liked WHERE movie_id = ?',
      [123],
    );
  });
});

describe('isLiked', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when a row is found', () => {
    mockGetFirstSync.mockReturnValue({ movie_id: 123 });

    expect(isLiked(123)).toBe(true);
    expect(mockGetFirstSync).toHaveBeenCalledWith(
      'SELECT movie_id FROM Liked WHERE movie_id = ?',
      [123],
    );
  });

  it('returns false when no row is found', () => {
    mockGetFirstSync.mockReturnValue(undefined);

    expect(isLiked(123)).toBe(false);
  });
});

describe('getLikedMovieIds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns movie ids ordered by liked_at desc', () => {
    mockGetAllSync.mockReturnValue([{ movie_id: 3 }, { movie_id: 1 }]);

    const result = getLikedMovieIds();

    expect(result).toEqual([3, 1]);
    expect(mockGetAllSync).toHaveBeenCalledWith(
      'SELECT movie_id FROM Liked ORDER BY liked_at DESC',
    );
  });
});

describe('toggleLike', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('unlikes and returns false when currently liked', () => {
    mockGetFirstSync.mockReturnValue({ movie_id: 123 });

    const result = toggleLike(123);

    expect(result).toBe(false);
    expect(mockRunSync).toHaveBeenCalledWith(
      'DELETE FROM Liked WHERE movie_id = ?',
      [123],
    );
  });

  it('likes and returns true when not currently liked', () => {
    mockGetFirstSync.mockReturnValue(undefined);

    const result = toggleLike(123);

    expect(result).toBe(true);
    expect(mockRunSync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE INTO Liked'),
      [123],
    );
  });
});
