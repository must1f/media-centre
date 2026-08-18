import { Config } from '@/constants/config';

// ─── Types ────────────────────────────────────────────────────────────

export interface TmdbSeries {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path?: string | null;
  first_air_date: string; // 'YYYY-MM-DD'
  genre_ids: number[];
  genres?: TmdbGenre[];  // only present in series detail calls
  overview: string;
  vote_average: number;
}

export interface TmdbSeasonSummary {
  id: number;
  season_number: number;
  name: string;
  poster_path: string | null;
  episode_count: number;
}

export interface TmdbSeriesDetail extends TmdbSeries {
  genres: TmdbGenre[];
  number_of_seasons: number;
  number_of_episodes: number;
  status: string; // 'Returning Series' | 'Ended' | 'Canceled'
  seasons: TmdbSeasonSummary[];
  credits: {
    cast: TmdbCastMember[];
  };
  similar?: { results: TmdbSeries[] };
  recommendations?: { results: TmdbSeries[] };
}

export interface TmdbEpisode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string | null;
  runtime: number | null;
}

export interface TmdbSeasonDetail {
  season_number: number;
  name: string;
  episodes: TmdbEpisode[];
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

interface TmdbListResponse<T> {
  results: T[];
  total_pages: number;
  total_results: number;
}

// ─── Internal helpers ───────────────────────────────────────────────

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${Config.tmdbBaseUrl}${path}`);
  url.searchParams.set('api_key', Config.tmdbKey);
  url.searchParams.set('language', 'en-US');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`TMDB ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ─── Public API ─────────────────────────────────────────────────────

/** Text search for TV series. Returns up to 20 results per page. */
export async function searchSeries(query: string, page = 1): Promise<TmdbSeries[]> {
  const data = await get<TmdbListResponse<TmdbSeries>>('/search/tv', {
    query,
    page: String(page),
  });
  return data.results;
}

/** Weekly trending TV series. */
export async function getTrendingSeries(): Promise<TmdbSeries[]> {
  const data = await get<TmdbListResponse<TmdbSeries>>('/trending/tv/week');
  return data.results;
}

/** Full series detail including credits and season list. */
export async function getSeriesDetails(tmdbId: number): Promise<TmdbSeriesDetail> {
  return get<TmdbSeriesDetail>(`/tv/${tmdbId}`, {
    append_to_response: 'credits,similar,recommendations',
  });
}

/** Episode list for a single season. */
export async function getSeasonDetails(tmdbId: number, seasonNumber: number): Promise<TmdbSeasonDetail> {
  return get<TmdbSeasonDetail>(`/tv/${tmdbId}/season/${seasonNumber}`);
}

/** Series similar to a given show. */
export async function getSimilarSeries(tmdbId: number): Promise<TmdbSeries[]> {
  const data = await get<TmdbListResponse<TmdbSeries>>(`/tv/${tmdbId}/similar`);
  return data.results;
}

/** TMDB recommendations for a given show. */
export async function getSeriesRecommendations(tmdbId: number): Promise<TmdbSeries[]> {
  const data = await get<TmdbListResponse<TmdbSeries>>(`/tv/${tmdbId}/recommendations`);
  return data.results;
}

/** Extract first-air year from TMDB's date string. */
export function firstAirYear(date: string | null | undefined): number | null {
  if (!date) return null;
  const y = parseInt(date.slice(0, 4), 10);
  return isNaN(y) ? null : y;
}
