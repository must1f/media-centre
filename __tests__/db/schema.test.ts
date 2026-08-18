const mockExecSync = jest.fn();
const mockGetAllSync = jest.fn();

jest.mock('@/db/client', () => ({
  __esModule: true,
  default: {
    execSync: (...args: any[]) => mockExecSync(...args),
    getAllSync: (...args: any[]) => mockGetAllSync(...args),
  },
}));

import { initDatabase } from '@/db/schema';

describe('initDatabase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: PRAGMA table_info returns the new shape (has media_type) for
    // every table, so the rebuild migration is a no-op unless a test
    // overrides this.
    mockGetAllSync.mockReturnValue([{ name: 'movie_id' }, { name: 'media_type' }, { name: 'added_at' }]);
  });

  it('creates the Series, Season, and Episode tables', () => {
    initDatabase();
    const sql = mockExecSync.mock.calls[0][0];
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS Series');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS Season');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS Episode');
  });

  it('adds a media_type column to LogEntry only (WatchlistItem/Liked declare it inline)', () => {
    initDatabase();
    const alterCalls = mockExecSync.mock.calls.slice(1).map((c) => c[0]);
    expect(alterCalls).toContainEqual(expect.stringContaining('ALTER TABLE LogEntry ADD COLUMN media_type'));
    expect(alterCalls).not.toContainEqual(expect.stringContaining('ALTER TABLE WatchlistItem ADD COLUMN media_type'));
    expect(alterCalls).not.toContainEqual(expect.stringContaining('ALTER TABLE Liked ADD COLUMN media_type'));
  });

  it('declares a composite primary key (movie_id, media_type) on WatchlistItem and Liked', () => {
    initDatabase();
    const sql = mockExecSync.mock.calls[0][0];
    const watchlistTable = sql.slice(sql.indexOf('CREATE TABLE IF NOT EXISTS WatchlistItem'));
    const likedTable = sql.slice(sql.indexOf('CREATE TABLE IF NOT EXISTS Liked'));
    expect(watchlistTable).toContain('PRIMARY KEY (movie_id, media_type)');
    expect(likedTable).toContain('PRIMARY KEY (movie_id, media_type)');
  });

  it('rebuilds WatchlistItem and Liked when PRAGMA table_info shows the old pre-media_type shape', () => {
    // Old shape: table exists, but has no media_type column.
    mockGetAllSync.mockReturnValue([{ name: 'movie_id' }, { name: 'added_at' }]);

    initDatabase();

    const execCalls = mockExecSync.mock.calls.map((c) => c[0]);
    const watchlistRebuild = execCalls.find(
      (sql) => sql.includes('CREATE TABLE WatchlistItem_new') && sql.includes('DROP TABLE WatchlistItem'),
    );
    expect(watchlistRebuild).toBeDefined();
    expect(watchlistRebuild).toContain("SELECT movie_id, 'movie', added_at FROM WatchlistItem");
    expect(watchlistRebuild).toContain('ALTER TABLE WatchlistItem_new RENAME TO WatchlistItem');

    const likedRebuild = execCalls.find(
      (sql) => sql.includes('CREATE TABLE Liked_new') && sql.includes('DROP TABLE Liked'),
    );
    expect(likedRebuild).toBeDefined();
    expect(likedRebuild).toContain("SELECT movie_id, 'movie', liked_at FROM Liked");
    expect(likedRebuild).toContain('ALTER TABLE Liked_new RENAME TO Liked');
  });

  it('does not rebuild WatchlistItem/Liked when media_type is already present', () => {
    // Default beforeEach mock already reports the new shape.
    initDatabase();

    const execCalls = mockExecSync.mock.calls.map((c) => c[0]);
    expect(execCalls.some((sql) => sql.includes('CREATE TABLE WatchlistItem_new'))).toBe(false);
    expect(execCalls.some((sql) => sql.includes('CREATE TABLE Liked_new'))).toBe(false);
  });

  it('does not rebuild WatchlistItem/Liked when the table does not exist yet (fresh install)', () => {
    mockGetAllSync.mockReturnValue([]);

    initDatabase();

    const execCalls = mockExecSync.mock.calls.map((c) => c[0]);
    expect(execCalls.some((sql) => sql.includes('CREATE TABLE WatchlistItem_new'))).toBe(false);
    expect(execCalls.some((sql) => sql.includes('CREATE TABLE Liked_new'))).toBe(false);
  });
});
