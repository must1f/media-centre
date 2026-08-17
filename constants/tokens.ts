/**
 * Design tokens — single source of truth for all visual values.
 * Components reference tokens; never use hardcoded hex/pt values in components.
 */

// ─── Spacing (8pt grid) ──────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

// ─── Corner Radii ──────────────────────────────────────────────
export const Radius = {
  small: 8,    // buttons, genre tiles, small controls
  medium: 12,  // card feed items, poster cells
  large: 20,   // bottom sheet top corners, hero surfaces
} as const;

// ─── Typography sizes (pt) ─────────────────────────────────────
export const FontSize = {
  largeTitle: 34,
  title: 28,
  headline: 17,
  body: 17,
  subheadline: 15,
  caption: 12,
} as const;

export const FontWeight = {
  bold: '700' as const,
  semibold: '600' as const,
  regular: '400' as const,
};

// ─── Semantic Color Tokens ──────────────────────────────────────────
// Each token has a light and dark value.
// Components should use useTheme() to get the resolved value for the active mode.

export type ColorScheme = 'light' | 'dark';

interface ThemeColors {
  background: string;
  secondaryBackground: string;
  label: string;
  secondaryLabel: string;
  accent: string;          // Active tab, buttons, star fill (default: Marquee Amber)
  separator: string;
  tabBarBackground: string;
}

/** Default accent — Marquee Amber. Warm cinema-lighting feel. */
export const DEFAULT_ACCENT = '#FF9F0A';

const lightColors: ThemeColors = {
  background: '#F5F5F7',        // Canvas Light
  secondaryBackground: '#FFFFFF',
  label: '#1C1C1E',             // Ink
  secondaryLabel: '#6E6E73',    // Secondary Ink
  accent: DEFAULT_ACCENT,       // Marquee Amber
  separator: '#C6C6C8',
  tabBarBackground: 'rgba(245,245,247,0.85)',
};

const darkColors: ThemeColors = {
  background: '#0B0B0D',        // Canvas Dark
  secondaryBackground: '#1C1C1E',
  label: '#F5F5F5',             // Ink (dark)
  secondaryLabel: '#98989D',    // Secondary Ink (dark)
  accent: DEFAULT_ACCENT,       // Marquee Amber (same in both modes)
  separator: '#38383A',
  tabBarBackground: 'rgba(11,11,13,0.85)',
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
