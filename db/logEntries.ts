import db from './client';

export interface LogEntry {
  id: number;
  movie_id: number;
  watched_date: string; // ISO date string e.g. '2026-08-17'
  note: string | null;
  created_at: string;
}

/** Add a new diary entry. Rewatches always create a new row. */
export function logWatch(movieId: number, watchedDate: string, note: string | null = null): number {
  const result = db.runSync(
    `INSERT INTO LogEntry (movie_id, watched_date, note, created_at)
     VALUES (?, ?, ?, datetime('now'))`,
    [movieId, watchedDate, note],
  );
  return result.lastInsertRowId;
}

/** Update the private note on an existing diary entry. */
export function updateLogEntryNote(id: number, note: string | null): void {
  db.runSync('UPDATE LogEntry SET note = ? WHERE id = ?', [note, id]);
}

/** All log entries for a specific movie (most recent first). */
export function getLogEntriesForMovie(movieId: number): LogEntry[] {
  return db.getAllSync<LogEntry>(
    'SELECT * FROM LogEntry WHERE movie_id = ? ORDER BY watched_date DESC, created_at DESC',
    [movieId],
  );
}

/** Full diary - every watch entry, most recent first. */
export function getAllLogEntries(): LogEntry[] {
  return db.getAllSync<LogEntry>(
    'SELECT * FROM LogEntry ORDER BY watched_date DESC, created_at DESC',
  );
}

/** Total number of watches (including rewatches). */
export function getTotalWatchCount(): number {
  const row = db.getFirstSync<{ count: number }>('SELECT COUNT(*) AS count FROM LogEntry');
  return row?.count ?? 0;
}

/** Number of unique movies watched. */
export function getUniqueMovieWatchCount(): number {
  const row = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(DISTINCT movie_id) AS count FROM LogEntry',
  );
  return row?.count ?? 0;
}

/** Whether the user has at least one log entry for a movie. */
export function hasWatched(movieId: number): boolean {
  const row = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM LogEntry WHERE movie_id = ?',
    [movieId],
  );
  return (row?.count ?? 0) > 0;
}

/** Delete a specific log entry by id. */
export function deleteLogEntry(id: number): void {
  db.runSync('DELETE FROM LogEntry WHERE id = ?', [id]);
}
