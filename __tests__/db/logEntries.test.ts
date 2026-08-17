import { setRating, type Movie } from '@/db/movies';

// Mock client database singleton
const mockRunSync = jest.fn();
const mockGetFirstSync = jest.fn();

jest.mock('@/db/client', () => ({
  __esModule: true,
  default: {
    runSync: (...args: any[]) => mockRunSync(...args),
    getFirstSync: (...args: any[]) => mockGetFirstSync(...args),
  },
}));

describe('setRating overwrite guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should write rating if there is no existing review', () => {
    // Mock getMovie to return null (no existing movie metadata in DB yet)
    mockGetFirstSync.mockReturnValue(null);

    const result = setRating(123, 4.5, 'Great movie!', false);
    
    expect(result).toBe(true);
    expect(mockRunSync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE Movie'),
      [4.5, 'Great movie!', 123]
    );
  });

  it('should block writing rating if there is an existing review and forceOverwrite is false', () => {
    const existingMovie: Movie = {
      tmdb_id: 123,
      title: 'Test Movie',
      poster_path: null,
      dominant_color: null,
      release_year: 2026,
      genres: null,
      overview: 'Overview',
      my_rating: 4.0,
      my_review: 'Original review text',
      rating_updated_at: '2026-08-17',
    };
    mockGetFirstSync.mockReturnValue(existingMovie);

    // Try to update with a DIFFERENT review, but forceOverwrite = false
    const result = setRating(123, 4.5, 'New review text!', false);

    expect(result).toBe(false);
    expect(mockRunSync).not.toHaveBeenCalled();
  });

  it('should write rating if there is an existing review but forceOverwrite is true', () => {
    const existingMovie: Movie = {
      tmdb_id: 123,
      title: 'Test Movie',
      poster_path: null,
      dominant_color: null,
      release_year: 2026,
      genres: null,
      overview: 'Overview',
      my_rating: 4.0,
      my_review: 'Original review text',
      rating_updated_at: '2026-08-17',
    };
    mockGetFirstSync.mockReturnValue(existingMovie);

    // Try to update with a DIFFERENT review, and forceOverwrite = true
    const result = setRating(123, 4.5, 'New review text!', true);

    expect(result).toBe(true);
    expect(mockRunSync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE Movie'),
      [4.5, 'New review text!', 123]
    );
  });

  it('should write rating if the review has not changed', () => {
    const existingMovie: Movie = {
      tmdb_id: 123,
      title: 'Test Movie',
      poster_path: null,
      dominant_color: null,
      release_year: 2026,
      genres: null,
      overview: 'Overview',
      my_rating: 4.0,
      my_review: 'Original review text',
      rating_updated_at: '2026-08-17',
    };
    mockGetFirstSync.mockReturnValue(existingMovie);

    // Update with the same review, forceOverwrite = false
    const result = setRating(123, 4.5, 'Original review text', false);

    expect(result).toBe(true);
    expect(mockRunSync).toHaveBeenCalled();
  });
});
