import { findSeedForMovie } from '@/constants/franchiseSeeds';
import { getCollection, getMovieBasic, type TmdbMovie, type TmdbMovieDetail } from '@/services/tmdb';

export interface FranchiseRow {
  title: string;
  movies: TmdbMovie[];
}

/**
 * Resolves the "Franchise & Collection Ordering" row for a movie's detail page.
 *
 * A curated shared-universe seed (see constants/franchiseSeeds.ts) takes
 * priority over the movie's own TMDB collection, because TMDB collections
 * are direct sequel chains only and don't span shared universes like the MCU.
 */
export async function getFranchiseRow(detail: TmdbMovieDetail): Promise<FranchiseRow | null> {
  const seed = findSeedForMovie(detail.id);
  if (seed) {
    const movies = await Promise.all(seed.movieIds.map((id) => getMovieBasic(id)));
    return { title: seed.name, movies };
  }

  if (detail.belongs_to_collection) {
    const movies = await getCollection(detail.belongs_to_collection.id);
    return { title: detail.belongs_to_collection.name, movies };
  }

  return null;
}
