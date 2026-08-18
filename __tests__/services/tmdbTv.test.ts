import { searchSeries, getSeriesDetails, getSeasonDetails, firstAirYear } from '@/services/tmdbTv';

global.fetch = jest.fn();

function mockFetchOnce(body: any, ok = true) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok,
    status: ok ? 200 : 404,
    statusText: ok ? 'OK' : 'Not Found',
    json: () => Promise.resolve(body),
  });
}

describe('searchSeries', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls /search/tv with the query and returns results', async () => {
    mockFetchOnce({ results: [{ id: 1399, name: 'The Syndicate' }], total_pages: 1, total_results: 1 });

    const results = await searchSeries('syndicate');

    expect(results).toEqual([{ id: 1399, name: 'The Syndicate' }]);
    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('/search/tv');
    expect(calledUrl).toContain('query=syndicate');
  });
});

describe('getSeriesDetails', () => {
  beforeEach(() => jest.clearAllMocks());

  it('appends credits, similar, and recommendations', async () => {
    mockFetchOnce({ id: 1399, name: 'The Syndicate', seasons: [] });

    await getSeriesDetails(1399);

    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('/tv/1399');
    expect(calledUrl).toContain('append_to_response=credits%2Csimilar%2Crecommendations');
  });

  it('throws on a non-ok response', async () => {
    mockFetchOnce({}, false);
    await expect(getSeriesDetails(999999)).rejects.toThrow('TMDB /tv/999999 failed: 404 Not Found');
  });
});

describe('getSeasonDetails', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches a specific season', async () => {
    mockFetchOnce({ season_number: 1, name: 'Season 1', episodes: [] });

    await getSeasonDetails(1399, 1);

    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('/tv/1399/season/1');
  });
});

describe('firstAirYear', () => {
  it('extracts the year', () => {
    expect(firstAirYear('2022-03-04')).toBe(2022);
  });

  it('returns null for missing/invalid dates', () => {
    expect(firstAirYear(null)).toBeNull();
    expect(firstAirYear(undefined)).toBeNull();
    expect(firstAirYear('')).toBeNull();
  });
});
