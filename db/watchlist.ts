import db from './client';

/** Add a movie to the watchlist. Safe to call if already present (ignored). */
export function addToWatchlist(movieId: number): void {
  db.runSync(
    `INSERT OR IGNORE INTO WatchlistItem (movie_id, added_at) VALUES (?, datetime('now'))`,
    [movieId],
  );
}

/** Remove a movie from the watchlist. */
export function removeFromWatchlist(movieId: number): void {
  db.runSync('DELETE FROM WatchlistItem WHERE movie_id = ?', [movieId]);
}

/** Is this movie currently on the watchlist? */
export function isOnWatchlist(movieId: number): boolean {
  const row = db.getFirstSync<{ movie_id: number }>(
    'SELECT movie_id FROM WatchlistItem WHERE movie_id = ?',
    [movieId],
  );
  return !!row;
}

/** All watchlisted movie IDs, most recently added first. */
export function getWatchlistIds(): number[] {
  const rows = db.getAllSync<{ movie_id: number }>(
    'SELECT movie_id FROM WatchlistItem ORDER BY added_at DESC',
  );
  return rows.map((r) => r.movie_id);
}

/** Toggle watchlist state. Returns the new state (true = on watchlist). */
export function toggleWatchlist(movieId: number): boolean {
  if (isOnWatchlist(movieId)) {
    removeFromWatchlist(movieId);
    return false;
  }
  addToWatchlist(movieId);
  return true;
}
