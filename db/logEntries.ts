import db from './client';
import type { MediaType } from './watchlist';

export interface LogEntry {
  id: number;
  movie_id: number;
  media_type: MediaType;
  watched_date: string; // ISO date string e.g. '2026-08-17'
  note: string | null;
  created_at: string;
}

/** Add a new diary entry. Rewatches (or repeat episode watches) always create a new row. */
export function logWatch(
  mediaId: number,
  mediaType: MediaType,
  watchedDate: string,
  note: string | null = null,
): number {
  const result = db.runSync(
    `INSERT INTO LogEntry (movie_id, media_type, watched_date, note, created_at)
     VALUES (?, ?, ?, ?, datetime('now'))`,
    [mediaId, mediaType, watchedDate, note],
  );
  return result.lastInsertRowId;
}

/** Update the private note on an existing diary entry. */
export function updateLogEntryNote(id: number, note: string | null): void {
  db.runSync('UPDATE LogEntry SET note = ? WHERE id = ?', [note, id]);
}

/** All log entries for a specific movie or series (most recent first). */
export function getLogEntriesForMedia(mediaId: number, mediaType: MediaType): LogEntry[] {
  return db.getAllSync<LogEntry>(
    'SELECT * FROM LogEntry WHERE movie_id = ? AND media_type = ? ORDER BY watched_date DESC, created_at DESC',
    [mediaId, mediaType],
  );
}

/** Full diary - every watch entry (movies and series), most recent first. */
export function getAllLogEntries(): LogEntry[] {
  return db.getAllSync<LogEntry>(
    'SELECT * FROM LogEntry ORDER BY watched_date DESC, created_at DESC',
  );
}

/** Total number of watches across both media types (including rewatches). */
export function getTotalWatchCount(): number {
  const row = db.getFirstSync<{ count: number }>('SELECT COUNT(*) AS count FROM LogEntry');
  return row?.count ?? 0;
}

/** Total number of watches of one media type. */
export function getWatchCountForType(mediaType: MediaType): number {
  const row = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM LogEntry WHERE media_type = ?',
    [mediaType],
  );
  return row?.count ?? 0;
}

/** Number of unique movies watched. */
export function getUniqueMovieWatchCount(): number {
  const row = db.getFirstSync<{ count: number }>(
    "SELECT COUNT(DISTINCT movie_id) AS count FROM LogEntry WHERE media_type = 'movie'",
  );
  return row?.count ?? 0;
}

/** Whether the user has at least one log entry for this movie or series. */
export function hasWatched(mediaId: number, mediaType: MediaType): boolean {
  const row = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM LogEntry WHERE movie_id = ? AND media_type = ?',
    [mediaId, mediaType],
  );
  return (row?.count ?? 0) > 0;
}

/** Delete a specific log entry by id. */
export function deleteLogEntry(id: number): void {
  db.runSync('DELETE FROM LogEntry WHERE id = ?', [id]);
}
