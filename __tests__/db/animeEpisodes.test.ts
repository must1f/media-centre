import {
  upsertAnimeEpisode,
  getEpisodesForAnime,
  setAnimeEpisodeWatched,
  getWatchedAnimeEpisodeCount,
  getTotalAnimeEpisodeCount,
} from '@/db/animeEpisodes';

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

describe('upsertAnimeEpisode', () => {
  beforeEach(() => jest.clearAllMocks());

  it('inserts/updates without touching watched state', () => {
    upsertAnimeEpisode({
      anime_id: 21,
      episode_number: 4,
      title: 'Episode 4',
      thumbnail: 'https://s4.anilist.co/file/anilistcdn/media/anime/thumb/ep4.jpg',
    });

    expect(mockRunSync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO AnimeEpisode'),
      [21, 4, 'Episode 4', 'https://s4.anilist.co/file/anilistcdn/media/anime/thumb/ep4.jpg'],
    );
    expect(mockRunSync.mock.calls[0][0]).not.toContain('watched');
  });
});

describe('setAnimeEpisodeWatched', () => {
  beforeEach(() => jest.clearAllMocks());

  it('marks watched with a timestamp', () => {
    setAnimeEpisodeWatched(42, true);
    expect(mockRunSync).toHaveBeenCalledWith(
      expect.stringContaining("SET watched = 1, watched_at = datetime('now')"),
      [42],
    );
  });

  it('marks unwatched and clears the timestamp', () => {
    setAnimeEpisodeWatched(42, false);
    expect(mockRunSync).toHaveBeenCalledWith(
      expect.stringContaining('SET watched = 0, watched_at = NULL'),
      [42],
    );
  });
});

describe('getEpisodesForAnime', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches all episodes for an anime, ordered by episode_number', () => {
    const sampleEpisodes = [
      { id: 1, anime_id: 21, episode_number: 1, title: 'Episode 1', thumbnail: null, watched: 0, watched_at: null },
      { id: 2, anime_id: 21, episode_number: 2, title: 'Episode 2', thumbnail: null, watched: 1, watched_at: '2023-06-15 10:30:00' },
    ];
    mockGetAllSync.mockReturnValue(sampleEpisodes);

    const result = getEpisodesForAnime(21);

    expect(result).toEqual(sampleEpisodes);
    expect(mockGetAllSync).toHaveBeenCalledWith(
      expect.stringContaining('SELECT * FROM AnimeEpisode WHERE anime_id = ?'),
      [21],
    );
    expect(mockGetAllSync.mock.calls[0][0]).toContain('ORDER BY episode_number ASC');
  });
});

describe('getWatchedAnimeEpisodeCount / getTotalAnimeEpisodeCount', () => {
  beforeEach(() => jest.clearAllMocks());

  it('counts watched episodes for an anime', () => {
    mockGetFirstSync.mockReturnValue({ count: 12 });
    expect(getWatchedAnimeEpisodeCount(21)).toBe(12);
    expect(mockGetFirstSync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE anime_id = ? AND watched = 1'),
      [21],
    );
  });

  it('counts total cached episodes for an anime', () => {
    mockGetFirstSync.mockReturnValue({ count: 24 });
    expect(getTotalAnimeEpisodeCount(21)).toBe(24);
    expect(mockGetFirstSync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE anime_id = ?'),
      [21],
    );
    expect(mockGetFirstSync.mock.calls[0][0]).not.toContain('watched');
  });
});
