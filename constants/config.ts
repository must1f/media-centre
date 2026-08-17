/** Centralised access to environment variables. */
export const Config = {
  tmdbBaseUrl: process.env.EXPO_PUBLIC_TMDB_BASE_URL ?? 'https://api.themoviedb.org/3',
  tmdbKey: process.env.EXPO_PUBLIC_TMDB_KEY ?? '',
  tmdbImageBase: process.env.EXPO_PUBLIC_TMDB_IMAGE_BASE_URL ?? 'https://image.tmdb.org/t/p',
} as const;
