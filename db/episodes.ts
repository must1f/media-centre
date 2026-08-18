import db from './client';

export interface Episode {
  id: number;
  season_id: number;
  series_id: number;
  episode_number: number;
  name: string | null;
  overview: string | null;
  still_path: string | null;
  air_date: string | null;
  runtime: number | null;
  watched: number; // 0 or 1
  watched_at: string | null;
}

/** Insert or update TMDB metadata for an episode. Does NOT touch watched state. */
export function upsertEpisode(
  episode: Omit<Episode, 'id' | 'watched' | 'watched_at'>,
): void {
  db.runSync(
    `INSERT INTO Episode (season_id, series_id, episode_number, name, overview, still_path, air_date, runtime)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(season_id, episode_number) DO UPDATE SET
       name       = excluded.name,
       overview   = excluded.overview,
       still_path = excluded.still_path,
       air_date   = excluded.air_date,
       runtime    = excluded.runtime`,
    [
      episode.season_id,
      episode.series_id,
      episode.episode_number,
      episode.name ?? null,
      episode.overview ?? null,
      episode.still_path ?? null,
      episode.air_date ?? null,
      episode.runtime ?? null,
    ],
  );
}

/** All cached episodes for a season, in episode order. */
export function getEpisodesForSeason(seasonId: number): Episode[] {
  return db.getAllSync<Episode>(
    'SELECT * FROM Episode WHERE season_id = ? ORDER BY episode_number ASC',
    [seasonId],
  );
}

/** Toggle an episode's watched state. */
export function setEpisodeWatched(episodeId: number, watched: boolean): void {
  if (watched) {
    db.runSync(
      `UPDATE Episode SET watched = 1, watched_at = datetime('now') WHERE id = ?`,
      [episodeId],
    );
  } else {
    db.runSync(
      `UPDATE Episode SET watched = 0, watched_at = NULL WHERE id = ?`,
      [episodeId],
    );
  }
}

/** Count of watched episodes across all cached seasons of a series. */
export function getWatchedEpisodeCount(seriesId: number): number {
  const row = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM Episode WHERE series_id = ? AND watched = 1',
    [seriesId],
  );
  return row?.count ?? 0;
}

/** Count of all cached episodes for a series (may be less than the show's true total if not all seasons are cached yet). */
export function getTotalEpisodeCount(seriesId: number): number {
  const row = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM Episode WHERE series_id = ?',
    [seriesId],
  );
  return row?.count ?? 0;
}
