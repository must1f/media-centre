import type { LogEntry } from '@/db/logEntries';
import type { Movie } from '@/db/movies';
import type { Series } from '@/db/series';

/** A single genre tag as parsed out of Movie.genres / Series.genres. */
type GenreTag = { id: number; name: string } | string;

export interface TopRatedMovie {
  movie: Movie;
  rating: number;
}

export interface TopRatedSeries {
  series: Series;
  rating: number;
}

export interface MonthCount {
  /** 1-12 */
  month: number;
  count: number;
}

export interface GenreCount {
  name: string;
  count: number;
}

export interface YearStats {
  year: number;
  /** Total watches logged this year, including rewatches, across movies and series. */
  totalWatched: number;
  /** Unique titles watched this year (rewatches deduped; a movie and a series that happen to
   *  share a tmdb_id are counted separately, keyed by (media_type, movie_id)). */
  uniqueTitles: number;
  /** Movies logged this year with a my_rating, sorted highest rating first. */
  topRatedMovies: TopRatedMovie[];
  /** Series logged this year with a my_rating, sorted highest rating first. */
  topRatedSeries: TopRatedSeries[];
  /** Most-watched genre this year (across movies and series), or null if no genre data is available. */
  topGenre: GenreCount | null;
  /** All genre tallies this year across movies and series, sorted descending. */
  genreBreakdown: GenreCount[];
  /** Busiest month this year (by number of watches), or null if no entries. */
  busiestMonth: MonthCount | null;
  /** All months with at least one watch, sorted by month number. */
  monthBreakdown: MonthCount[];
  /** Average my_rating across rated movies AND series watched this year, or null. */
  averageRating: number | null;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? '';
}

/** Extract the 4-digit year from an ISO date string like '2026-08-17'. */
function yearOf(dateStr: string): number {
  return parseInt(dateStr.slice(0, 4), 10);
}

/** Extract the 1-12 month from an ISO date string like '2026-08-17'. */
function monthOf(dateStr: string): number {
  return parseInt(dateStr.slice(5, 7), 10);
}

/** Normalize a genre tag (either `{id,name}` or a plain string) to its display name. */
function genreName(tag: GenreTag): string | null {
  if (typeof tag === 'string') return tag;
  if (tag && typeof tag === 'object' && typeof tag.name === 'string') return tag.name;
  return null;
}

function parseGenres(genresJson: string | null): string[] {
  if (!genresJson) return [];
  let parsed: GenreTag[] = [];
  try {
    parsed = JSON.parse(genresJson);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map(genreName)
    .filter((name): name is string => !!name);
}

/** Composite dedupe key: a movie and a series can share a numeric tmdb_id, so uniqueness
 *  must be scoped by media_type, not movie_id alone. */
function entryKey(entry: LogEntry): string {
  return `${entry.media_type}:${entry.movie_id}`;
}

/**
 * Pure computation of "Your Year" recap stats from local diary data.
 * No DB or network calls — takes plain arrays so it's trivially unit-testable.
 *
 * `series` is optional (defaults to `[]`) so existing callers that only pass movies keep
 * compiling unchanged; pass the user's cached Series rows (e.g. from `getAllCachedSeries()`)
 * to get series watches reflected in the type-aware stats below.
 *
 * Note on "hours watched": this file does not compute an hours/runtime-based stat. Attributing
 * a specific episode's runtime to a given LogEntry row is not reliably possible from the schema
 * alone — LogEntry stores (movie_id, media_type, watched_date) but no episode id, and Episode
 * runtimes are only known for episodes that happened to be cached via upsertEpisode. Rather than
 * guess at an episode via a fuzzy date/season match, no such stat is computed here.
 */
export function computeYearStats(
  logEntries: LogEntry[],
  movies: Movie[],
  year: number,
  series: Series[] = [],
): YearStats {
  const movieById = new Map<number, Movie>();
  for (const m of movies) {
    movieById.set(m.tmdb_id, m);
  }
  const seriesById = new Map<number, Series>();
  for (const s of series) {
    seriesById.set(s.tmdb_id, s);
  }

  const entriesThisYear = logEntries.filter((e) => yearOf(e.watched_date) === year);
  const movieEntriesThisYear = entriesThisYear.filter((e) => e.media_type !== 'series');
  const seriesEntriesThisYear = entriesThisYear.filter((e) => e.media_type === 'series');

  const totalWatched = entriesThisYear.length;
  const uniqueKeys = new Set(entriesThisYear.map(entryKey));
  const uniqueTitles = uniqueKeys.size;

  // Top-rated movies: dedupe by movie, from movies with a my_rating that were logged this year.
  const uniqueMovieIds = new Set(movieEntriesThisYear.map((e) => e.movie_id));
  const topRatedMovies: TopRatedMovie[] = Array.from(uniqueMovieIds)
    .map((id) => movieById.get(id))
    .filter((m): m is Movie => !!m && m.my_rating != null)
    .map((m) => ({ movie: m, rating: m.my_rating as number }))
    .sort((a, b) => b.rating - a.rating);

  // Top-rated series: same idea, joined against the Series table.
  const uniqueSeriesIds = new Set(seriesEntriesThisYear.map((e) => e.movie_id));
  const topRatedSeries: TopRatedSeries[] = Array.from(uniqueSeriesIds)
    .map((id) => seriesById.get(id))
    .filter((s): s is Series => !!s && s.my_rating != null)
    .map((s) => ({ series: s, rating: s.my_rating as number }))
    .sort((a, b) => b.rating - a.rating);

  const ratedCount = topRatedMovies.length + topRatedSeries.length;
  const averageRating =
    ratedCount > 0
      ? (topRatedMovies.reduce((sum, m) => sum + m.rating, 0) +
          topRatedSeries.reduce((sum, s) => sum + s.rating, 0)) /
        ratedCount
      : null;

  // Genre breakdown across all watches this year (rewatches count each time), movies and series alike.
  const genreCounts = new Map<string, number>();
  for (const entry of entriesThisYear) {
    const genresJson =
      entry.media_type === 'series'
        ? seriesById.get(entry.movie_id)?.genres ?? null
        : movieById.get(entry.movie_id)?.genres ?? null;
    for (const name of parseGenres(genresJson)) {
      genreCounts.set(name, (genreCounts.get(name) ?? 0) + 1);
    }
  }
  const genreBreakdown: GenreCount[] = Array.from(genreCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  const topGenre = genreBreakdown[0] ?? null;

  // Busiest month (media-agnostic: just counts watches per calendar month).
  const monthCounts = new Map<number, number>();
  for (const entry of entriesThisYear) {
    const month = monthOf(entry.watched_date);
    monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1);
  }
  const monthBreakdown: MonthCount[] = Array.from(monthCounts.entries())
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month - b.month);
  const busiestMonth =
    monthBreakdown.length > 0
      ? monthBreakdown.reduce((best, m) => (m.count > best.count ? m : best))
      : null;

  return {
    year,
    totalWatched,
    uniqueTitles,
    topRatedMovies,
    topRatedSeries,
    topGenre,
    genreBreakdown,
    busiestMonth,
    monthBreakdown,
    averageRating,
  };
}
