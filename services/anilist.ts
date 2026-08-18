// ─── Types ────────────────────────────────────────────────────────────

export interface AniListTitle {
  romaji: string;
  english: string | null;
}

export interface AniListMedia {
  id: number;
  title: AniListTitle;
  coverImage: { large: string | null };
  startDate: { year: number | null };
  genres: string[];
  description: string | null;
  averageScore: number | null; // 0-100
  episodes: number | null;
  status: string; // FINISHED | RELEASING | NOT_YET_RELEASED | CANCELLED | HIATUS
}

export interface AniListCharacterEdge {
  role: string; // MAIN | SUPPORTING | BACKGROUND
  node: {
    id: number;
    name: { full: string };
    image: { medium: string | null };
  };
}

export interface AniListStreamingEpisode {
  title: string | null;
  thumbnail: string | null;
}

export interface AniListRelationNode {
  id: number;
  title: AniListTitle;
  coverImage: { large: string | null };
  startDate: { year: number | null };
  type: string; // ANIME | MANGA
}

export interface AniListMediaDetail extends AniListMedia {
  characters: { edges: AniListCharacterEdge[] };
  streamingEpisodes: AniListStreamingEpisode[];
  relations: { edges: { relationType: string; node: AniListRelationNode }[] };
  recommendations: { nodes: { mediaRecommendation: AniListRelationNode | null }[] };
}

// ─── Internal helpers ───────────────────────────────────────────────

const ANILIST_URL = 'https://graphql.anilist.co';

async function graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    throw new Error(`AniList request failed: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  if (json.errors) {
    throw new Error(`AniList request failed: ${json.errors[0]?.message ?? 'unknown error'}`);
  }
  return json.data as T;
}

const MEDIA_FIELDS = `
  id
  title { romaji english }
  coverImage { large }
  startDate { year }
  genres
  description(asHtml: false)
  averageScore
  episodes
  status
`;

// ─── Public API ─────────────────────────────────────────────────────

const SEARCH_QUERY = `
  query ($search: String, $page: Int) {
    Page(page: $page, perPage: 20) {
      media(search: $search, type: ANIME) {
        ${MEDIA_FIELDS}
      }
    }
  }
`;

/** Text search for anime. Returns up to 20 results per page. */
export async function searchAnime(query: string, page = 1): Promise<AniListMedia[]> {
  const data = await graphql<{ Page: { media: AniListMedia[] } }>(SEARCH_QUERY, { search: query, page });
  return data.Page.media;
}

const TRENDING_QUERY = `
  query ($page: Int) {
    Page(page: $page, perPage: 20) {
      media(sort: TRENDING_DESC, type: ANIME) {
        ${MEDIA_FIELDS}
      }
    }
  }
`;

/** Currently trending anime. */
export async function getTrendingAnime(): Promise<AniListMedia[]> {
  const data = await graphql<{ Page: { media: AniListMedia[] } }>(TRENDING_QUERY, { page: 1 });
  return data.Page.media;
}

const DETAIL_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      ${MEDIA_FIELDS}
      characters(perPage: 10, sort: ROLE) {
        edges { role node { id name { full } image { medium } } }
      }
      streamingEpisodes { title thumbnail }
      relations {
        edges {
          relationType(version: 2)
          node { id title { romaji english } coverImage { large } startDate { year } type }
        }
      }
      recommendations(perPage: 10, sort: RATING_DESC) {
        nodes { mediaRecommendation { id title { romaji english } coverImage { large } startDate { year } type } }
      }
    }
  }
`;

/** Full anime detail including characters, episode list, relations, and recommendations. */
export async function getAnimeDetails(id: number): Promise<AniListMediaDetail> {
  const data = await graphql<{ Media: AniListMediaDetail }>(DETAIL_QUERY, { id });
  return data.Media;
}

/**
 * Anime "similar to this" list: sequels/prequels/adaptations from `relations`
 * plus `recommendations`, ANIME-only, deduped by id, capped at 10.
 */
export function getSimilarAnime(detail: AniListMediaDetail): AniListRelationNode[] {
  const related = detail.relations.edges.filter((e) => e.node.type === 'ANIME').map((e) => e.node);
  const recommended = detail.recommendations.nodes
    .map((n) => n.mediaRecommendation)
    .filter((n): n is AniListRelationNode => !!n && n.type === 'ANIME');

  const seen = new Set<number>();
  const combined: AniListRelationNode[] = [];
  for (const node of [...related, ...recommended]) {
    if (!seen.has(node.id)) {
      seen.add(node.id);
      combined.push(node);
    }
  }
  return combined.slice(0, 10);
}

/** Prefer the English title, fall back to romaji. */
export function animeTitle(title: AniListTitle): string {
  return title.english ?? title.romaji;
}

/** Extract the start year. */
export function startYear(media: Pick<AniListMedia, 'startDate'>): number | null {
  return media.startDate.year ?? null;
}

/** Strip HTML tags AniList sometimes leaves in `description` (e.g. `<br>`). */
export function cleanDescription(text: string | null | undefined): string | null {
  if (!text) return null;
  const stripped = text.replace(/<[^>]+>/g, '').trim();
  return stripped || null;
}
