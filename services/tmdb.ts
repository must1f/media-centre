import { Config } from '@/constants/config';

// ─── Types ────────────────────────────────────────────────────────────

export interface TmdbMovie {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path?: string | null;
  release_date: string; // 'YYYY-MM-DD'
  genre_ids: number[];
  genres?: TmdbGenre[];  // only present in movie detail calls
  overview: string;
  vote_average: number;
}

export interface TmdbMovieDetail extends TmdbMovie {
  genres: TmdbGenre[];
  runtime: number | null;
  credits: {
    cast: TmdbCastMember[];
  };
  similar?: { results: TmdbMovie[] };
  recommendations?: { results: TmdbMovie[] };
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

/** Text search. Returns up to 20 results per page. */
export async function searchMovies(query: string, page = 1): Promise<TmdbMovie[]> {
  const data = await get<TmdbListResponse<TmdbMovie>>('/search/movie', {
    query,
    page: String(page),
  });
  return data.results;
}

/** Weekly trending movies. */
export async function getTrending(): Promise<TmdbMovie[]> {
  const data = await get<TmdbListResponse<TmdbMovie>>('/trending/movie/week');
  return data.results;
}

/** Top-rated movies (used for "Top 10 This Week" row). */
export async function getTopRated(page = 1): Promise<TmdbMovie[]> {
  const data = await get<TmdbListResponse<TmdbMovie>>('/movie/top_rated', {
    page: String(page),
  });
  return data.results.slice(0, 10);
}

/** Full movie detail including credits. */
export async function getMovieDetails(tmdbId: number): Promise<TmdbMovieDetail> {
  return get<TmdbMovieDetail>(`/movie/${tmdbId}`, {
    append_to_response: 'credits,similar,recommendations',
  });
}

/** Movies similar to a given title. */
export async function getSimilar(tmdbId: number): Promise<TmdbMovie[]> {
  const data = await get<TmdbListResponse<TmdbMovie>>(`/movie/${tmdbId}/similar`);
  return data.results;
}

/** TMDB recommendations for a given title. */
export async function getRecommendations(tmdbId: number): Promise<TmdbMovie[]> {
  const data = await get<TmdbListResponse<TmdbMovie>>(`/movie/${tmdbId}/recommendations`);
  return data.results;
}

/** Discover movies filtered by genre id. */
export async function discoverByGenre(genreId: number, page = 1): Promise<TmdbMovie[]> {
  const data = await get<TmdbListResponse<TmdbMovie>>('/discover/movie', {
    with_genres: String(genreId),
    sort_by: 'popularity.desc',
    page: String(page),
  });
  return data.results;
}

/** Full list of movie genres from TMDB. */
export async function getGenres(): Promise<TmdbGenre[]> {
  const data = await get<{ genres: TmdbGenre[] }>('/genre/movie/list');
  return data.genres;
}

/** Extract release year from TMDB's date string. */
export function releaseYear(releaseDate: string | null | undefined): number | null {
  if (!releaseDate) return null;
  const y = parseInt(releaseDate.slice(0, 4), 10);
  return isNaN(y) ? null : y;
}
