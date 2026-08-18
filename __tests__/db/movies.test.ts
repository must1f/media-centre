import { upsertMovie, getMovie, setDominantColor, getRatedMovies, getAllCachedMovies, type Movie } from '@/db/movies';

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

describe('upsertMovie', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('inserts with correct SQL and params', () => {
    upsertMovie({
      tmdb_id: 1726,
      title: 'Iron Man',
      poster_path: '/poster.jpg',
      dominant_color: null,
      release_year: 2008,
      genres: '["Action"]',
      overview: 'A hero rises.',
      collection_id: 131296,
      collection_name: 'Iron Man Collection',
    });

    expect(mockRunSync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO Movie'),
      [1726, 'Iron Man', '/poster.jpg', null, 2008, '["Action"]', 'A hero rises.', 131296, 'Iron Man Collection'],
    );
    expect(mockRunSync.mock.calls[0][0]).toContain('ON CONFLICT(tmdb_id) DO UPDATE SET');
  });

  it('defaults nullable fields to null when omitted', () => {
    upsertMovie({
      tmdb_id: 155,
      title: 'The Dark Knight',
      poster_path: null,
      dominant_color: null,
      release_year: null,
      genres: null,
      overview: null,
      collection_id: null,
      collection_name: null,
    });

    expect(mockRunSync).toHaveBeenCalledWith(
      expect.any(String),
      [155, 'The Dark Knight', null, null, null, null, null, null, null],
    );
  });
});

describe('getMovie', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the movie row when found', () => {
    const movie: Movie = {
      tmdb_id: 123,
      title: 'Test Movie',
      poster_path: null,
      dominant_color: null,
      release_year: 2026,
      genres: null,
      overview: null,
      collection_id: null,
      collection_name: null,
      my_rating: null,
      my_review: null,
      rating_updated_at: null,
    };
    mockGetFirstSync.mockReturnValue(movie);

    const result = getMovie(123);

    expect(result).toEqual(movie);
    expect(mockGetFirstSync).toHaveBeenCalledWith('SELECT * FROM Movie WHERE tmdb_id = ?', [123]);
  });

  it('returns null when not found', () => {
    mockGetFirstSync.mockReturnValue(undefined);

    const result = getMovie(999);

    expect(result).toBeNull();
  });
});

describe('setDominantColor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates the dominant_color column with the correct params', () => {
    setDominantColor(123, '#ff0000');

    expect(mockRunSync).toHaveBeenCalledWith(
      'UPDATE Movie SET dominant_color = ? WHERE tmdb_id = ?',
      ['#ff0000', 123],
    );
  });
});

describe('getRatedMovies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('queries rated movies ordered by rating desc, rating_updated_at desc', () => {
    const rows: Movie[] = [
      {
        tmdb_id: 1,
        title: 'A',
        poster_path: null,
        dominant_color: null,
        release_year: null,
        genres: null,
        overview: null,
        collection_id: null,
        collection_name: null,
        my_rating: 5,
        my_review: null,
        rating_updated_at: '2026-08-01',
      },
    ];
    mockGetAllSync.mockReturnValue(rows);

    const result = getRatedMovies();

    expect(result).toEqual(rows);
    expect(mockGetAllSync).toHaveBeenCalledWith(
      'SELECT * FROM Movie WHERE my_rating IS NOT NULL ORDER BY my_rating DESC, rating_updated_at DESC',
    );
  });
});

describe('getAllCachedMovies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('queries all cached movie rows', () => {
    const rows: Movie[] = [];
    mockGetAllSync.mockReturnValue(rows);

    const result = getAllCachedMovies();

    expect(result).toEqual(rows);
    expect(mockGetAllSync).toHaveBeenCalledWith('SELECT * FROM Movie');
  });
});
