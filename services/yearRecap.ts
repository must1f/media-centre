import type { LogEntry } from '@/db/logEntries';
import type { Movie } from '@/db/movies';

/** A single genre tag as parsed out of Movie.genres. */
type GenreTag = { id: number; name: string } | string;

export interface TopRatedMovie {
  movie: Movie;
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
  /** Total watches logged this year, including rewatches. */
  totalWatched: number;
  /** Unique movie titles watched this year (rewatches deduped). */
  uniqueTitles: number;
  /** Movies logged this year with a my_rating, sorted highest rating first. */
  topRatedMovies: TopRatedMovie[];
  /** Most-watched genre this year, or null if no genre data is available. */
  topGenre: GenreCount | null;
  /** All genre tallies this year, sorted descending. */
  genreBreakdown: GenreCount[];
  /** Busiest month this year (by number of watches), or null if no entries. */
  busiestMonth: MonthCount | null;
  /** All months with at least one watch, sorted by month number. */
  monthBreakdown: MonthCount[];
  /** Average my_rating across rated movies watched this year, or null. */
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

/**
 * Pure computation of "Your Year" recap stats from local diary data.
 * No DB or network calls — takes plain arrays so it's trivially unit-testable.
 */
export function computeYearStats(logEntries: LogEntry[], movies: Movie[], year: number): YearStats {
  const movieById = new Map<number, Movie>();
  for (const m of movies) {
    movieById.set(m.tmdb_id, m);
  }

  const entriesThisYear = logEntries.filter((e) => yearOf(e.watched_date) === year);

  const totalWatched = entriesThisYear.length;
  const uniqueMovieIds = new Set(entriesThisYear.map((e) => e.movie_id));
  const uniqueTitles = uniqueMovieIds.size;

  // Top-rated movies: dedupe by movie, from movies with a my_rating that were logged this year.
  const topRatedMovies: TopRatedMovie[] = Array.from(uniqueMovieIds)
    .map((id) => movieById.get(id))
    .filter((m): m is Movie => !!m && m.my_rating != null)
    .map((m) => ({ movie: m, rating: m.my_rating as number }))
    .sort((a, b) => b.rating - a.rating);

  const averageRating =
    topRatedMovies.length > 0
      ? topRatedMovies.reduce((sum, m) => sum + m.rating, 0) / topRatedMovies.length
      : null;

  // Genre breakdown across all watches this year (rewatches count each time).
  const genreCounts = new Map<string, number>();
  for (const entry of entriesThisYear) {
    const movie = movieById.get(entry.movie_id);
    if (!movie) continue;
    for (const name of parseGenres(movie.genres)) {
      genreCounts.set(name, (genreCounts.get(name) ?? 0) + 1);
    }
  }
  const genreBreakdown: GenreCount[] = Array.from(genreCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  const topGenre = genreBreakdown[0] ?? null;

  // Busiest month.
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
    topGenre,
    genreBreakdown,
    busiestMonth,
    monthBreakdown,
    averageRating,
  };
}
