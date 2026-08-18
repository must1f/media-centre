const mockExecSync = jest.fn();

jest.mock('@/db/client', () => ({
  __esModule: true,
  default: {
    execSync: (...args: any[]) => mockExecSync(...args),
  },
}));

import { initDatabase } from '@/db/schema';

describe('initDatabase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
