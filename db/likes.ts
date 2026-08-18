import db from './client';
import type { MediaType } from './watchlist';

/** Like an item. Safe to call if already liked (ignored). */
export function likeMedia(mediaId: number, mediaType: MediaType): void {
  db.runSync(
    `INSERT OR IGNORE INTO Liked (movie_id, media_type, liked_at) VALUES (?, ?, datetime('now'))`,
    [mediaId, mediaType],
  );
}

/** Unlike an item. */
export function unlikeMedia(mediaId: number, mediaType: MediaType): void {
  db.runSync('DELETE FROM Liked WHERE movie_id = ? AND media_type = ?', [mediaId, mediaType]);
}

/** Is this item currently liked? */
export function isLiked(mediaId: number, mediaType: MediaType): boolean {
  const row = db.getFirstSync<{ movie_id: number }>(
    'SELECT movie_id FROM Liked WHERE movie_id = ? AND media_type = ?',
    [mediaId, mediaType],
  );
  return !!row;
}

/** All liked ids of a given media type, most recently liked first. */
export function getLikedIds(mediaType: MediaType): number[] {
  const rows = db.getAllSync<{ movie_id: number }>(
    'SELECT movie_id FROM Liked WHERE media_type = ? ORDER BY liked_at DESC',
    [mediaType],
  );
  return rows.map((r) => r.movie_id);
}

/** Toggle liked state. Returns the new state (true = liked). */
export function toggleLike(mediaId: number, mediaType: MediaType): boolean {
  if (isLiked(mediaId, mediaType)) {
    unlikeMedia(mediaId, mediaType);
    return false;
  }
  likeMedia(mediaId, mediaType);
  return true;
}
