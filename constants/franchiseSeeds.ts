/**
 * Hand-curated cross-collection shared-universe watch orders.
 *
 * TMDB's own `belongs_to_collection` groups movies into direct sequel
 * chains only (e.g. separate "Iron Man Collection" / "Avengers Collection"),
 * with no single collection spanning a shared universe. This bundled,
 * manually-maintained list fills that gap for a deliberately small set of
 * well-known universes. It is not a general-purpose franchise database and
 * is not expected to be exhaustive — see the Phase 1 spec's "Franchise &
 * Collection Ordering" section for the full rationale.
 *
 * Movie ids are TMDB ids, verified against the live TMDB API, ordered by
 * release date (the intended watch order).
 */

export interface FranchiseSeed {
  name: string;
  movieIds: number[];
}

export const FRANCHISE_SEEDS: FranchiseSeed[] = [
  {
    name: 'MCU',
    movieIds: [
      1726,   // Iron Man (2008)
      1724,   // The Incredible Hulk (2008)
      10138,  // Iron Man 2 (2010)
      10195,  // Thor (2011)
      1771,   // Captain America: The First Avenger (2011)
      24428,  // The Avengers (2012)
      68721,  // Iron Man 3 (2013)
      76338,  // Thor: The Dark World (2013)
      100402, // Captain America: The Winter Soldier (2014)
      118340, // Guardians of the Galaxy (2014)
      99861,  // Avengers: Age of Ultron (2015)
      102899, // Ant-Man (2015)
      271110, // Captain America: Civil War (2016)
      284052, // Doctor Strange (2016)
      283995, // Guardians of the Galaxy Vol. 2 (2017)
      315635, // Spider-Man: Homecoming (2017)
      284053, // Thor: Ragnarok (2017)
      284054, // Black Panther (2018)
      299536, // Avengers: Infinity War (2018)
      363088, // Ant-Man and the Wasp (2018)
      299537, // Captain Marvel (2019)
      299534, // Avengers: Endgame (2019)
      429617, // Spider-Man: Far From Home (2019)
    ],
  },
  {
    name: 'Transformers',
    movieIds: [
      1858,   // Transformers (2007)
      8373,   // Transformers: Revenge of the Fallen (2009)
      38356,  // Transformers: Dark of the Moon (2011)
      91314,  // Transformers: Age of Extinction (2014)
      335988, // Transformers: The Last Knight (2017)
      424783, // Bumblebee (2018)
      667538, // Transformers: Rise of the Beasts (2023)
    ],
  },
];

/** Finds the seed universe (if any) a given TMDB movie id belongs to. */
export function findSeedForMovie(tmdbId: number): FranchiseSeed | null {
  return FRANCHISE_SEEDS.find((seed) => seed.movieIds.includes(tmdbId)) ?? null;
}
