import { upsertSeries, type Series } from '@/db/series';
import { upsertSeason } from '@/db/seasons';
import {
  upsertEpisode,
  getEpisodesForSeason,
  setEpisodeWatched,
  getWatchedEpisodeCount,
  getTotalEpisodeCount,
  type Episode,
} from '@/db/episodes';
import { logWatch, getLogEntriesForMedia, getAllLogEntries, deleteLogEntry } from '@/db/logEntries';
import { addToWatchlist, isOnWatchlist, getWatchlistIds } from '@/db/watchlist';
import { likeMedia, isLiked, getLikedIds } from '@/db/likes';
import { computeYearStats } from '@/services/yearRecap';

// In-memory simulation state simulating SQLite tables (prefixed with mock for Jest scope access)
let mockEpisodesTable: Map<number, Episode> = new Map();
let mockLogEntriesTable: Array<{ id: number; movie_id: number; media_type: string; watched_date: string; note: string | null; created_at: string }> = [];
let mockWatchlistTable: Set<string> = new Set();
let mockLikedTable: Set<string> = new Set();

let mockNextEpisodeId = 1;
let mockNextLogId = 1;

// Mock database client to use our in-memory tables
jest.mock('@/db/client', () => ({
  __esModule: true,
  default: {
    runSync: (query: string, params: any[] = []) => {
      // Simulate Episode table updates
      if (query.includes('INSERT INTO Episode')) {
        const [season_id, series_id, episode_number, name, overview, still_path, air_date, runtime] = params;
        const existing = Array.from(mockEpisodesTable.values()).find(
          (e) => e.season_id === season_id && e.episode_number === episode_number
        );
        if (existing) {
          existing.name = name;
          existing.overview = overview;
          existing.still_path = still_path;
          existing.air_date = air_date;
          existing.runtime = runtime;
        } else {
          const id = mockNextEpisodeId++;
          mockEpisodesTable.set(id, {
            id,
            season_id,
            series_id,
            episode_number,
            name,
            overview,
            still_path,
            air_date,
            runtime,
            watched: 0,
            watched_at: null,
          });
        }
        return { lastInsertRowId: mockNextEpisodeId };
      }

      if (query.includes('UPDATE Episode SET watched = 1')) {
        const [episodeId] = params;
        const ep = mockEpisodesTable.get(episodeId);
        if (ep) {
          ep.watched = 1;
          ep.watched_at = new Date().toISOString();
        }
        return {};
      }

      if (query.includes('UPDATE Episode SET watched = 0')) {
        const [episodeId] = params;
        const ep = mockEpisodesTable.get(episodeId);
        if (ep) {
          ep.watched = 0;
          ep.watched_at = null;
        }
        return {};
      }

      // Simulate LogEntry table updates
      if (query.includes('INSERT INTO LogEntry')) {
        const [movie_id, media_type, watched_date, note] = params;
        const id = mockNextLogId++;
        mockLogEntriesTable.push({
          id,
          movie_id,
          media_type,
          watched_date,
          note,
          created_at: new Date().toISOString(),
        });
        return { lastInsertRowId: id };
      }

      if (query.includes('DELETE FROM LogEntry WHERE id = ?')) {
        const [id] = params;
        mockLogEntriesTable = mockLogEntriesTable.filter((l) => l.id !== id);
        return {};
      }

      // Simulate Watchlist
      if (query.includes('INSERT OR IGNORE INTO WatchlistItem')) {
        const [mediaId, mediaType] = params;
        mockWatchlistTable.add(`${mediaType}:${mediaId}`);
        return {};
      }

      // Simulate Likes
      if (query.includes('INSERT OR IGNORE INTO Liked')) {
        const [mediaId, mediaType] = params;
        mockLikedTable.add(`${mediaType}:${mediaId}`);
        return {};
      }

      return {};
    },

    getFirstSync: (query: string, params: any[] = []) => {
      if (query.includes('COUNT(*) AS count FROM Episode WHERE series_id = ? AND watched = 1')) {
        const [seriesId] = params;
        const count = Array.from(mockEpisodesTable.values()).filter(
          (e) => e.series_id === seriesId && e.watched === 1
        ).length;
        return { count };
      }

      if (query.includes('COUNT(*) AS count FROM Episode WHERE series_id = ?')) {
        const [seriesId] = params;
        const count = Array.from(mockEpisodesTable.values()).filter(
          (e) => e.series_id === seriesId
        ).length;
        return { count };
      }

      if (query.includes('SELECT movie_id FROM WatchlistItem WHERE movie_id = ? AND media_type = ?')) {
        const [mediaId, mediaType] = params;
        return mockWatchlistTable.has(`${mediaType}:${mediaId}`) ? { movie_id: mediaId } : null;
      }

      if (query.includes('SELECT movie_id FROM Liked WHERE movie_id = ? AND media_type = ?')) {
        const [mediaId, mediaType] = params;
        return mockLikedTable.has(`${mediaType}:${mediaId}`) ? { movie_id: mediaId } : null;
      }

      return null;
    },

    getAllSync: (query: string, params: any[] = []) => {
      if (query.includes('SELECT * FROM Episode WHERE season_id = ?')) {
        const [seasonId] = params;
        return Array.from(mockEpisodesTable.values())
          .filter((e) => e.season_id === seasonId)
          .sort((a, b) => a.episode_number - b.episode_number);
      }

      if (query.includes('SELECT * FROM LogEntry WHERE movie_id = ? AND media_type = ?')) {
        const [mediaId, mediaType] = params;
        return mockLogEntriesTable.filter((l) => l.movie_id === mediaId && l.media_type === mediaType);
      }

      if (query.includes('SELECT * FROM LogEntry')) {
        return [...mockLogEntriesTable];
      }

      if (query.includes('SELECT movie_id FROM WatchlistItem WHERE media_type = ?')) {
        const [mediaType] = params;
        const prefix = `${mediaType}:`;
        return Array.from(mockWatchlistTable)
          .filter((k) => k.startsWith(prefix))
          .map((k) => ({ movie_id: parseInt(k.slice(prefix.length), 10) }));
      }

      if (query.includes('SELECT movie_id FROM Liked WHERE media_type = ?')) {
        const [mediaType] = params;
        const prefix = `${mediaType}:`;
        return Array.from(mockLikedTable)
          .filter((k) => k.startsWith(prefix))
          .map((k) => ({ movie_id: parseInt(k.slice(prefix.length), 10) }));
      }

      return [];
    },
  },
}));

describe('Series & Episode Full Workflow Simulation', () => {
  beforeEach(() => {
    mockEpisodesTable.clear();
    mockLogEntriesTable = [];
    mockWatchlistTable.clear();
    mockLikedTable.clear();
    mockNextEpisodeId = 1;
    mockNextLogId = 1;
  });

  it('simulates searching, adding, tracking episodes, watchlist, likes, and year recap', () => {
    // 1. User selects a TV show: "Severance" (TMDB ID: 93405)
    const seriesId = 93405;
    const seasonId = 101;

    // 2. Mock populating Season 1 with 9 episodes
    for (let i = 1; i <= 9; i++) {
      upsertEpisode({
        season_id: seasonId,
        series_id: seriesId,
        episode_number: i,
        name: `Episode ${i}`,
        overview: `Overview for episode ${i}`,
        still_path: `/ep${i}.jpg`,
        air_date: `2022-02-${10 + i}`,
        runtime: 50,
      });
    }

    const cachedEpisodes = getEpisodesForSeason(seasonId);
    expect(cachedEpisodes).toHaveLength(9);
    expect(getTotalEpisodeCount(seriesId)).toBe(9);
    expect(getWatchedEpisodeCount(seriesId)).toBe(0);

    // 3. User watches Episode 1
    const ep1 = cachedEpisodes[0];
    setEpisodeWatched(ep1.id, true);
    logWatch(seriesId, 'series', '2026-08-18', 'S01E01 - Mind-blowing premiere!');

    let watchedCount = getWatchedEpisodeCount(seriesId);
    let progress = Math.round((watchedCount / cachedEpisodes.length) * 100);
    expect(watchedCount).toBe(1);
    expect(progress).toBe(11);

    // 4. User binge watches Episode 2, 3, and 4
    const ep2 = cachedEpisodes[1];
    const ep3 = cachedEpisodes[2];
    const ep4 = cachedEpisodes[3];
    setEpisodeWatched(ep2.id, true);
    logWatch(seriesId, 'series', '2026-08-18', 'S01E02');
    setEpisodeWatched(ep3.id, true);
    logWatch(seriesId, 'series', '2026-08-18', 'S01E03');
    setEpisodeWatched(ep4.id, true);
    logWatch(seriesId, 'series', '2026-08-18', 'S01E04');

    watchedCount = getWatchedEpisodeCount(seriesId);
    progress = Math.round((watchedCount / cachedEpisodes.length) * 100);
    expect(watchedCount).toBe(4);
    expect(progress).toBe(44);

    // 5. User adds show to Watchlist and Likes it
    addToWatchlist(seriesId, 'series');
    likeMedia(seriesId, 'series');
    expect(isOnWatchlist(seriesId, 'series')).toBe(true);
    expect(isLiked(seriesId, 'series')).toBe(true);
    expect(getWatchlistIds('series')).toContain(seriesId);
    expect(getLikedIds('series')).toContain(seriesId);

    // 6. User accidental mark correction: unmarks Episode 4
    setEpisodeWatched(ep4.id, false);
    const seriesLogs = getLogEntriesForMedia(seriesId, 'series');
    const ep4Log = seriesLogs.find((l) => l.note === 'S01E04');
    if (ep4Log) {
      deleteLogEntry(ep4Log.id);
    }

    watchedCount = getWatchedEpisodeCount(seriesId);
    progress = Math.round((watchedCount / cachedEpisodes.length) * 100);
    expect(watchedCount).toBe(3);
    expect(progress).toBe(33);

    // 7. Verify Year Recap calculation includes both movies and series watches
    const allLogs: any[] = getAllLogEntries();
    expect(allLogs).toHaveLength(3); // 3 episodes logged

    const stats = computeYearStats(allLogs, [], 2026, [
      {
        tmdb_id: seriesId,
        title: 'Severance',
        poster_path: '/sev.jpg',
        dominant_color: null,
        first_air_year: 2022,
        genres: JSON.stringify([{ id: 18, name: 'Drama' }, { id: 9648, name: 'Mystery' }]),
        overview: 'Mark leads a team of office workers...',
        my_rating: 5.0,
        my_review: 'Masterpiece',
        rating_updated_at: '2026-08-18',
      },
    ]);

    expect(stats.totalWatched).toBe(3);
    expect(stats.uniqueTitles).toBe(1);
    expect(stats.topGenre).toEqual({ name: 'Drama', count: 3 });
  });
});
