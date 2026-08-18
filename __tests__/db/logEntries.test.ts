import { setRating, type Movie } from '@/db/movies';
import {
  logWatch,
  getLogEntriesForMedia,
  getWatchCountForType,
  hasWatched,
} from '@/db/logEntries';

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

describe('setRating overwrite guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should write rating if there is no existing review', () => {
    // Mock getMovie to return null (no existing movie metadata in DB yet)
    mockGetFirstSync.mockReturnValue(null);

    const result = setRating(123, 4.5, 'Great movie!', false);
    
    expect(result).toBe(true);
    expect(mockRunSync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE Movie'),
      [4.5, 'Great movie!', 123]
    );
  });

  it('should block writing rating if there is an existing review and forceOverwrite is false', () => {
    const existingMovie: Movie = {
      tmdb_id: 123,
      title: 'Test Movie',
      poster_path: null,
      dominant_color: null,
      release_year: 2026,
      genres: null,
      overview: 'Overview',
      collection_id: null,
      collection_name: null,
      my_rating: 4.0,
      my_review: 'Original review text',
      rating_updated_at: '2026-08-17',
    };
    mockGetFirstSync.mockReturnValue(existingMovie);

    // Try to update with a DIFFERENT review, but forceOverwrite = false
    const result = setRating(123, 4.5, 'New review text!', false);

    expect(result).toBe(false);
    expect(mockRunSync).not.toHaveBeenCalled();
  });

  it('should write rating if there is an existing review but forceOverwrite is true', () => {
    const existingMovie: Movie = {
      tmdb_id: 123,
      title: 'Test Movie',
      poster_path: null,
      dominant_color: null,
      release_year: 2026,
      genres: null,
      overview: 'Overview',
      collection_id: null,
      collection_name: null,
      my_rating: 4.0,
      my_review: 'Original review text',
      rating_updated_at: '2026-08-17',
    };
    mockGetFirstSync.mockReturnValue(existingMovie);

    // Try to update with a DIFFERENT review, and forceOverwrite = true
    const result = setRating(123, 4.5, 'New review text!', true);

    expect(result).toBe(true);
    expect(mockRunSync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE Movie'),
      [4.5, 'New review text!', 123]
    );
  });

  it('should write rating if the review has not changed', () => {
    const existingMovie: Movie = {
      tmdb_id: 123,
      title: 'Test Movie',
      poster_path: null,
      dominant_color: null,
      release_year: 2026,
      genres: null,
      overview: 'Overview',
      collection_id: null,
      collection_name: null,
      my_rating: 4.0,
      my_review: 'Original review text',
      rating_updated_at: '2026-08-17',
    };
    mockGetFirstSync.mockReturnValue(existingMovie);

    // Update with the same review, forceOverwrite = false
    const result = setRating(123, 4.5, 'Original review text', false);

    expect(result).toBe(true);
    expect(mockRunSync).toHaveBeenCalled();
  });
});

describe('logWatch', () => {
  beforeEach(() => jest.clearAllMocks());

  it('records the media_type alongside the watch', () => {
    mockRunSync.mockReturnValue({ lastInsertRowId: 1 });
    logWatch(1399, 'series', '2026-08-18', null);
    expect(mockRunSync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO LogEntry'),
      [1399, 'series', '2026-08-18', null],
    );
  });
});

describe('getLogEntriesForMedia', () => {
  beforeEach(() => jest.clearAllMocks());

  it('scopes by media_type', () => {
    mockGetAllSync.mockReturnValue([]);
    getLogEntriesForMedia(1399, 'series');
    expect(mockGetAllSync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE movie_id = ? AND media_type = ?'),
      [1399, 'series'],
    );
  });
});

describe('getWatchCountForType', () => {
  beforeEach(() => jest.clearAllMocks());

  it('counts entries of one media type', () => {
    mockGetFirstSync.mockReturnValue({ count: 5 });
    expect(getWatchCountForType('series')).toBe(5);
    expect(mockGetFirstSync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE media_type = ?'),
      ['series'],
    );
  });
});

describe('hasWatched', () => {
  beforeEach(() => jest.clearAllMocks());

  it('scopes by media_type', () => {
    mockGetFirstSync.mockReturnValue({ count: 0 });
    hasWatched(1399, 'series');
    expect(mockGetFirstSync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE movie_id = ? AND media_type = ?'),
      [1399, 'series'],
    );
  });

  it('returns true when at least one log entry exists', () => {
    mockGetFirstSync.mockReturnValue({ count: 2 });
    expect(hasWatched(123, 'movie')).toBe(true);
  });

  it('returns false when no log entries exist', () => {
    mockGetFirstSync.mockReturnValue({ count: 0 });
    expect(hasWatched(123, 'movie')).toBe(false);
  });
});
