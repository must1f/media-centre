import db from './client';

export interface Season {
  id: number;
  series_id: number;
  season_number: number;
  name: string | null;
  poster_path: string | null;
  episode_count: number | null;
}

/** Insert or update a season row. Returns the row's local id. */
export function upsertSeason(season: Omit<Season, 'id'>): number {
  db.runSync(
    `INSERT INTO Season (series_id, season_number, name, poster_path, episode_count)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(series_id, season_number) DO UPDATE SET
       name          = excluded.name,
       poster_path   = excluded.poster_path,
       episode_count = excluded.episode_count`,
    [season.series_id, season.season_number, season.name ?? null, season.poster_path ?? null, season.episode_count ?? null],
  );
  const row = db.getFirstSync<{ id: number }>(
    'SELECT id FROM Season WHERE series_id = ? AND season_number = ?',
    [season.series_id, season.season_number],
  );
  return row!.id;
}

/** All cached seasons for a series, in season order. */
export function getSeasonsForSeries(seriesId: number): Season[] {
  return db.getAllSync<Season>(
    'SELECT * FROM Season WHERE series_id = ? ORDER BY season_number ASC',
    [seriesId],
  );
}

/** A single cached season by series id + season number. */
export function getSeason(seriesId: number, seasonNumber: number): Season | null {
  return (
    db.getFirstSync<Season>(
      'SELECT * FROM Season WHERE series_id = ? AND season_number = ?',
      [seriesId, seasonNumber],
    ) ?? null
  );
}
