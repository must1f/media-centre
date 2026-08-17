import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { Colors, DEFAULT_ACCENT, type ColorScheme } from '@/constants/tokens';
import { getAccentColor, getAppearanceMode, type AppearanceMode } from '@/services/settings';

interface ThemeContextValue {
  colorScheme: ColorScheme;
  appearanceMode: AppearanceMode;
  setAppearanceMode: (mode: AppearanceMode) => void;
  accentColor: string;
  setAccentColor: (hex: string) => void;
  colors: typeof Colors.light;
}

const ThemeContext = createContext<ThemeContextValue>({
  colorScheme: 'light',
  appearanceMode: 'auto',
  setAppearanceMode: () => {},
  accentColor: DEFAULT_ACCENT,
  setAccentColor: () => {},
  colors: Colors.light,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [appearanceMode, setAppearanceModeState] = useState<AppearanceMode>('auto');
  const [accentColor, setAccentColorState] = useState<string>(DEFAULT_ACCENT);

  // Load persisted settings on mount
  useEffect(() => {
    getAppearanceMode().then(setAppearanceModeState);
    getAccentColor().then(setAccentColorState);
  }, []);

  const resolvedScheme: ColorScheme =
    appearanceMode === 'auto'
      ? (systemScheme === 'dark' ? 'dark' : 'light')
      : appearanceMode;

  const baseColors = Colors[resolvedScheme];
  const colors = { ...baseColors, accent: accentColor };

  function handleSetAppearanceMode(mode: AppearanceMode) {
    setAppearanceModeState(mode);
    // Persist asynchronously — import inline to avoid circular deps
    import('@/services/settings').then(({ setAppearanceMode }) => setAppearanceMode(mode));
  }

  function handleSetAccentColor(hex: string) {
    setAccentColorState(hex);
    import('@/services/settings').then(({ setAccentColor }) => setAccentColor(hex));
  }

  return (
    <ThemeContext.Provider
      value={{
        colorScheme: resolvedScheme,
        appearanceMode,
        setAppearanceMode: handleSetAppearanceMode,
        accentColor,
        setAccentColor: handleSetAccentColor,
        colors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
