import { upsertAnime, getAnime, setAnimeRating, getRatedAnime, getAllCachedAnime } from '@/db/anime';

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

describe('upsertAnime', () => {
  beforeEach(() => jest.clearAllMocks());

  it('inserts with correct SQL and params', () => {
    upsertAnime({
      anilist_id: 21,
      title: 'One Piece',
      poster_path: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/b21.jpg',
      dominant_color: null,
      start_year: 1999,
      genres: '["Action","Adventure"]',
      overview: 'Pirates.',
      status: 'RELEASING',
      episode_count: null,
    });

    expect(mockRunSync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO Anime'),
      [
        21,
        'One Piece',
        'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/b21.jpg',
        null,
        1999,
        '["Action","Adventure"]',
        'Pirates.',
        'RELEASING',
        null,
      ],
    );
    expect(mockRunSync.mock.calls[0][0]).toContain('ON CONFLICT(anilist_id) DO UPDATE SET');
  });
});

describe('getAnime', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns null when not cached', () => {
    mockGetFirstSync.mockReturnValue(undefined);
    expect(getAnime(999)).toBeNull();
  });

  it('returns the cached row', () => {
    const row = { anilist_id: 21, title: 'One Piece' };
    mockGetFirstSync.mockReturnValue(row);
    expect(getAnime(21)).toBe(row);
  });
});

describe('setAnimeRating', () => {
  beforeEach(() => jest.clearAllMocks());

  it('blocks overwriting an existing review without forceOverwrite', () => {
    mockGetFirstSync.mockReturnValue({ anilist_id: 21, my_review: 'Old review' });
    const result = setAnimeRating(21, 4.5, 'New review', false);
    expect(result).toBe(false);
    expect(mockRunSync).not.toHaveBeenCalled();
  });

  it('writes when forceOverwrite is true', () => {
    mockGetFirstSync.mockReturnValue({ anilist_id: 21, my_review: 'Old review' });
    const result = setAnimeRating(21, 4.5, 'New review', true);
    expect(result).toBe(true);
    expect(mockRunSync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE Anime'),
      [4.5, 'New review', 21],
    );
  });
});

describe('getRatedAnime / getAllCachedAnime', () => {
  beforeEach(() => jest.clearAllMocks());

  it('queries rated anime ordered by rating', () => {
    mockGetAllSync.mockReturnValue([]);
    getRatedAnime();
    expect(mockGetAllSync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE my_rating IS NOT NULL ORDER BY my_rating DESC'),
    );
  });

  it('queries all cached anime', () => {
    mockGetAllSync.mockReturnValue([]);
    getAllCachedAnime();
    expect(mockGetAllSync).toHaveBeenCalledWith('SELECT * FROM Anime');
  });
});
