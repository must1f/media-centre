import db from './client';

export interface Movie {
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  dominant_color: string | null;
  release_year: number | null;
  genres: string | null;       // JSON-encoded string array e.g. '["Action","Drama"]'
  overview: string | null;
  my_rating: number | null;   // 0.5-5.0 in 0.5 increments
  my_review: string | null;
  rating_updated_at: string | null;
}

/** Insert or replace TMDB metadata for a movie. Does NOT touch my_rating / my_review. */
export function upsertMovie(movie: Omit<Movie, 'my_rating' | 'my_review' | 'rating_updated_at'>): void {
  db.runSync(
    `INSERT INTO Movie (tmdb_id, title, poster_path, dominant_color, release_year, genres, overview)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(tmdb_id) DO UPDATE SET
       title          = excluded.title,
       poster_path    = excluded.poster_path,
       release_year   = excluded.release_year,
       genres         = excluded.genres,
       overview       = excluded.overview`,
    [
      movie.tmdb_id,
      movie.title,
      movie.poster_path ?? null,
      movie.dominant_color ?? null,
      movie.release_year ?? null,
      movie.genres ?? null,
      movie.overview ?? null,
    ],
  );
}

/** Fetch a single cached movie row. Returns null if not yet cached locally. */
export function getMovie(tmdbId: number): Movie | null {
  return db.getFirstSync<Movie>('SELECT * FROM Movie WHERE tmdb_id = ?', [tmdbId]) ?? null;
}

/**
 * Update the user's rating and/or review on a Movie row.
 *
 * @param forceOverwrite - Must be true to overwrite a non-empty existing review.
 *   Pass false to do a dry-run check; the function returns false without writing.
 * @returns true if the write happened, false if blocked by the overwrite guard.
 */
export function setRating(
  tmdbId: number,
  rating: number | null,
  review: string | null,
  forceOverwrite: boolean,
): boolean {
  const existing = getMovie(tmdbId);
  const hasExistingReview = !!existing?.my_review;
  const wouldOverwriteReview = hasExistingReview && !!review && review !== existing?.my_review;

  if (wouldOverwriteReview && !forceOverwrite) {
    // Signal the UI to show the confirmation dialog
    return false;
  }

  db.runSync(
    `UPDATE Movie
     SET my_rating = ?, my_review = ?, rating_updated_at = datetime('now')
     WHERE tmdb_id = ?`,
    [rating, review, tmdbId],
  );
  return true;
}

/** Store the extracted dominant hex color after poster analysis. */
export function setDominantColor(tmdbId: number, hex: string): void {
  db.runSync('UPDATE Movie SET dominant_color = ? WHERE tmdb_id = ?', [hex, tmdbId]);
}

/** All movies the user has rated, ordered by rating DESC. */
export function getRatedMovies(): Movie[] {
  return db.getAllSync<Movie>(
    'SELECT * FROM Movie WHERE my_rating IS NOT NULL ORDER BY my_rating DESC, rating_updated_at DESC',
  );
}

/** All movies the user has interacted with (any log, watchlist, or like). */
export function getAllCachedMovies(): Movie[] {
  return db.getAllSync<Movie>('SELECT * FROM Movie');
}
