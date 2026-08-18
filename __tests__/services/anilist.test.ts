import {
  searchAnime,
  getTrendingAnime,
  getAnimeDetails,
  getSimilarAnime,
  animeTitle,
  startYear,
  cleanDescription,
  type AniListMediaDetail,
} from '@/services/anilist';

global.fetch = jest.fn();

function mockFetchOnce(body: any, ok = true) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok,
    status: ok ? 200 : 404,
    statusText: ok ? 'OK' : 'Not Found',
    json: () => Promise.resolve(body),
  });
}

describe('searchAnime', () => {
  beforeEach(() => jest.clearAllMocks());

  it('posts a GraphQL search query and returns the media list', async () => {
    mockFetchOnce({ data: { Page: { media: [{ id: 21, title: { romaji: 'One Piece', english: null } }] } } });

    const results = await searchAnime('one piece');

    expect(results).toEqual([{ id: 21, title: { romaji: 'One Piece', english: null } }]);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://graphql.anilist.co');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    expect(body.variables).toEqual({ search: 'one piece', page: 1 });
    expect(body.query).toContain('media(search: $search, type: ANIME)');
  });

  it('throws on a non-ok response', async () => {
    mockFetchOnce({}, false);
    await expect(searchAnime('x')).rejects.toThrow('AniList request failed: 404 Not Found');
  });

  it('throws on a GraphQL errors payload', async () => {
    mockFetchOnce({ errors: [{ message: 'Invalid page' }] });
    await expect(searchAnime('x')).rejects.toThrow('AniList request failed: Invalid page');
  });
});

describe('getTrendingAnime', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sorts by TRENDING_DESC', async () => {
    mockFetchOnce({ data: { Page: { media: [] } } });
    await getTrendingAnime();
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.query).toContain('sort: TRENDING_DESC');
  });
});

describe('getAnimeDetails', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches a single Media by id with type ANIME', async () => {
    mockFetchOnce({ data: { Media: { id: 21, title: { romaji: 'One Piece', english: null }, relations: { edges: [] }, recommendations: { nodes: [] }, streamingEpisodes: [] } } });
    const detail = await getAnimeDetails(21);
    expect(detail.id).toBe(21);
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.variables).toEqual({ id: 21 });
    expect(body.query).toContain('Media(id: $id, type: ANIME)');
  });
});

describe('getSimilarAnime', () => {
  it('combines relations and recommendations, ANIME-only, deduped, capped at 10', () => {
    const detail = {
      relations: {
        edges: [
          { relationType: 'SEQUEL', node: { id: 1, title: { romaji: 'A', english: null }, coverImage: { large: null }, startDate: { year: null }, type: 'ANIME' } },
          { relationType: 'ADAPTATION', node: { id: 2, title: { romaji: 'Manga', english: null }, coverImage: { large: null }, startDate: { year: null }, type: 'MANGA' } },
        ],
      },
      recommendations: {
        nodes: [
          { mediaRecommendation: { id: 1, title: { romaji: 'A', english: null }, coverImage: { large: null }, startDate: { year: null }, type: 'ANIME' } },
          { mediaRecommendation: { id: 3, title: { romaji: 'B', english: null }, coverImage: { large: null }, startDate: { year: null }, type: 'ANIME' } },
        ],
      },
    } as unknown as AniListMediaDetail;

    const result = getSimilarAnime(detail);
    expect(result.map((n) => n.id)).toEqual([1, 3]);
  });
});

describe('animeTitle', () => {
  it('prefers english, falls back to romaji', () => {
    expect(animeTitle({ romaji: 'Kimetsu no Yaiba', english: 'Demon Slayer' })).toBe('Demon Slayer');
    expect(animeTitle({ romaji: 'Kimetsu no Yaiba', english: null })).toBe('Kimetsu no Yaiba');
  });
});

describe('startYear', () => {
  it('extracts the year', () => {
    expect(startYear({ startDate: { year: 1999 } })).toBe(1999);
    expect(startYear({ startDate: { year: null } })).toBeNull();
  });
});

describe('cleanDescription', () => {
  it('strips HTML tags', () => {
    expect(cleanDescription('A pirate<br>adventure.')).toBe('A pirateadventure.');
  });

  it('returns null for null/empty input', () => {
    expect(cleanDescription(null)).toBeNull();
    expect(cleanDescription('   ')).toBeNull();
  });
});
