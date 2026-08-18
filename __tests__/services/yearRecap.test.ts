import { computeYearStats, monthName } from '@/services/yearRecap';
import type { LogEntry } from '@/db/logEntries';
import type { Movie } from '@/db/movies';
import type { Series } from '@/db/series';

function makeMovie(overrides: Partial<Movie> & { tmdb_id: number }): Movie {
  return {
    title: `Movie ${overrides.tmdb_id}`,
    poster_path: null,
    dominant_color: null,
    release_year: 2020,
    genres: null,
    overview: null,
    my_rating: null,
    my_review: null,
    rating_updated_at: null,
    ...overrides,
  };
}

function makeSeries(overrides: Partial<Series> & { tmdb_id: number }): Series {
  return {
    name: `Series ${overrides.tmdb_id}`,
    poster_path: null,
    dominant_color: null,
    first_air_year: 2020,
    genres: null,
    overview: null,
    status: null,
    my_rating: null,
    my_review: null,
    rating_updated_at: null,
    ...overrides,
  };
}

function makeEntry(overrides: Partial<LogEntry> & { id: number; movie_id: number; watched_date: string }): LogEntry {
  return {
    created_at: '2026-01-01 00:00:00',
    media_type: 'movie',
    ...overrides,
  };
}

describe('computeYearStats', () => {
  it('returns zeroed stats for a year with no entries', () => {
    const stats = computeYearStats([], [], 2026);

    expect(stats.totalWatched).toBe(0);
    expect(stats.uniqueTitles).toBe(0);
    expect(stats.topRatedMovies).toEqual([]);
    expect(stats.topGenre).toBeNull();
    expect(stats.busiestMonth).toBeNull();
    expect(stats.averageRating).toBeNull();
  });

  it('counts total watches vs unique titles, deduplicating rewatches', () => {
    const movies = [makeMovie({ tmdb_id: 1 }), makeMovie({ tmdb_id: 2 })];
    const entries = [
      makeEntry({ id: 1, movie_id: 1, watched_date: '2026-01-05' }),
      makeEntry({ id: 2, movie_id: 1, watched_date: '2026-03-10' }), // rewatch
      makeEntry({ id: 3, movie_id: 2, watched_date: '2026-06-01' }),
    ];

    const stats = computeYearStats(entries, movies, 2026);

    expect(stats.totalWatched).toBe(3);
    expect(stats.uniqueTitles).toBe(2);
  });

  it('only includes entries from the requested year', () => {
    const movies = [makeMovie({ tmdb_id: 1 })];
    const entries = [
      makeEntry({ id: 1, movie_id: 1, watched_date: '2025-12-31' }),
      makeEntry({ id: 2, movie_id: 1, watched_date: '2026-01-01' }),
    ];

    const stats = computeYearStats(entries, movies, 2026);

    expect(stats.totalWatched).toBe(1);
  });

  it('ranks top-rated movies watched this year, highest first', () => {
    const movies = [
      makeMovie({ tmdb_id: 1, my_rating: 3 }),
      makeMovie({ tmdb_id: 2, my_rating: 5 }),
      makeMovie({ tmdb_id: 3, my_rating: null }), // unrated - excluded
    ];
    const entries = [
      makeEntry({ id: 1, movie_id: 1, watched_date: '2026-02-01' }),
      makeEntry({ id: 2, movie_id: 2, watched_date: '2026-02-02' }),
      makeEntry({ id: 3, movie_id: 3, watched_date: '2026-02-03' }),
    ];

    const stats = computeYearStats(entries, movies, 2026);

    expect(stats.topRatedMovies.map((m) => m.movie.tmdb_id)).toEqual([2, 1]);
    expect(stats.averageRating).toBe(4);
  });

  it('computes the most-watched genre from movies with {id,name}[] genres JSON (TMDB shape)', () => {
    const movies = [
      makeMovie({ tmdb_id: 1, genres: JSON.stringify([{ id: 28, name: 'Action' }, { id: 12, name: 'Adventure' }]) }),
      makeMovie({ tmdb_id: 2, genres: JSON.stringify([{ id: 28, name: 'Action' }]) }),
      makeMovie({ tmdb_id: 3, genres: JSON.stringify([{ id: 18, name: 'Drama' }]) }),
    ];
    const entries = [
      makeEntry({ id: 1, movie_id: 1, watched_date: '2026-01-01' }),
      makeEntry({ id: 2, movie_id: 2, watched_date: '2026-01-02' }),
      makeEntry({ id: 3, movie_id: 3, watched_date: '2026-01-03' }),
    ];

    const stats = computeYearStats(entries, movies, 2026);

    expect(stats.topGenre).toEqual({ name: 'Action', count: 2 });
  });

  it('also handles a plain string[] genres JSON shape defensively', () => {
    const movies = [
      makeMovie({ tmdb_id: 1, genres: JSON.stringify(['Comedy', 'Romance']) }),
      makeMovie({ tmdb_id: 2, genres: JSON.stringify(['Comedy']) }),
    ];
    const entries = [
      makeEntry({ id: 1, movie_id: 1, watched_date: '2026-01-01' }),
      makeEntry({ id: 2, movie_id: 2, watched_date: '2026-01-02' }),
    ];

    const stats = computeYearStats(entries, movies, 2026);

    expect(stats.topGenre).toEqual({ name: 'Comedy', count: 2 });
  });

  it('finds the busiest month by counting watches per month', () => {
    const movies = [makeMovie({ tmdb_id: 1 })];
    const entries = [
      makeEntry({ id: 1, movie_id: 1, watched_date: '2026-08-01' }),
      makeEntry({ id: 2, movie_id: 1, watched_date: '2026-08-15' }),
      makeEntry({ id: 3, movie_id: 1, watched_date: '2026-08-20' }),
      makeEntry({ id: 4, movie_id: 1, watched_date: '2026-03-01' }),
    ];

    const stats = computeYearStats(entries, movies, 2026);

    expect(stats.busiestMonth).toEqual({ month: 8, count: 3 });
    expect(monthName(stats.busiestMonth!.month)).toBe('August');
  });

  it('gracefully skips malformed genres JSON', () => {
    const movies = [makeMovie({ tmdb_id: 1, genres: 'not valid json' })];
    const entries = [makeEntry({ id: 1, movie_id: 1, watched_date: '2026-01-01' })];

    const stats = computeYearStats(entries, movies, 2026);

    expect(stats.topGenre).toBeNull();
    expect(stats.totalWatched).toBe(1);
  });

  it('counts series watches toward totalWatched and dedupes uniqueTitles by (media_type, movie_id)', () => {
    // A movie and a series sharing the same tmdb_id must be counted as two distinct titles.
    const movies = [makeMovie({ tmdb_id: 1 })];
    const series = [makeSeries({ tmdb_id: 1 })];
    const entries = [
      makeEntry({ id: 1, movie_id: 1, media_type: 'movie', watched_date: '2026-01-05' }),
      makeEntry({ id: 2, movie_id: 1, media_type: 'series', watched_date: '2026-01-06' }),
      makeEntry({ id: 3, movie_id: 1, media_type: 'series', watched_date: '2026-02-01' }), // rewatch/re-episode
    ];

    const stats = computeYearStats(entries, movies, 2026, series);

    expect(stats.totalWatched).toBe(3);
    expect(stats.uniqueTitles).toBe(2);
  });

  it('ranks top-rated series alongside top-rated movies without mixing them into the wrong list', () => {
    const movies = [makeMovie({ tmdb_id: 1, my_rating: 3 })];
    const series = [
      makeSeries({ tmdb_id: 2, my_rating: 5 }),
      makeSeries({ tmdb_id: 3, my_rating: 4 }),
    ];
    const entries = [
      makeEntry({ id: 1, movie_id: 1, media_type: 'movie', watched_date: '2026-02-01' }),
      makeEntry({ id: 2, movie_id: 2, media_type: 'series', watched_date: '2026-02-02' }),
      makeEntry({ id: 3, movie_id: 3, media_type: 'series', watched_date: '2026-02-03' }),
    ];

    const stats = computeYearStats(entries, movies, 2026, series);

    expect(stats.topRatedMovies.map((m) => m.movie.tmdb_id)).toEqual([1]);
    expect(stats.topRatedSeries.map((s) => s.series.tmdb_id)).toEqual([2, 3]);
    // Overall average blends both: (3 + 5 + 4) / 3 = 4
    expect(stats.averageRating).toBe(4);
  });

  it('folds series genres into the overall genre breakdown', () => {
    const movies = [makeMovie({ tmdb_id: 1, genres: JSON.stringify([{ id: 18, name: 'Drama' }]) })];
    const series = [makeSeries({ tmdb_id: 2, genres: JSON.stringify([{ id: 18, name: 'Drama' }, { id: 80, name: 'Crime' }]) })];
    const entries = [
      makeEntry({ id: 1, movie_id: 1, media_type: 'movie', watched_date: '2026-01-01' }),
      makeEntry({ id: 2, movie_id: 2, media_type: 'series', watched_date: '2026-01-02' }),
    ];

    const stats = computeYearStats(entries, movies, 2026, series);

    expect(stats.topGenre).toEqual({ name: 'Drama', count: 2 });
    expect(stats.genreBreakdown).toEqual(
      expect.arrayContaining([{ name: 'Drama', count: 2 }, { name: 'Crime', count: 1 }])
    );
  });
});
