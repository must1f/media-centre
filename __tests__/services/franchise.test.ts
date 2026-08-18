import { getFranchiseRow } from '@/services/franchise';
import type { TmdbMovieDetail } from '@/services/tmdb';

const mockGetMovieBasic = jest.fn();
const mockGetCollection = jest.fn();

jest.mock('@/services/tmdb', () => ({
  getMovieBasic: (id: number) => mockGetMovieBasic(id),
  getCollection: (id: number) => mockGetCollection(id),
}));

function baseDetail(overrides: Partial<TmdbMovieDetail>): TmdbMovieDetail {
  return {
    id: 1726,
    title: 'Iron Man',
    poster_path: null,
    release_date: '2008-04-30',
    genre_ids: [],
    genres: [],
    overview: '',
    vote_average: 0,
    runtime: null,
    credits: { cast: [] },
    belongs_to_collection: null,
    ...overrides,
  };
}

describe('getFranchiseRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prefers a seed universe over the movie\'s own TMDB collection', async () => {
    const detail = baseDetail({
      id: 1726, // Iron Man — in the MCU seed
      belongs_to_collection: { id: 131296, name: 'Iron Man Collection' },
    });
    mockGetMovieBasic.mockResolvedValue({ id: 1726, title: 'Iron Man' });

    const row = await getFranchiseRow(detail);

    expect(row?.title).toBe('MCU');
    expect(mockGetCollection).not.toHaveBeenCalled();
    expect(mockGetMovieBasic).toHaveBeenCalled();
  });

  it('falls back to the TMDB collection when the movie matches no seed', async () => {
    const detail = baseDetail({
      id: 155, // The Dark Knight — not in any seed
      belongs_to_collection: { id: 263, name: 'The Dark Knight Collection' },
    });
    const mockMembers = [{ id: 155, title: 'The Dark Knight' }];
    mockGetCollection.mockResolvedValue(mockMembers);

    const row = await getFranchiseRow(detail);

    expect(row).toEqual({ title: 'The Dark Knight Collection', movies: mockMembers });
    expect(mockGetCollection).toHaveBeenCalledWith(263);
    expect(mockGetMovieBasic).not.toHaveBeenCalled();
  });

  it('returns null when the movie matches no seed and belongs to no collection', async () => {
    const detail = baseDetail({ id: 999, belongs_to_collection: null });

    const row = await getFranchiseRow(detail);

    expect(row).toBeNull();
    expect(mockGetCollection).not.toHaveBeenCalled();
    expect(mockGetMovieBasic).not.toHaveBeenCalled();
  });
});
