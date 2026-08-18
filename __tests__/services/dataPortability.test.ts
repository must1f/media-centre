import {
  parseCsv,
  parseDiaryCsv,
  parseRatingsCsv,
  resolveTitleToTmdbId,
  importLetterboxdData,
  buildBackup,
  restoreBackup,
  parseBackupDocument,
  BACKUP_VERSION,
} from '@/services/dataPortability';

// ─── db/movies mocks ──────────────────────────────────────────────────
const mockUpsertMovie = jest.fn();
const mockSetRating = jest.fn();
const mockGetAllCachedMovies = jest.fn();

jest.mock('@/db/movies', () => ({
  upsertMovie: (...args: any[]) => mockUpsertMovie(...args),
  setRating: (...args: any[]) => mockSetRating(...args),
  getAllCachedMovies: () => mockGetAllCachedMovies(),
}));

// ─── db/logEntries mocks ──────────────────────────────────────────────
const mockLogWatch = jest.fn();
const mockGetAllLogEntries = jest.fn();
const mockGetLogEntriesForMovie = jest.fn();

jest.mock('@/db/logEntries', () => ({
  logWatch: (...args: any[]) => mockLogWatch(...args),
  getAllLogEntries: () => mockGetAllLogEntries(),
  getLogEntriesForMovie: (id: number) => mockGetLogEntriesForMovie(id),
}));

// ─── db/watchlist mocks ────────────────────────────────────────────────
const mockAddToWatchlist = jest.fn();
const mockGetWatchlistIds = jest.fn();

jest.mock('@/db/watchlist', () => ({
  addToWatchlist: (...args: any[]) => mockAddToWatchlist(...args),
  getWatchlistIds: () => mockGetWatchlistIds(),
}));

// ─── db/likes mocks ─────────────────────────────────────────────────────
const mockLikeMovie = jest.fn();
const mockGetLikedMovieIds = jest.fn();

jest.mock('@/db/likes', () => ({
  likeMovie: (...args: any[]) => mockLikeMovie(...args),
  getLikedMovieIds: () => mockGetLikedMovieIds(),
}));

// ─── services/tmdb mock ─────────────────────────────────────────────────
const mockSearchMovies = jest.fn();

jest.mock('@/services/tmdb', () => ({
  searchMovies: (q: string) => mockSearchMovies(q),
  releaseYear: (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    const y = parseInt(dateStr.slice(0, 4), 10);
    return Number.isNaN(y) ? null : y;
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockGetLogEntriesForMovie.mockReturnValue([]);
});

describe('parseCsv', () => {
  it('parses simple comma-separated rows', () => {
    const csv = 'a,b,c\n1,2,3';
    expect(parseCsv(csv)).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('handles quoted fields with embedded commas', () => {
    const csv = 'Name,Year\n"Se7en, The Movie",1995';
    expect(parseCsv(csv)).toEqual([
      ['Name', 'Year'],
      ['Se7en, The Movie', '1995'],
    ]);
  });

  it('handles escaped double quotes inside quoted fields', () => {
    const csv = 'Name\n"She said ""hello"" to me"';
    expect(parseCsv(csv)).toEqual([['Name'], ['She said "hello" to me']]);
  });

  it('handles CRLF line endings', () => {
    const csv = 'a,b\r\n1,2\r\n3,4';
    expect(parseCsv(csv)).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ]);
  });

  it('strips a leading BOM', () => {
    const csv = '﻿a,b\n1,2';
    expect(parseCsv(csv)).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('handles a missing trailing newline', () => {
    const csv = 'a,b\n1,2';
    expect(parseCsv(csv)).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

describe('parseDiaryCsv', () => {
  const header =
    'Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date';

  it('parses a well-formed diary row', () => {
    const csv = `${header}\n2026-01-05,Heat,1995,https://letterboxd.com/film/heat/,4.5,No,favorites,2026-01-01`;
    const rows = parseDiaryCsv(csv);
    expect(rows).toEqual([
      {
        date: '2026-01-05',
        name: 'Heat',
        year: 1995,
        letterboxdUri: 'https://letterboxd.com/film/heat/',
        rating: 4.5,
        rewatch: false,
        tags: 'favorites',
        watchedDate: '2026-01-01',
      },
    ]);
  });

  it('falls back to Date when Watched Date is empty, and treats empty Rating as null', () => {
    const csv = `${header}\n2026-02-01,Alien,1979,https://letterboxd.com/film/alien/,,Yes,,`;
    const rows = parseDiaryCsv(csv);
    expect(rows[0].watchedDate).toBe('2026-02-01');
    expect(rows[0].rating).toBeNull();
    expect(rows[0].rewatch).toBe(true);
  });

  it('drops rows with no title', () => {
    const csv = `${header}\n2026-02-01,,1979,,,,,`;
    expect(parseDiaryCsv(csv)).toEqual([]);
  });
});

describe('parseRatingsCsv', () => {
  const header = 'Date,Name,Year,Letterboxd URI,Rating';

  it('parses a well-formed ratings row', () => {
    const csv = `${header}\n2026-01-05,Heat,1995,https://letterboxd.com/film/heat/,4.5`;
    expect(parseRatingsCsv(csv)).toEqual([
      {
        date: '2026-01-05',
        name: 'Heat',
        year: 1995,
        letterboxdUri: 'https://letterboxd.com/film/heat/',
        rating: 4.5,
      },
    ]);
  });
});

describe('resolveTitleToTmdbId', () => {
  it('picks the exact year match over other results', async () => {
    mockSearchMovies.mockResolvedValue([
      { id: 1, release_date: '2001-01-01' },
      { id: 2, release_date: '1995-01-01' },
    ]);
    const id = await resolveTitleToTmdbId('Heat', 1995, new Map());
    expect(id).toBe(2);
  });

  it('falls back to a +/-1 year match', async () => {
    mockSearchMovies.mockResolvedValue([{ id: 3, release_date: '1994-01-01' }]);
    const id = await resolveTitleToTmdbId('Heat', 1995, new Map());
    expect(id).toBe(3);
  });

  it('falls back to the first result when no year match exists', async () => {
    mockSearchMovies.mockResolvedValue([{ id: 5, release_date: '1980-01-01' }]);
    const id = await resolveTitleToTmdbId('Heat', 1995, new Map());
    expect(id).toBe(5);
  });

  it('returns null when there are no results', async () => {
    mockSearchMovies.mockResolvedValue([]);
    const id = await resolveTitleToTmdbId('Some Obscure Title', 1995, new Map());
    expect(id).toBeNull();
  });

  it('returns null and does not throw on a search error', async () => {
    mockSearchMovies.mockRejectedValue(new Error('network down'));
    const id = await resolveTitleToTmdbId('Heat', 1995, new Map());
    expect(id).toBeNull();
  });

  it('memoizes results in the provided cache (single search per title+year)', async () => {
    mockSearchMovies.mockResolvedValue([{ id: 9, release_date: '1995-01-01' }]);
    const cache = new Map<string, number | null>();
    await resolveTitleToTmdbId('Heat', 1995, cache);
    await resolveTitleToTmdbId('Heat', 1995, cache);
    expect(mockSearchMovies).toHaveBeenCalledTimes(1);
  });
});

describe('importLetterboxdData', () => {
  it('imports diary watches and ratings, upserting each unique title once', async () => {
    mockSearchMovies.mockImplementation(async (q: string) => {
      if (q === 'Heat') return [{ id: 100, release_date: '1995-01-01' }];
      return [];
    });

    const diaryCsv =
      'Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date\n' +
      '2026-01-05,Heat,1995,https://x/heat/,,No,,2026-01-01';
    const ratingsCsv = 'Date,Name,Year,Letterboxd URI,Rating\n2026-01-05,Heat,1995,https://x/heat/,4.5';

    const summary = await importLetterboxdData(diaryCsv, ratingsCsv);

    expect(summary.totalUniqueTitles).toBe(1);
    expect(summary.matched).toBe(1);
    expect(summary.unmatched).toEqual([]);
    expect(summary.logEntriesImported).toBe(1);
    expect(summary.ratingsImported).toBe(1);

    expect(mockUpsertMovie).toHaveBeenCalledWith(
      expect.objectContaining({ tmdb_id: 100, title: 'Heat', release_year: 1995 }),
    );
    expect(mockLogWatch).toHaveBeenCalledWith(100, '2026-01-01');
    expect(mockSetRating).toHaveBeenCalledWith(100, 4.5, null, true);
  });

  it('collects unmatched titles instead of silently dropping them', async () => {
    mockSearchMovies.mockResolvedValue([]);
    const diaryCsv =
      'Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date\n' +
      '2026-01-05,Some Unknown Film,1995,https://x/unknown/,,No,,2026-01-01';

    const summary = await importLetterboxdData(diaryCsv, null);

    expect(summary.matched).toBe(0);
    expect(summary.unmatched).toEqual([{ title: 'Some Unknown Film', year: 1995 }]);
    expect(mockLogWatch).not.toHaveBeenCalled();
  });

  it('does not re-log a watched_date that is already in the diary', async () => {
    mockSearchMovies.mockResolvedValue([{ id: 200, release_date: '2000-01-01' }]);
    mockGetLogEntriesForMovie.mockReturnValue([{ id: 1, movie_id: 200, watched_date: '2026-01-01', created_at: '' }]);

    const diaryCsv =
      'Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date\n' +
      '2026-01-05,Dup,2000,https://x/dup/,,No,,2026-01-01';

    const summary = await importLetterboxdData(diaryCsv, null);
    expect(summary.logEntriesImported).toBe(0);
    expect(mockLogWatch).not.toHaveBeenCalled();
  });

  it('collapses the same title with a blank/differing Year across files into one entry', async () => {
    // diary.csv has "Heat"/1995, ratings.csv has "Heat" with a blank Year —
    // both must resolve to the same title, not double-count or show as unmatched.
    mockSearchMovies.mockResolvedValue([{ id: 100, release_date: '1995-01-01' }]);

    const diaryCsv =
      'Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date\n' +
      '2026-01-05,Heat,1995,https://x/heat/,,No,,2026-01-01';
    const ratingsCsv = 'Date,Name,Year,Letterboxd URI,Rating\n2026-01-05,Heat,,https://x/heat/,4.5';

    const summary = await importLetterboxdData(diaryCsv, ratingsCsv);

    expect(summary.totalUniqueTitles).toBe(1);
    expect(summary.matched).toBe(1);
    expect(summary.unmatched).toEqual([]);
    expect(mockSetRating).toHaveBeenCalledWith(100, 4.5, null, true);
    expect(mockLogWatch).toHaveBeenCalledWith(100, '2026-01-01');
  });

  it('falls back to the diary row Rating when ratings.csv has no entry for that title', async () => {
    mockSearchMovies.mockResolvedValue([{ id: 300, release_date: '2010-01-01' }]);
    const diaryCsv =
      'Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date\n' +
      '2026-01-05,OnlyInDiary,2010,https://x/only/,3.5,No,,2026-01-01';

    const summary = await importLetterboxdData(diaryCsv, null);
    expect(summary.ratingsImported).toBe(1);
    expect(mockSetRating).toHaveBeenCalledWith(300, 3.5, null, true);
  });
});

describe('buildBackup', () => {
  it('serializes all four tables into one document', () => {
    mockGetAllCachedMovies.mockReturnValue([{ tmdb_id: 1, title: 'A' }]);
    mockGetAllLogEntries.mockReturnValue([{ id: 1, movie_id: 1, watched_date: '2026-01-01', created_at: '' }]);
    mockGetWatchlistIds.mockReturnValue([2, 3]);
    mockGetLikedMovieIds.mockReturnValue([4]);

    const backup = buildBackup();
    expect(backup.version).toBe(BACKUP_VERSION);
    expect(backup.movies).toHaveLength(1);
    expect(backup.logEntries).toHaveLength(1);
    expect(backup.watchlistMovieIds).toEqual([2, 3]);
    expect(backup.likedMovieIds).toEqual([4]);
    expect(typeof backup.exportedAt).toBe('string');
  });
});

describe('restoreBackup', () => {
  it('restores movies (with rating+review), log entries, watchlist, and likes', () => {
    const doc = {
      version: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      movies: [
        {
          tmdb_id: 1,
          title: 'Heat',
          poster_path: '/p.jpg',
          dominant_color: null,
          release_year: 1995,
          genres: null,
          overview: null,
          my_rating: 4.5,
          my_review: 'Great film',
          rating_updated_at: '2026-01-01',
        },
      ],
      logEntries: [{ id: 1, movie_id: 1, watched_date: '2026-01-01', created_at: '2026-01-01' }],
      watchlistMovieIds: [2],
      likedMovieIds: [3],
    };

    const summary = restoreBackup(doc);

    expect(mockUpsertMovie).toHaveBeenCalledWith(
      expect.objectContaining({ tmdb_id: 1, title: 'Heat' }),
    );
    // The real review must round-trip, not be discarded as null.
    expect(mockSetRating).toHaveBeenCalledWith(1, 4.5, 'Great film', true);
    expect(mockLogWatch).toHaveBeenCalledWith(1, '2026-01-01');
    expect(mockAddToWatchlist).toHaveBeenCalledWith(2);
    expect(mockLikeMovie).toHaveBeenCalledWith(3);

    expect(summary.moviesRestored).toBe(1);
    expect(summary.logEntriesRestored).toBe(1);
    expect(summary.watchlistRestored).toBe(1);
    expect(summary.likesRestored).toBe(1);
  });

  it('skips a log entry that already exists for that movie+date', () => {
    mockGetLogEntriesForMovie.mockReturnValue([{ id: 1, movie_id: 1, watched_date: '2026-01-01', created_at: '' }]);
    const doc = {
      movies: [],
      logEntries: [{ movie_id: 1, watched_date: '2026-01-01' }],
      watchlistMovieIds: [],
      likedMovieIds: [],
    };

    const summary = restoreBackup(doc);
    expect(mockLogWatch).not.toHaveBeenCalled();
    expect(summary.logEntriesSkippedDuplicate).toBe(1);
  });

  it('does not stamp rating_updated_at for a movie with no rating and no review', () => {
    const doc = {
      movies: [
        {
          tmdb_id: 1,
          title: 'Unrated',
          poster_path: null,
          dominant_color: null,
          release_year: null,
          genres: null,
          overview: null,
          my_rating: null,
          my_review: null,
        },
      ],
      logEntries: [],
      watchlistMovieIds: [],
      likedMovieIds: [],
    };

    restoreBackup(doc);
    expect(mockSetRating).not.toHaveBeenCalled();
  });

  it('tolerates unknown/extra keys on movie rows without throwing', () => {
    const doc = {
      movies: [
        {
          tmdb_id: 1,
          title: 'Future Schema',
          poster_path: null,
          dominant_color: null,
          release_year: null,
          genres: null,
          overview: null,
          my_rating: null,
          my_review: null,
          collection_id: 99,
          collection_name: 'Future Franchise',
          some_future_field: 'unknown to this app version',
        },
      ],
      logEntries: [],
      watchlistMovieIds: [],
      likedMovieIds: [],
    };

    expect(() => restoreBackup(doc)).not.toThrow();
    expect(mockUpsertMovie).toHaveBeenCalledWith(
      expect.not.objectContaining({ some_future_field: expect.anything() }),
    );
    expect(mockUpsertMovie).toHaveBeenCalledWith(
      expect.objectContaining({ collection_id: 99, collection_name: 'Future Franchise' }),
    );
  });

  it('returns an error and skips restore for a non-object document', () => {
    const summary = restoreBackup('not an object');
    expect(summary.errors.length).toBeGreaterThan(0);
    expect(mockUpsertMovie).not.toHaveBeenCalled();
  });
});

describe('parseBackupDocument', () => {
  it('parses valid JSON text', () => {
    const parsed = parseBackupDocument('{"version":1,"movies":[]}');
    expect(parsed).toEqual({ version: 1, movies: [] });
  });

  it('throws on invalid JSON', () => {
    expect(() => parseBackupDocument('not json')).toThrow();
  });
});
