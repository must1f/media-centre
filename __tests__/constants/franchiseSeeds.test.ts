import { FRANCHISE_SEEDS, findSeedForMovie } from '@/constants/franchiseSeeds';

describe('findSeedForMovie', () => {
  it('finds the MCU seed for a movie id in that universe', () => {
    const seed = findSeedForMovie(1726); // Iron Man
    expect(seed?.name).toBe('MCU');
  });

  it('finds the Transformers seed for a movie id in that universe', () => {
    const seed = findSeedForMovie(1858); // Transformers (2007)
    expect(seed?.name).toBe('Transformers');
  });

  it('returns null for a movie id in no seed universe', () => {
    expect(findSeedForMovie(-1)).toBeNull();
  });

  it('every seed has at least two movies, in ascending id-order-independent watch order', () => {
    for (const seed of FRANCHISE_SEEDS) {
      expect(seed.movieIds.length).toBeGreaterThanOrEqual(2);
      expect(new Set(seed.movieIds).size).toBe(seed.movieIds.length);
    }
  });
});
