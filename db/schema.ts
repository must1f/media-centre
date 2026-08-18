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
      collection_id     INTEGER,
      collection_name   TEXT,
      my_rating         REAL,
      my_review         TEXT,
      rating_updated_at TEXT
    );

    -- Local cache of TMDB metadata + user's rating/review (one per series)
    CREATE TABLE IF NOT EXISTS Series (
      tmdb_id           INTEGER PRIMARY KEY,
      name              TEXT    NOT NULL,
      poster_path       TEXT,
      dominant_color    TEXT,
      first_air_year    INTEGER,
      genres            TEXT,
      overview          TEXT,
      status            TEXT,
      my_rating         REAL,
      my_review         TEXT,
      rating_updated_at TEXT
    );

    -- One row per season of a cached series
    CREATE TABLE IF NOT EXISTS Season (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      series_id      INTEGER NOT NULL REFERENCES Series(tmdb_id) ON DELETE CASCADE,
      season_number  INTEGER NOT NULL,
      name           TEXT,
      poster_path    TEXT,
      episode_count  INTEGER,
      UNIQUE(series_id, season_number)
    );

    -- One row per episode; watched state lives here
    CREATE TABLE IF NOT EXISTS Episode (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      season_id       INTEGER NOT NULL REFERENCES Season(id) ON DELETE CASCADE,
      series_id       INTEGER NOT NULL REFERENCES Series(tmdb_id) ON DELETE CASCADE,
      episode_number  INTEGER NOT NULL,
      name            TEXT,
      overview        TEXT,
      still_path      TEXT,
      air_date        TEXT,
      runtime         INTEGER,
      watched         INTEGER NOT NULL DEFAULT 0,
      watched_at      TEXT,
      UNIQUE(season_id, episode_number)
    );

    -- Diary: one row per watch (rewatches accumulate)
    CREATE TABLE IF NOT EXISTS LogEntry (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      movie_id     INTEGER NOT NULL REFERENCES Movie(tmdb_id) ON DELETE CASCADE,
      watched_date TEXT    NOT NULL,
      note         TEXT,
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

  // Columns added after the initial release — CREATE TABLE IF NOT EXISTS above
  // won't retrofit these onto a database that already has the table.
  addColumnIfMissing('Movie', 'collection_id', 'INTEGER');
  addColumnIfMissing('Movie', 'collection_name', 'TEXT');
  addColumnIfMissing('LogEntry', 'note', 'TEXT');

  // media_type disambiguates movie_id vs. a Series tmdb_id in these
  // originally movie-only tables — 'movie' is the default so existing rows
  // stay correctly attributed.
  addColumnIfMissing('WatchlistItem', 'media_type', "TEXT NOT NULL DEFAULT 'movie'");
  addColumnIfMissing('Liked', 'media_type', "TEXT NOT NULL DEFAULT 'movie'");
  addColumnIfMissing('LogEntry', 'media_type', "TEXT NOT NULL DEFAULT 'movie'");
}

function addColumnIfMissing(table: string, column: string, type: string): void {
  try {
    db.execSync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
  } catch {
    // Column already exists — ignore.
  }
}
