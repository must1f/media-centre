import { getSuggestedForYou, getDiscoverSomethingNew } from '@/services/recommendations';

// Mock DB modules
const mockGetLikedMovieIds = jest.fn();
const mockGetAllLogEntries = jest.fn();
const mockGetRatedMovies = jest.fn();
const mockGetAllCachedMovies = jest.fn();

jest.mock('@/db/likes', () => ({
  getLikedMovieIds: () => mockGetLikedMovieIds(),
}));
jest.mock('@/db/logEntries', () => ({
  getAllLogEntries: () => mockGetAllLogEntries(),
}));
jest.mock('@/db/movies', () => ({
  getRatedMovies: () => mockGetRatedMovies(),
  getAllCachedMovies: () => mockGetAllCachedMovies(),
}));

// Mock TMDB API module
const mockGetTrending = jest.fn();
const mockGetRecommendations = jest.fn();
const mockDiscoverByGenre = jest.fn();

jest.mock('@/services/tmdb', () => ({
  getTrending: () => mockGetTrending(),
  getRecommendations: (id: number) => mockGetRecommendations(id),
  discoverByGenre: (genreId: number) => mockDiscoverByGenre(genreId),
}));

describe('Recommendation logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSuggestedForYou', () => {
    it('should return trending movies if there are no seeds (no rated or liked movies)', async () => {
      mockGetAllLogEntries.mockReturnValue([]);
      mockGetRatedMovies.mockReturnValue([]);
      mockGetLikedMovieIds.mockReturnValue([]);
      
      const mockTrending = [
        { id: 101, title: 'Trending 1', poster_path: '/p1.jpg', release_date: '2026-01-01' },
        { id: 102, title: 'Trending 2', poster_path: '/p2.jpg', release_date: '2026-01-02' },
      ];
      mockGetTrending.mockResolvedValue(mockTrending);

      const results = await getSuggestedForYou();
      
      expect(results).toEqual(mockTrending);
      expect(mockGetTrending).toHaveBeenCalled();
    });

    it('should call getRecommendations with seed IDs and exclude already watched movies', async () => {
      // 101 is already logged (watched)
      mockGetAllLogEntries.mockReturnValue([{ movie_id: 101, watched_date: '2026-08-17' }]);
      // 102 is highly rated (seed)
      mockGetRatedMovies.mockReturnValue([{ tmdb_id: 102, my_rating: 5.0 }]);
      mockGetLikedMovieIds.mockReturnValue([]);

      const mockRecommendations = [
        { id: 101, title: 'Watched Movie' }, // should be filtered out
        { id: 103, title: 'Recommended Movie' },
      ];
      mockGetRecommendations.mockResolvedValue(mockRecommendations);

      const results = await getSuggestedForYou();

      expect(mockGetRecommendations).toHaveBeenCalledWith(102);
      expect(results).toEqual([{ id: 103, title: 'Recommended Movie' }]);
    });
  });

  describe('getDiscoverSomethingNew', () => {
    it('should select the least-watched genre and discover movies', async () => {
      mockGetAllLogEntries.mockReturnValue([
        { movie_id: 1, watched_date: '2026-08-17' },
        { movie_id: 2, watched_date: '2026-08-17' },
        { movie_id: 3, watched_date: '2026-08-17' },
      ]);

      // User has watched: 2 Action films and 1 Comedy film
      mockGetAllCachedMovies.mockReturnValue([
        { tmdb_id: 1, genres: JSON.stringify([{ id: 28, name: 'Action' }]) },
        { tmdb_id: 2, genres: JSON.stringify([{ id: 28, name: 'Action' }]) },
        { tmdb_id: 3, genres: JSON.stringify([{ id: 35, name: 'Comedy' }]) },
      ]);

      const mockDiscovered = [
        { id: 201, title: 'Discover 1' },
      ];
      mockDiscoverByGenre.mockResolvedValue(mockDiscovered);

      const results = await getDiscoverSomethingNew();

      // Comedy (35) is the underrepresented genre (watched 1 time vs Action watched 2 times)
      expect(mockDiscoverByGenre).toHaveBeenCalledWith(35);
      expect(results).toEqual(mockDiscovered);
    });
  });
});
