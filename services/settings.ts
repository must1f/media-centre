import AsyncStorage from '@react-native-async-storage/async-storage';

// Note: @react-native-async-storage/async-storage is bundled by Expo.
// If not yet installed, add: npx expo install @react-native-async-storage/async-storage

export type AppearanceMode = 'auto' | 'light' | 'dark';

const KEYS = {
  appearance: '@mediacentre/appearance',
  accentColor: '@mediacentre/accentColor',
} as const;

/** Available accent color choices (Marquee Amber is the default). */
export const ACCENT_PALETTE = [
  '#FF9F0A', // Marquee Amber (default)
  '#FF375F', // Red
  '#30D158', // Green
  '#0A84FF', // Blue
  '#BF5AF2', // Purple
  '#FFD60A', // Yellow
] as const;

export async function getAppearanceMode(): Promise<AppearanceMode> {
  const value = await AsyncStorage.getItem(KEYS.appearance);
  return (value as AppearanceMode | null) ?? 'auto';
}

export async function setAppearanceMode(mode: AppearanceMode): Promise<void> {
  await AsyncStorage.setItem(KEYS.appearance, mode);
}

export async function getAccentColor(): Promise<string> {
  const value = await AsyncStorage.getItem(KEYS.accentColor);
  return value ?? ACCENT_PALETTE[0];
}

export async function setAccentColor(hex: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.accentColor, hex);
}
