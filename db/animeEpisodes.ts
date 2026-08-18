import db from './client';

export interface AnimeEpisode {
  id: number;
  anime_id: number;
  episode_number: number;
  title: string | null;
  thumbnail: string | null;  // full AniList thumbnail URL, not a path fragment
  watched: number; // 0 or 1
  watched_at: string | null;
}

/** Insert or update AniList metadata for an episode. Does NOT touch watched state. */
export function upsertAnimeEpisode(
  episode: Omit<AnimeEpisode, 'id' | 'watched' | 'watched_at'>,
): void {
  db.runSync(
    `INSERT INTO AnimeEpisode (anime_id, episode_number, title, thumbnail)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(anime_id, episode_number) DO UPDATE SET
       title     = excluded.title,
       thumbnail = excluded.thumbnail`,
    [episode.anime_id, episode.episode_number, episode.title ?? null, episode.thumbnail ?? null],
  );
}

/** All cached episodes for an anime, in episode order. */
export function getEpisodesForAnime(animeId: number): AnimeEpisode[] {
  return db.getAllSync<AnimeEpisode>(
    'SELECT * FROM AnimeEpisode WHERE anime_id = ? ORDER BY episode_number ASC',
    [animeId],
  );
}

/** Toggle an episode's watched state. */
export function setAnimeEpisodeWatched(episodeId: number, watched: boolean): void {
  if (watched) {
    db.runSync(
      `UPDATE AnimeEpisode SET watched = 1, watched_at = datetime('now') WHERE id = ?`,
      [episodeId],
    );
  } else {
    db.runSync(
      `UPDATE AnimeEpisode SET watched = 0, watched_at = NULL WHERE id = ?`,
      [episodeId],
    );
  }
}

/** Count of watched episodes for an anime. */
export function getWatchedAnimeEpisodeCount(animeId: number): number {
  const row = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM AnimeEpisode WHERE anime_id = ? AND watched = 1',
    [animeId],
  );
  return row?.count ?? 0;
}

/** Count of all cached episodes for an anime. */
export function getTotalAnimeEpisodeCount(animeId: number): number {
  const row = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM AnimeEpisode WHERE anime_id = ?',
    [animeId],
  );
  return row?.count ?? 0;
}
