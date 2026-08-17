import db from './client';

/** Like a movie. Safe to call if already liked (ignored). */
export function likeMovie(movieId: number): void {
  db.runSync(
    `INSERT OR IGNORE INTO Liked (movie_id, liked_at) VALUES (?, datetime('now'))`,
    [movieId],
  );
}

/** Unlike a movie. */
export function unlikeMovie(movieId: number): void {
  db.runSync('DELETE FROM Liked WHERE movie_id = ?', [movieId]);
}

/** Is this movie currently liked? */
export function isLiked(movieId: number): boolean {
  const row = db.getFirstSync<{ movie_id: number }>(
    'SELECT movie_id FROM Liked WHERE movie_id = ?',
    [movieId],
  );
  return !!row;
}

/** All liked movie IDs, most recently liked first. */
export function getLikedMovieIds(): number[] {
  const rows = db.getAllSync<{ movie_id: number }>(
    'SELECT movie_id FROM Liked ORDER BY liked_at DESC',
  );
  return rows.map((r) => r.movie_id);
}

/** Toggle liked state. Returns the new state (true = liked). */
export function toggleLike(movieId: number): boolean {
  if (isLiked(movieId)) {
    unlikeMovie(movieId);
    return false;
  }
  likeMovie(movieId);
  return true;
}
