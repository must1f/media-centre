import db from './client';

export interface LogEntry {
  id: number;
  movie_id: number;
  watched_date: string; // ISO date string e.g. '2026-08-17'
  created_at: string;
}

/** Add a new diary entry. Rewatches always create a new row. */
export function logWatch(movieId: number, watchedDate: string): number {
  const result = db.runSync(
    `INSERT INTO LogEntry (movie_id, watched_date, created_at)
     VALUES (?, ?, datetime('now'))`,
    [movieId, watchedDate],
  );
  return result.lastInsertRowId;
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

/** Delete a specific log entry by id. */
export function deleteLogEntry(id: number): void {
  db.runSync('DELETE FROM LogEntry WHERE id = ?', [id]);
}
