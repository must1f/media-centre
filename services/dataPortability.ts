/**
 * Data portability: Letterboxd CSV import + JSON backup/restore.
 *
 * Pure logic only — no expo-file-system / expo-document-picker / expo-sharing
 * imports here, so this module stays trivially unit-testable (mock @/db/* and
 * @/services/tmdb the same way __tests__/services/recommendations.test.ts does).
 * All filesystem/picker/share side effects live in app/settings/data.tsx.
 */
import { searchMovies, releaseYear } from '@/services/tmdb';
import { upsertMovie, setRating, getAllCachedMovies, type Movie } from '@/db/movies';
import { logWatch, getAllLogEntries, getLogEntriesForMedia, type LogEntry } from '@/db/logEntries';
import { addToWatchlist, getWatchlistIds } from '@/db/watchlist';
import { likeMedia, getLikedIds } from '@/db/likes';

// ─── CSV parsing (dependency-free) ───────────────────────────────────

/**
 * Parse RFC4180-ish CSV text into rows of raw string cells.
 * Handles: BOM, CRLF/LF, quoted fields containing commas/newlines,
 * escaped quotes ("" inside a quoted field), and a missing trailing newline.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let source = text;
  if (source.charCodeAt(0) === 0xfeff) {
    source = source.slice(1);
  }

  const len = source.length;
  let i = 0;
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  let rowHasContent = false;

  while (i < len) {
    const char = source[i];

    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i += 1;
        }
      } else {
        field += char;
        i += 1;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      rowHasContent = true;
      i += 1;
      continue;
    }
    if (char === ',') {
      row.push(field);
      field = '';
      rowHasContent = true;
      i += 1;
      continue;
    }
    if (char === '\r') {
      i += 1;
      continue;
    }
    if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      rowHasContent = false;
      i += 1;
      continue;
    }
    field += char;
    rowHasContent = true;
    i += 1;
  }

  if (rowHasContent || field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop fully-empty trailing rows (e.g. a lone blank line at EOF).
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
}

function csvToRecords(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const rec: Record<string, string> = {};
    header.forEach((h, idx) => {
      rec[h] = (r[idx] ?? '').trim();
    });
    return rec;
  });
}

function parseYearCell(s: string | undefined): number | null {
  if (!s) return null;
  const y = parseInt(s, 10);
  return Number.isNaN(y) ? null : y;
}

function parseRatingCell(s: string | undefined): number | null {
  if (!s) return null;
  const r = parseFloat(s);
  if (Number.isNaN(r) || r <= 0) return null;
  return r;
}

// ─── Letterboxd row shapes ────────────────────────────────────────────

export interface LetterboxdDiaryRow {
  date: string;
  name: string;
  year: number | null;
  letterboxdUri: string;
  rating: number | null;
  rewatch: boolean;
  tags: string;
  watchedDate: string;
}

export interface LetterboxdRatingRow {
  date: string;
  name: string;
  year: number | null;
  letterboxdUri: string;
  rating: number | null;
}

/** Parse a Letterboxd `diary.csv` export into typed rows. */
export function parseDiaryCsv(text: string): LetterboxdDiaryRow[] {
  return csvToRecords(text)
    .map((rec) => ({
      date: rec['Date'] ?? '',
      name: rec['Name'] ?? '',
      year: parseYearCell(rec['Year']),
      letterboxdUri: rec['Letterboxd URI'] ?? '',
      rating: parseRatingCell(rec['Rating']),
      rewatch: (rec['Rewatch'] ?? '').toLowerCase() === 'yes',
      tags: rec['Tags'] ?? '',
      watchedDate: rec['Watched Date'] || rec['Date'] || '',
    }))
    .filter((r) => r.name.length > 0);
}

/** Parse a Letterboxd `ratings.csv` export into typed rows. */
export function parseRatingsCsv(text: string): LetterboxdRatingRow[] {
  return csvToRecords(text)
    .map((rec) => ({
      date: rec['Date'] ?? '',
      name: rec['Name'] ?? '',
      year: parseYearCell(rec['Year']),
      letterboxdUri: rec['Letterboxd URI'] ?? '',
      rating: parseRatingCell(rec['Rating']),
    }))
    .filter((r) => r.name.length > 0);
}

// ─── TMDB title resolution ────────────────────────────────────────────

function titleKey(name: string, year: number | null): string {
  return `${name.trim().toLowerCase()}|${year ?? ''}`;
}

/**
 * Resolve a Letterboxd title+year to a TMDB id via search, picking the best
 * year match. Results are memoized in `cache` so a title repeated across
 * diary.csv and ratings.csv is only searched once. Returns null if nothing
 * usable was found (network error included).
 */
export async function resolveTitleToTmdbId(
  name: string,
  year: number | null,
  cache: Map<string, number | null>,
): Promise<number | null> {
  const key = titleKey(name, year);
  if (cache.has(key)) return cache.get(key) ?? null;

  let resolved: number | null = null;
  try {
    const results = await searchMovies(name);
    if (results.length > 0) {
      if (year != null) {
        const exact = results.find((m) => releaseYear(m.release_date) === year);
        const near =
          exact ??
          results.find((m) => {
            const ry = releaseYear(m.release_date);
            return ry != null && Math.abs(ry - year) <= 1;
          });
        resolved = (near ?? results[0]).id;
      } else {
        resolved = results[0].id;
      }
    }
  } catch {
    resolved = null;
  }

  cache.set(key, resolved);
  return resolved;
}

// ─── Import orchestration ────────────────────────────────────────────

export interface ImportSummary {
  totalUniqueTitles: number;
  matched: number;
  unmatched: { title: string; year: number | null }[];
  logEntriesImported: number;
  ratingsImported: number;
}

/**
 * Import a Letterboxd diary and/or ratings export. Either argument may be
 * null (the user only picked one of the two files). Resolves each unique
 * title once via TMDB, caches the cached movie via upsertMovie, logs diary
 * watches via logWatch, and applies ratings via setRating. Titles that fail
 * to resolve are collected (not silently dropped) and returned in `unmatched`.
 */
export async function importLetterboxdData(
  diaryCsvText: string | null,
  ratingsCsvText: string | null,
  onProgress?: (processed: number, total: number) => void,
): Promise<ImportSummary> {
  const diaryRows = diaryCsvText ? parseDiaryCsv(diaryCsvText) : [];
  const ratingRows = ratingsCsvText ? parseRatingsCsv(ratingsCsvText) : [];

  const uniqueTitles = new Map<string, { name: string; year: number | null }>();
  for (const r of diaryRows) uniqueTitles.set(titleKey(r.name, r.year), { name: r.name, year: r.year });
  for (const r of ratingRows) uniqueTitles.set(titleKey(r.name, r.year), { name: r.name, year: r.year });

  const searchCache = new Map<string, number | null>();
  const resolvedIds = new Map<string, number | null>();

  const entries = Array.from(uniqueTitles.entries());
  let processed = 0;
  for (const [key, { name, year }] of entries) {
    const tmdbId = await resolveTitleToTmdbId(name, year, searchCache);
    resolvedIds.set(key, tmdbId);
    if (tmdbId != null) {
      upsertMovie({
        tmdb_id: tmdbId,
        title: name,
        poster_path: null,
        dominant_color: null,
        release_year: year,
        genres: null,
        overview: null,
        collection_id: null,
        collection_name: null,
      });
    }
    processed += 1;
    onProgress?.(processed, entries.length);
  }

  // The same film can appear with a blank/differing Year across diary.csv and
  // ratings.csv (e.g. "Heat"/1995 in one file, "Heat"/"" in the other), which
  // produces two distinct title+year keys for one movie. Collapse the
  // matched/unmatched summary — and row lookups — onto the film's title so a
  // title that resolved under any of its year variants isn't double-counted
  // or reported as unmatched.
  const normalizedTitle = (name: string) => name.trim().toLowerCase();
  const titleToId = new Map<string, number>();
  for (const [key, id] of resolvedIds.entries()) {
    if (id == null) continue;
    const title = normalizedTitle(uniqueTitles.get(key)!.name);
    if (!titleToId.has(title)) titleToId.set(title, id);
  }

  function lookupTmdbId(name: string, year: number | null): number | null {
    const direct = resolvedIds.get(titleKey(name, year));
    if (direct != null) return direct;
    return titleToId.get(normalizedTitle(name)) ?? null;
  }

  const distinctTitles = new Map<string, { name: string; year: number | null }>();
  for (const { name, year } of uniqueTitles.values()) {
    const t = normalizedTitle(name);
    if (!distinctTitles.has(t)) distinctTitles.set(t, { name, year });
  }
  const unmatched: { title: string; year: number | null }[] = [];
  let matched = 0;
  for (const [t, { name, year }] of distinctTitles.entries()) {
    if (titleToId.has(t)) matched += 1;
    else unmatched.push({ title: name, year });
  }

  // Diary rows -> log entries (dedupe against what's already logged + within batch).
  let logEntriesImported = 0;
  const seenWatch = new Set<string>();
  for (const r of diaryRows) {
    const tmdbId = lookupTmdbId(r.name, r.year);
    if (tmdbId == null) continue;
    const watchedDate = r.watchedDate || r.date;
    if (!watchedDate) continue;
    const dedupeKey = `${tmdbId}|${watchedDate}`;
    if (seenWatch.has(dedupeKey)) continue;
    seenWatch.add(dedupeKey);
    const alreadyLogged = getLogEntriesForMedia(tmdbId, 'movie').some((e) => e.watched_date === watchedDate);
    if (alreadyLogged) continue;
    logWatch(tmdbId, 'movie', watchedDate);
    logEntriesImported += 1;
  }

  // Ratings: prefer ratings.csv, fall back to a diary row's own Rating column.
  const ratingByTitle = new Map<string, number>();
  for (const r of ratingRows) {
    if (r.rating != null) ratingByTitle.set(normalizedTitle(r.name), r.rating);
  }
  for (const r of diaryRows) {
    const t = normalizedTitle(r.name);
    if (r.rating != null && !ratingByTitle.has(t)) ratingByTitle.set(t, r.rating);
  }

  let ratingsImported = 0;
  for (const [t, rating] of ratingByTitle.entries()) {
    const tmdbId = titleToId.get(t);
    if (tmdbId == null) continue;
    setRating(tmdbId, rating, null, true);
    ratingsImported += 1;
  }

  return {
    totalUniqueTitles: distinctTitles.size,
    matched,
    unmatched,
    logEntriesImported,
    ratingsImported,
  };
}

// ─── JSON backup ──────────────────────────────────────────────────────

export const BACKUP_VERSION = 1;

export interface BackupDocument {
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  movies: Movie[];
  logEntries: LogEntry[];
  watchlistMovieIds: number[];
  likedMovieIds: number[];
}

/**
 * Serialize all four local tables into one JSON-able document.
 *
 * Note: WatchlistItem.added_at / Liked.liked_at / LogEntry.created_at can't be
 * round-tripped — addToWatchlist/likeMovie/logWatch always stamp datetime('now')
 * and take no timestamp argument, and the id-only getters don't expose them.
 * Only the ids are backed up; restoring re-stamps "now" for those rows.
 */
export function buildBackup(): BackupDocument {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    movies: getAllCachedMovies(),
    logEntries: getAllLogEntries(),
    watchlistMovieIds: getWatchlistIds('movie'),
    likedMovieIds: getLikedIds('movie'),
  };
}

export function serializeBackup(): string {
  return JSON.stringify(buildBackup(), null, 2);
}

// ─── JSON restore ─────────────────────────────────────────────────────

export interface RestoreSummary {
  moviesRestored: number;
  logEntriesRestored: number;
  logEntriesSkippedDuplicate: number;
  watchlistRestored: number;
  likesRestored: number;
  errors: string[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** Parse (but don't validate beyond "is it JSON") a previously-saved backup file's text. */
export function parseBackupDocument(json: string): unknown {
  return JSON.parse(json);
}

/**
 * Restore a backup document into the local tables via the existing db/*.ts
 * data-access functions. Tolerant of unknown/missing keys — fields are picked
 * explicitly (never spread), so a backup produced by a newer app version with
 * extra columns still restores cleanly instead of throwing.
 */
export function restoreBackup(doc: unknown): RestoreSummary {
  const summary: RestoreSummary = {
    moviesRestored: 0,
    logEntriesRestored: 0,
    logEntriesSkippedDuplicate: 0,
    watchlistRestored: 0,
    likesRestored: 0,
    errors: [],
  };

  if (!isRecord(doc)) {
    summary.errors.push('Backup file is not a valid JSON object.');
    return summary;
  }

  const movies = Array.isArray(doc.movies) ? doc.movies : [];
  for (const raw of movies) {
    if (!isRecord(raw) || typeof raw.tmdb_id !== 'number' || typeof raw.title !== 'string') {
      summary.errors.push('Skipped a movie row with a missing tmdb_id/title.');
      continue;
    }
    upsertMovie({
      tmdb_id: raw.tmdb_id,
      title: raw.title,
      poster_path: typeof raw.poster_path === 'string' ? raw.poster_path : null,
      dominant_color: typeof raw.dominant_color === 'string' ? raw.dominant_color : null,
      release_year: typeof raw.release_year === 'number' ? raw.release_year : null,
      genres: typeof raw.genres === 'string' ? raw.genres : null,
      overview: typeof raw.overview === 'string' ? raw.overview : null,
      collection_id: typeof raw.collection_id === 'number' ? raw.collection_id : null,
      collection_name: typeof raw.collection_name === 'string' ? raw.collection_name : null,
    });

    const rating = typeof raw.my_rating === 'number' ? raw.my_rating : null;
    const review = typeof raw.my_review === 'string' ? raw.my_review : null;
    if (rating != null || review != null) {
      setRating(raw.tmdb_id, rating, review, true);
    }
    summary.moviesRestored += 1;
  }

  const logEntries = Array.isArray(doc.logEntries) ? doc.logEntries : [];
  for (const raw of logEntries) {
    if (!isRecord(raw) || typeof raw.movie_id !== 'number' || typeof raw.watched_date !== 'string') {
      summary.errors.push('Skipped a log entry row with a missing movie_id/watched_date.');
      continue;
    }
    const alreadyLogged = getLogEntriesForMedia(raw.movie_id, 'movie').some(
      (e) => e.watched_date === raw.watched_date,
    );
    if (alreadyLogged) {
      summary.logEntriesSkippedDuplicate += 1;
      continue;
    }
    logWatch(raw.movie_id, 'movie', raw.watched_date);
    summary.logEntriesRestored += 1;
  }

  const watchlistIds = Array.isArray(doc.watchlistMovieIds) ? doc.watchlistMovieIds : [];
  for (const id of watchlistIds) {
    if (typeof id !== 'number') continue;
    addToWatchlist(id, 'movie');
    summary.watchlistRestored += 1;
  }

  const likedIds = Array.isArray(doc.likedMovieIds) ? doc.likedMovieIds : [];
  for (const id of likedIds) {
    if (typeof id !== 'number') continue;
    likeMedia(id, 'movie');
    summary.likesRestored += 1;
  }

  return summary;
}
