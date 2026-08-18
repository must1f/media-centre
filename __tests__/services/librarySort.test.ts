import { sortMovies, primaryGenreName } from '@/services/librarySort';
import type { Movie } from '@/db/movies';
import type { LogEntry } from '@/db/logEntries';

function makeMovie(overrides: Partial<Movie>): Movie {
  return {
    tmdb_id: 1,
    title: 'Untitled',
    poster_path: null,
    dominant_color: null,
    release_year: null,
    genres: null,
    overview: null,
    collection_id: null,
    collection_name: null,
    my_rating: null,
    my_review: null,
    rating_updated_at: null,
    ...overrides,
  };
}

function makeLogEntry(overrides: Partial<LogEntry>): LogEntry {
  return {
    id: 1,
    movie_id: 1,
    watched_date: '2026-01-01',
    note: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('sortMovies', () => {
  const movies: Movie[] = [
    makeMovie({ tmdb_id: 1, title: 'Zodiac', my_rating: 4.0, genres: JSON.stringify(['Thriller']) }),
    makeMovie({ tmdb_id: 2, title: 'Amelie', my_rating: 5.0, genres: JSON.stringify(['Romance']) }),
    makeMovie({ tmdb_id: 3, title: 'Momento', my_rating: null, genres: null }),
    makeMovie({ tmdb_id: 4, title: 'brazil', my_rating: 3.5, genres: JSON.stringify(['Comedy', 'Sci-Fi']) }),
  ];

  it('sorts by rating, highest first, with unrated movies last', () => {
    const result = sortMovies(movies, 'rating', []);
    expect(result.map((m) => m.tmdb_id)).toEqual([2, 1, 4, 3]);
  });

  it('sorts by title alphabetically, case-insensitively', () => {
    const result = sortMovies(movies, 'title', []);
    expect(result.map((m) => m.title)).toEqual(['Amelie', 'brazil', 'Momento', 'Zodiac']);
  });

  it('sorts by genre using the primary/first genre name, with genre-less movies last', () => {
    const result = sortMovies(movies, 'genre', []);
    // Comedy (brazil), Romance (Amelie), Thriller (Zodiac), then no genre (Momento)
    expect(result.map((m) => m.tmdb_id)).toEqual([4, 2, 1, 3]);
  });

  it('sorts by date watched using the most recent log entry per movie, never-watched last', () => {
    const logEntries: LogEntry[] = [
      makeLogEntry({ id: 1, movie_id: 1, watched_date: '2026-01-10' }),
      makeLogEntry({ id: 2, movie_id: 2, watched_date: '2026-03-05' }),
      // movie 4 watched twice — should use the most recent date
      makeLogEntry({ id: 3, movie_id: 4, watched_date: '2026-01-01' }),
      makeLogEntry({ id: 4, movie_id: 4, watched_date: '2026-02-20' }),
      // movie 3 (Momento) never watched
    ];

    const result = sortMovies(movies, 'dateWatched', logEntries);
    expect(result.map((m) => m.tmdb_id)).toEqual([2, 4, 1, 3]);
  });

  it('does not mutate the input array', () => {
    const original = [...movies];
    sortMovies(movies, 'rating', []);
    expect(movies).toEqual(original);
  });

  it('handles an empty movie list', () => {
    expect(sortMovies([], 'title', [])).toEqual([]);
  });
});

describe('primaryGenreName', () => {
  it('returns the first genre name from a JSON array of strings', () => {
    expect(primaryGenreName(JSON.stringify(['Action', 'Drama']))).toBe('Action');
  });

  it('returns the first genre name from a JSON array of {id, name} objects', () => {
    expect(primaryGenreName(JSON.stringify([{ id: 28, name: 'Action' }]))).toBe('Action');
  });

  it('returns an empty string for null, empty, or invalid input', () => {
    expect(primaryGenreName(null)).toBe('');
    expect(primaryGenreName(undefined)).toBe('');
    expect(primaryGenreName('[]')).toBe('');
    expect(primaryGenreName('not json')).toBe('');
  });
});
