import { posterUrl, backdropUrl, stillUrl, TMDB_IMAGE_BASE } from '@/constants/tokens';

describe('posterUrl / backdropUrl / stillUrl', () => {
  it('prepends TMDB_IMAGE_BASE to a TMDB path fragment', () => {
    expect(posterUrl('/abc.jpg', 'w342')).toBe(`${TMDB_IMAGE_BASE}/w342/abc.jpg`);
    expect(backdropUrl('/abc.jpg', 'w780')).toBe(`${TMDB_IMAGE_BASE}/w780/abc.jpg`);
    expect(stillUrl('/abc.jpg', 'w300')).toBe(`${TMDB_IMAGE_BASE}/w300/abc.jpg`);
  });

  it('passes through an already-absolute URL unchanged', () => {
    const url = 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/b21.jpg';
    expect(posterUrl(url)).toBe(url);
    expect(backdropUrl(url)).toBe(url);
    expect(stillUrl(url)).toBe(url);
  });

  it('returns null for null/undefined input', () => {
    expect(posterUrl(null)).toBeNull();
    expect(posterUrl(undefined)).toBeNull();
  });
});
