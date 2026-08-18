import { getLikedIds } from '@/db/likes';
import { getAllLogEntries } from '@/db/logEntries';
import { getAllCachedMovies, getRatedMovies } from '@/db/movies';
import { discoverByGenre, getRecommendations, getTrending, type TmdbMovie } from './tmdb';

/**
 * "Suggested For You" — recommendations derived from the user's
 * highest-rated and liked movies, deduplicating already-logged titles.
 */
export async function getSuggestedForYou(): Promise<TmdbMovie[]> {
  const loggedIds = new Set(
    getAllLogEntries()
      .filter((e) => e.media_type === 'movie')
      .map((e) => e.movie_id),
  );

  // Seed from top-rated movies (rating >= 4) and liked movies
  const rated = getRatedMovies().filter((m) => (m.my_rating ?? 0) >= 4);
  const likedIds = getLikedIds('movie');
  const seedIds = [
    ...rated.map((m) => m.tmdb_id),
    ...likedIds,
  ].filter((id, i, arr) => arr.indexOf(id) === i); // dedupe

  if (seedIds.length === 0) {
    // No seeds yet — fall back to trending
    const trending = await getTrending();
    return trending.filter((m) => !loggedIds.has(m.id)).slice(0, 20);
  }

  // Fan out: fetch recommendations for up to 3 seed movies
  const seeds = seedIds.slice(0, 3);
  const results = await Promise.allSettled(seeds.map((id) => getRecommendations(id)));

  const seen = new Set<number>();
  const suggested: TmdbMovie[] = [];

  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    for (const movie of r.value) {
      if (!seen.has(movie.id) && !loggedIds.has(movie.id)) {
        seen.add(movie.id);
        suggested.push(movie);
      }
    }
  }

  return suggested.slice(0, 20);
}

/**
 * "Discover Something New" — deliberately biased toward genres the user
 * watches *less* often, to diversify rather than reinforce existing habits.
 */
export async function getDiscoverSomethingNew(): Promise<TmdbMovie[]> {
  const loggedIds = new Set(
    getAllLogEntries()
      .filter((e) => e.media_type === 'movie')
      .map((e) => e.movie_id),
  );
  const cachedMovies = getAllCachedMovies();

  // Tally genre frequency from cached movies that have been logged
  const genreCount: Record<number, number> = {};
  const loggedMovies = cachedMovies.filter((m) => loggedIds.has(m.tmdb_id));

  for (const movie of loggedMovies) {
    if (!movie.genres) continue;
    let genres: { id: number; name: string }[] = [];
    try {
      genres = JSON.parse(movie.genres);
    } catch {
      continue;
    }
    for (const g of genres) {
      genreCount[g.id] = (genreCount[g.id] ?? 0) + 1;
    }
  }

  // Fallback: no history yet
  const knownGenreIds = Object.keys(genreCount).map(Number);
  if (knownGenreIds.length === 0) {
    // Use a popular genre the user hasn't filtered by
    const FALLBACK_GENRE_ID = 878; // Science Fiction
    const results = await discoverByGenre(FALLBACK_GENRE_ID);
    return results.filter((m) => !loggedIds.has(m.id)).slice(0, 20);
  }

  // Pick the least-watched genre
  const sortedByFreq = knownGenreIds.sort((a, b) => (genreCount[a] ?? 0) - (genreCount[b] ?? 0));
  const underrepresentedGenreId = sortedByFreq[0];

  const results = await discoverByGenre(underrepresentedGenreId);
  return results.filter((m) => !loggedIds.has(m.id)).slice(0, 20);
}
