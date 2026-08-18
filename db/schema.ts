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

    -- Local cache of AniList metadata + user's rating/review (one per anime)
    CREATE TABLE IF NOT EXISTS Anime (
      anilist_id        INTEGER PRIMARY KEY,
      title             TEXT    NOT NULL,
      poster_path       TEXT,
      dominant_color    TEXT,
      start_year        INTEGER,
      genres            TEXT,
      overview          TEXT,
      status            TEXT,
      episode_count     INTEGER,
      my_rating         REAL,
      my_review         TEXT,
      rating_updated_at TEXT
    );

    -- One row per episode; watched state lives here. Flat (no season tier —
    -- AniList models anime as a single continuous episode list).
    CREATE TABLE IF NOT EXISTS AnimeEpisode (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      anime_id        INTEGER NOT NULL REFERENCES Anime(anilist_id) ON DELETE CASCADE,
      episode_number  INTEGER NOT NULL,
      title           TEXT,
      thumbnail       TEXT,
      watched         INTEGER NOT NULL DEFAULT 0,
      watched_at      TEXT,
      UNIQUE(anime_id, episode_number)
    );

    -- Diary: one row per watch (rewatches accumulate)
    CREATE TABLE IF NOT EXISTS LogEntry (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      movie_id     INTEGER NOT NULL,
      watched_date TEXT    NOT NULL,
      note         TEXT,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- Watchlist
    CREATE TABLE IF NOT EXISTS WatchlistItem (
      movie_id   INTEGER NOT NULL,
      media_type TEXT    NOT NULL DEFAULT 'movie',
      added_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (movie_id, media_type)
    );

    -- Likes (local boolean flag — powers Suggested/Discover algorithms)
    CREATE TABLE IF NOT EXISTS Liked (
      movie_id   INTEGER NOT NULL,
      media_type TEXT    NOT NULL DEFAULT 'movie',
      liked_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (movie_id, media_type)
    );
  `);

  // Columns added after the initial release — CREATE TABLE IF NOT EXISTS above
  // won't retrofit these onto a database that already has the table.
  addColumnIfMissing('Movie', 'collection_id', 'INTEGER');
  addColumnIfMissing('Movie', 'collection_name', 'TEXT');
  addColumnIfMissing('LogEntry', 'note', 'TEXT');

  // media_type disambiguates movie_id vs. a Series tmdb_id. WatchlistItem and
  // Liked declare it inline (with a composite PK) in CREATE TABLE above;
  // LogEntry has no uniqueness constraint on movie_id, so it still needs the
  // retrofit for pre-existing databases.
  addColumnIfMissing('LogEntry', 'media_type', "TEXT NOT NULL DEFAULT 'movie'");

  // WatchlistItem/Liked gained media_type as part of their PRIMARY KEY, which
  // SQLite cannot ADD COLUMN onto an existing table. On a pre-existing
  // database (old shape: movie_id INTEGER PRIMARY KEY, no media_type column)
  // rebuild the table instead. No-op if the table doesn't exist yet (fresh
  // install — CREATE TABLE IF NOT EXISTS above already made the new shape)
  // or already has media_type (already migrated).
  migrateCompositeKeyTable(
    'WatchlistItem',
    `CREATE TABLE WatchlistItem_new (
      movie_id   INTEGER NOT NULL,
      media_type TEXT    NOT NULL DEFAULT 'movie',
      added_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (movie_id, media_type)
    );`,
    `INSERT INTO WatchlistItem_new (movie_id, media_type, added_at)
     SELECT movie_id, 'movie', added_at FROM WatchlistItem;`,
  );
  migrateCompositeKeyTable(
    'Liked',
    `CREATE TABLE Liked_new (
      movie_id   INTEGER NOT NULL,
      media_type TEXT    NOT NULL DEFAULT 'movie',
      liked_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (movie_id, media_type)
    );`,
    `INSERT INTO Liked_new (movie_id, media_type, liked_at)
     SELECT movie_id, 'movie', liked_at FROM Liked;`,
  );
}

function addColumnIfMissing(table: string, column: string, type: string): void {
  try {
    db.execSync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
  } catch {
    // Column already exists — ignore.
  }
}

/**
 * Rebuilds `table` into `table_new` (created fresh with the correct shape by
 * `createNewTableSql`, populated by `copyRowsSql`) if — and only if — `table`
 * currently exists with the OLD pre-media_type shape. Safe no-op otherwise
 * (table doesn't exist yet, or already has media_type).
 */
function migrateCompositeKeyTable(table: string, createNewTableSql: string, copyRowsSql: string): void {
  const columns = db.getAllSync<{ name: string }>(`PRAGMA table_info(${table});`);
  if (columns.length === 0) {
    // Table doesn't exist yet — CREATE TABLE IF NOT EXISTS above will have
    // created it fresh with the correct shape (or it hasn't run for some
    // other reason, in which case there's nothing to migrate).
    return;
  }
  const hasMediaType = columns.some((c) => c.name === 'media_type');
  if (hasMediaType) {
    // Already the new shape (created fresh, or previously migrated).
    return;
  }

  db.execSync(`
    ${createNewTableSql}
    ${copyRowsSql}
    DROP TABLE ${table};
    ALTER TABLE ${table}_new RENAME TO ${table};
  `);
}
