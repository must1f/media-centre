import db from './client';

export type MediaType = 'movie' | 'series' | 'anime';

/** Add an item to the watchlist. Safe to call if already present (ignored). */
export function addToWatchlist(mediaId: number, mediaType: MediaType): void {
  db.runSync(
    `INSERT OR IGNORE INTO WatchlistItem (movie_id, media_type, added_at) VALUES (?, ?, datetime('now'))`,
    [mediaId, mediaType],
  );
}

/** Remove an item from the watchlist. */
export function removeFromWatchlist(mediaId: number, mediaType: MediaType): void {
  db.runSync('DELETE FROM WatchlistItem WHERE movie_id = ? AND media_type = ?', [mediaId, mediaType]);
}

/** Is this item currently on the watchlist? */
export function isOnWatchlist(mediaId: number, mediaType: MediaType): boolean {
  const row = db.getFirstSync<{ movie_id: number }>(
    'SELECT movie_id FROM WatchlistItem WHERE movie_id = ? AND media_type = ?',
    [mediaId, mediaType],
  );
  return !!row;
}

/** All watchlisted ids of a given media type, most recently added first. */
export function getWatchlistIds(mediaType: MediaType): number[] {
  const rows = db.getAllSync<{ movie_id: number }>(
    'SELECT movie_id FROM WatchlistItem WHERE media_type = ? ORDER BY added_at DESC',
    [mediaType],
  );
  return rows.map((r) => r.movie_id);
}

/** Toggle watchlist state. Returns the new state (true = on watchlist). */
export function toggleWatchlist(mediaId: number, mediaType: MediaType): boolean {
  if (isOnWatchlist(mediaId, mediaType)) {
    removeFromWatchlist(mediaId, mediaType);
    return false;
  }
  addToWatchlist(mediaId, mediaType);
  return true;
}
