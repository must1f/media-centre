import db from './client';

/**
 * Runs all CREATE TABLE IF NOT EXISTS migrations.
 * Call once at app startup (in the root layout).
 */
export function initDatabase(): void {
  db.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    -- Local cache of TMDB metadata + user's rating/review (one per movie)
    CREATE TABLE IF NOT EXISTS Movie (
      tmdb_id           INTEGER PRIMARY KEY,
      title             TEXT    NOT NULL,
      poster_path       TEXT,
      dominant_color    TEXT,
      release_year      INTEGER,
      genres            TEXT,
      overview          TEXT,
      my_rating         REAL,
      my_review         TEXT,
      rating_updated_at TEXT
    );

    -- Diary: one row per watch (rewatches accumulate)
    CREATE TABLE IF NOT EXISTS LogEntry (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      movie_id     INTEGER NOT NULL REFERENCES Movie(tmdb_id) ON DELETE CASCADE,
      watched_date TEXT    NOT NULL,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- Watchlist
    CREATE TABLE IF NOT EXISTS WatchlistItem (
      movie_id INTEGER PRIMARY KEY REFERENCES Movie(tmdb_id) ON DELETE CASCADE,
      added_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Likes (local boolean flag — powers Suggested/Discover algorithms)
    CREATE TABLE IF NOT EXISTS Liked (
      movie_id INTEGER PRIMARY KEY REFERENCES Movie(tmdb_id) ON DELETE CASCADE,
      liked_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}
