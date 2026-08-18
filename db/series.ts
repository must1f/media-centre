import db from './client';

export interface Series {
  tmdb_id: number;
  name: string;
  poster_path: string | null;
  dominant_color: string | null;
  first_air_year: number | null;
  genres: string | null;       // JSON-encoded string array e.g. '["Drama","Crime"]'
  overview: string | null;
  status: string | null;       // TMDB status: 'Returning Series' | 'Ended' | 'Canceled'
  my_rating: number | null;    // 0.5-5.0 in 0.5 increments
  my_review: string | null;
  rating_updated_at: string | null;
}

/** Insert or replace TMDB metadata for a series. Does NOT touch my_rating / my_review. */
export function upsertSeries(series: Omit<Series, 'my_rating' | 'my_review' | 'rating_updated_at'>): void {
  db.runSync(
    `INSERT INTO Series (tmdb_id, name, poster_path, dominant_color, first_air_year, genres, overview, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(tmdb_id) DO UPDATE SET
       name           = excluded.name,
       poster_path    = excluded.poster_path,
       first_air_year = excluded.first_air_year,
       genres         = excluded.genres,
       overview       = excluded.overview,
       status         = excluded.status`,
    [
      series.tmdb_id,
      series.name,
      series.poster_path ?? null,
      series.dominant_color ?? null,
      series.first_air_year ?? null,
      series.genres ?? null,
      series.overview ?? null,
      series.status ?? null,
    ],
  );
}

/** Fetch a single cached series row. Returns null if not yet cached locally. */
export function getSeries(tmdbId: number): Series | null {
  return db.getFirstSync<Series>('SELECT * FROM Series WHERE tmdb_id = ?', [tmdbId]) ?? null;
}

/**
 * Update the user's rating and/or review on a Series row.
 *
 * @param forceOverwrite - Must be true to overwrite a non-empty existing review.
 *   Pass false to do a dry-run check; the function returns false without writing.
 * @returns true if the write happened, false if blocked by the overwrite guard.
 */
export function setSeriesRating(
  tmdbId: number,
  rating: number | null,
  review: string | null,
  forceOverwrite: boolean,
): boolean {
  const existing = getSeries(tmdbId);
  const hasExistingReview = !!existing?.my_review;
  const wouldOverwriteReview = hasExistingReview && !!review && review !== existing?.my_review;

  if (wouldOverwriteReview && !forceOverwrite) {
    return false;
  }

  db.runSync(
    `UPDATE Series
     SET my_rating = ?, my_review = ?, rating_updated_at = datetime('now')
     WHERE tmdb_id = ?`,
    [rating, review, tmdbId],
  );
  return true;
}

/** Store the extracted dominant hex color after poster analysis. */
export function setSeriesDominantColor(tmdbId: number, hex: string): void {
  db.runSync('UPDATE Series SET dominant_color = ? WHERE tmdb_id = ?', [hex, tmdbId]);
}

/** All series the user has rated, ordered by rating DESC. */
export function getRatedSeries(): Series[] {
  return db.getAllSync<Series>(
    'SELECT * FROM Series WHERE my_rating IS NOT NULL ORDER BY my_rating DESC, rating_updated_at DESC',
  );
}

/** All series the user has interacted with (any log, watchlist, or like). */
export function getAllCachedSeries(): Series[] {
  return db.getAllSync<Series>('SELECT * FROM Series');
}
