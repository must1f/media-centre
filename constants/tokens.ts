/**
 * Design tokens — single source of truth for all visual values.
 * Inspired by Apple HIG / iOS 18 design language.
 */

// ─── Spacing (Apple 4/8pt Grid) ──────────────────────────────────
export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  section: 28,
} as const;

// ─── Corner Radii (Smooth Squircles) ──────────────────────────────
export const Radius = {
  small: 8,     // small tags, chips, mini-badges
  medium: 12,   // search bars, buttons, list rows
  card: 16,     // posters, feed items, content cards
  large: 22,    // hero banners, bottom sheets, dialogs
  pill: 999,    // full pill capsule buttons, search inputs
} as const;

// ─── Typography (Apple Dynamic Type Scale) ──────────────────────
export const FontSize = {
  largeTitle: 34,
  title1: 28,
  title: 28,     // backwards compat alias for title1
  title2: 22,
  title3: 20,
  headline: 17,
  body: 17,
  callout: 16,
  subheadline: 15,
  footnote: 13,
  caption: 12,
  caption1: 12,
  caption2: 11,
} as const;

export const FontWeight = {
  heavy: '800' as const,
  bold: '700' as const,
  semibold: '600' as const,
  medium: '500' as const,
  regular: '400' as const,
};

// ─── Semantic Color Tokens ──────────────────────────────────────────
export type ColorScheme = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  secondaryBackground: string;
  tertiaryBackground: string;
  surfaceGlass: string;
  surfaceGlassHigh: string;
  label: string;
  secondaryLabel: string;
  tertiaryLabel: string;
  quaternaryLabel: string;
  accent: string;              // Active tab, buttons, key highlights (default: Cinematic Crimson)
  accentGlow: string;          // Ambient glow for buttons and focus states
  starGold: string;            // Rating star gold
  separator: string;
  borderHighlight: string;
  tabBarBackground: string;
  searchBarBackground: string;
  cardShadow: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
}

/** Default accent — Cinematic Crimson from Google Stitch CineVault. */
export const DEFAULT_ACCENT = '#E50914';

const lightColors: ThemeColors = {
  background: '#F8F8F9',
  secondaryBackground: '#FFFFFF',
  tertiaryBackground: '#EEEEF2',
  surfaceGlass: 'rgba(255, 255, 255, 0.82)',
  surfaceGlassHigh: 'rgba(255, 255, 255, 0.94)',
  label: '#111113',
  secondaryLabel: '#66666E',
  tertiaryLabel: '#8E8E93',
  quaternaryLabel: 'rgba(0, 0, 0, 0.08)',
  accent: DEFAULT_ACCENT,
  accentGlow: 'rgba(229, 9, 20, 0.25)',
  starGold: '#FFD60A',
  separator: 'rgba(0, 0, 0, 0.06)',
  borderHighlight: 'rgba(0, 0, 0, 0.06)',
  tabBarBackground: 'rgba(255, 255, 255, 0.85)',
  searchBarBackground: 'rgba(0, 0, 0, 0.05)',
  cardShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
};

const darkColors: ThemeColors = {
  background: '#131313',          // Stitch Obsidian Base
  secondaryBackground: '#201F1F', // Stitch Charcoal Surface Container
  tertiaryBackground: '#2A2A2A',  // Stitch Surface High
  surfaceGlass: 'rgba(32, 31, 31, 0.75)',
  surfaceGlassHigh: 'rgba(42, 42, 42, 0.85)',
  label: '#E5E2E1',               // Stitch Pure On-Surface
  secondaryLabel: '#A0A0A0',
  tertiaryLabel: '#6E6E6E',
  quaternaryLabel: 'rgba(255, 255, 255, 0.12)',
  accent: DEFAULT_ACCENT,
  accentGlow: 'rgba(229, 9, 20, 0.40)',
  starGold: '#FFD60A',
  separator: 'rgba(255, 255, 255, 0.08)',
  borderHighlight: 'rgba(255, 255, 255, 0.08)',
  tabBarBackground: 'rgba(20, 19, 19, 0.85)',
  searchBarBackground: 'rgba(255, 255, 255, 0.06)',
  cardShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 6,
  },
};

export const Colors: Record<ColorScheme, ThemeColors> = {
  light: lightColors,
  dark: darkColors,
};

// TMDB image base URLs (runtime values come from .env via process.env)
export const TMDB_IMAGE_BASE = process.env.EXPO_PUBLIC_TMDB_IMAGE_BASE_URL ?? 'https://image.tmdb.org/t/p';

/** Build a full TMDB poster URL. Size: 'w185' | 'w342' | 'w500' | 'w780' | 'original' */
export function posterUrl(posterPath: string | null | undefined, size: string = 'w342'): string | null {
  if (!posterPath) return null;
  return `${TMDB_IMAGE_BASE}/${size}${posterPath}`;
}

/** Build a full TMDB backdrop URL. Size: 'w300' | 'w780' | 'w1280' | 'original' */
export function backdropUrl(backdropPath: string | null | undefined, size: string = 'w780'): string | null {
  if (!backdropPath) return null;
  return `${TMDB_IMAGE_BASE}/${size}${backdropPath}`;
}
