import type { Movie } from '@/db/movies';
import type { LogEntry } from '@/db/logEntries';

export type SortOption = 'rating' | 'dateWatched' | 'title' | 'genre';

export const SORT_OPTIONS: { id: SortOption; label: string; icon: string }[] = [
  { id: 'rating', label: 'Rating', icon: 'star.fill' },
  { id: 'dateWatched', label: 'Date Watched', icon: 'calendar' },
  { id: 'title', label: 'Title', icon: 'textformat' },
  { id: 'genre', label: 'Genre', icon: 'tag.fill' },
];

/** Parse the JSON-encoded genres string on a Movie and return the primary (first) genre name. */
export function primaryGenreName(genres: string | null | undefined): string {
  if (!genres) return '';
  try {
    const parsed = JSON.parse(genres) as Array<{ id: number; name: string } | string>;
    if (!Array.isArray(parsed) || parsed.length === 0) return '';
    const first = parsed[0];
    return typeof first === 'string' ? first : first.name ?? '';
  } catch {
    return '';
  }
}

/** Most recent watched_date for a movie, derived from its log entries. Empty string if never watched. */
function mostRecentWatchedDate(tmdbId: number, logEntries: LogEntry[]): string {
  let latest = '';
  for (const entry of logEntries) {
    if (entry.movie_id === tmdbId && entry.watched_date > latest) {
      latest = entry.watched_date;
    }
  }
  return latest;
}

/**
 * Sorts a list of movies by the given criterion. Pure function — does not mutate the input array.
 *
 * - rating: highest my_rating first (unrated movies sort last)
 * - dateWatched: most recently watched first, derived from logEntries (never-watched movies sort last)
 * - title: alphabetical (case-insensitive)
 * - genre: alphabetical by primary/first genre name (movies with no genre sort last)
 */
export function sortMovies(movies: Movie[], sortBy: SortOption, logEntries: LogEntry[] = []): Movie[] {
  const sorted = [...movies];

  switch (sortBy) {
    case 'rating':
      sorted.sort((a, b) => {
        const ar = a.my_rating ?? -1;
        const br = b.my_rating ?? -1;
        return br - ar;
      });
      break;

    case 'dateWatched':
      sorted.sort((a, b) => {
        const ad = mostRecentWatchedDate(a.tmdb_id, logEntries);
        const bd = mostRecentWatchedDate(b.tmdb_id, logEntries);
        if (ad === '' && bd === '') return 0;
        if (ad === '') return 1;
        if (bd === '') return -1;
        return bd.localeCompare(ad);
      });
      break;

    case 'title':
      // Lowercase before comparing rather than relying on localeCompare's `sensitivity`
      // option, which isn't guaranteed to behave the same on Hermes (device) as on
      // full-ICU Node (tests).
      sorted.sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()));
      break;

    case 'genre':
      sorted.sort((a, b) => {
        const ag = primaryGenreName(a.genres);
        const bg = primaryGenreName(b.genres);
        if (ag === '' && bg === '') return 0;
        if (ag === '') return 1;
        if (bg === '') return -1;
        return ag.toLowerCase().localeCompare(bg.toLowerCase());
      });
      break;
  }

  return sorted;
}
