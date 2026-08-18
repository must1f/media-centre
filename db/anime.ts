import db from './client';

export interface Anime {
  anilist_id: number;
  title: string;
  poster_path: string | null;  // full AniList cover image URL, not a path fragment
  dominant_color: string | null;
  start_year: number | null;
  genres: string | null;       // JSON-encoded string array e.g. '["Action","Adventure"]'
  overview: string | null;
  status: string | null;       // AniList status: RELEASING | FINISHED | NOT_YET_RELEASED | CANCELLED | HIATUS
  episode_count: number | null;
  my_rating: number | null;    // 0.5-5.0 in 0.5 increments
  my_review: string | null;
  rating_updated_at: string | null;
}

/** Insert or replace AniList metadata for an anime. Does NOT touch my_rating / my_review. */
export function upsertAnime(anime: Omit<Anime, 'my_rating' | 'my_review' | 'rating_updated_at'>): void {
  db.runSync(
    `INSERT INTO Anime (anilist_id, title, poster_path, dominant_color, start_year, genres, overview, status, episode_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(anilist_id) DO UPDATE SET
       title         = excluded.title,
       poster_path   = excluded.poster_path,
       start_year    = excluded.start_year,
       genres        = excluded.genres,
       overview      = excluded.overview,
       status        = excluded.status,
       episode_count = excluded.episode_count`,
    [
      anime.anilist_id,
      anime.title,
      anime.poster_path ?? null,
      anime.dominant_color ?? null,
      anime.start_year ?? null,
      anime.genres ?? null,
      anime.overview ?? null,
      anime.status ?? null,
      anime.episode_count ?? null,
    ],
  );
}

/** Fetch a single cached anime row. Returns null if not yet cached locally. */
export function getAnime(anilistId: number): Anime | null {
  return db.getFirstSync<Anime>('SELECT * FROM Anime WHERE anilist_id = ?', [anilistId]) ?? null;
}

/**
 * Update the user's rating and/or review on an Anime row.
 *
 * @param forceOverwrite - Must be true to overwrite a non-empty existing review.
 *   Pass false to do a dry-run check; the function returns false without writing.
 * @returns true if the write happened, false if blocked by the overwrite guard.
 */
export function setAnimeRating(
  anilistId: number,
  rating: number | null,
  review: string | null,
  forceOverwrite: boolean,
): boolean {
  const existing = getAnime(anilistId);
  const hasExistingReview = !!existing?.my_review;
  const wouldOverwriteReview = hasExistingReview && !!review && review !== existing?.my_review;

  if (wouldOverwriteReview && !forceOverwrite) {
    return false;
  }

  db.runSync(
    `UPDATE Anime
     SET my_rating = ?, my_review = ?, rating_updated_at = datetime('now')
     WHERE anilist_id = ?`,
    [rating, review, anilistId],
  );
  return true;
}

/** Store the extracted dominant hex color after poster analysis. */
export function setAnimeDominantColor(anilistId: number, hex: string): void {
  db.runSync('UPDATE Anime SET dominant_color = ? WHERE anilist_id = ?', [hex, anilistId]);
}

/** All anime the user has rated, ordered by rating DESC. */
export function getRatedAnime(): Anime[] {
  return db.getAllSync<Anime>(
    'SELECT * FROM Anime WHERE my_rating IS NOT NULL ORDER BY my_rating DESC, rating_updated_at DESC',
  );
}

/** All anime the user has interacted with (any log, watchlist, or like). */
export function getAllCachedAnime(): Anime[] {
  return db.getAllSync<Anime>('SELECT * FROM Anime');
}
