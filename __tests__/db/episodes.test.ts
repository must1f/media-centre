import {
  upsertEpisode,
  getEpisodesForSeason,
  setEpisodeWatched,
  getWatchedEpisodeCount,
  getTotalEpisodeCount,
} from '@/db/episodes';

const mockRunSync = jest.fn();
const mockGetFirstSync = jest.fn();
const mockGetAllSync = jest.fn();

jest.mock('@/db/client', () => ({
  __esModule: true,
  default: {
    runSync: (...args: any[]) => mockRunSync(...args),
    getFirstSync: (...args: any[]) => mockGetFirstSync(...args),
    getAllSync: (...args: any[]) => mockGetAllSync(...args),
  },
}));

describe('upsertEpisode', () => {
  beforeEach(() => jest.clearAllMocks());

  it('inserts/updates without touching watched state', () => {
    upsertEpisode({
      season_id: 7,
      series_id: 1399,
      episode_number: 4,
      name: 'The Reckoning',
      overview: 'Things escalate.',
      still_path: '/still.jpg',
      air_date: '2022-03-04',
      runtime: 42,
    });

    expect(mockRunSync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO Episode'),
      [7, 1399, 4, 'The Reckoning', 'Things escalate.', '/still.jpg', '2022-03-04', 42],
    );
    expect(mockRunSync.mock.calls[0][0]).not.toContain('watched');
  });
});

describe('setEpisodeWatched', () => {
  beforeEach(() => jest.clearAllMocks());

  it('marks watched with a timestamp', () => {
    setEpisodeWatched(42, true);
    expect(mockRunSync).toHaveBeenCalledWith(
      expect.stringContaining("SET watched = 1, watched_at = datetime('now')"),
      [42],
    );
  });

  it('marks unwatched and clears the timestamp', () => {
    setEpisodeWatched(42, false);
    expect(mockRunSync).toHaveBeenCalledWith(
      expect.stringContaining('SET watched = 0, watched_at = NULL'),
      [42],
    );
  });
});

describe('getWatchedEpisodeCount / getTotalEpisodeCount', () => {
  beforeEach(() => jest.clearAllMocks());

  it('counts watched episodes for a series', () => {
    mockGetFirstSync.mockReturnValue({ count: 12 });
    expect(getWatchedEpisodeCount(1399)).toBe(12);
    expect(mockGetFirstSync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE series_id = ? AND watched = 1'),
      [1399],
    );
  });

  it('counts total cached episodes for a series', () => {
    mockGetFirstSync.mockReturnValue({ count: 24 });
    expect(getTotalEpisodeCount(1399)).toBe(24);
  });
});
