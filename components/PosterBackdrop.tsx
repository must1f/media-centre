import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/context/ThemeContext';
import { posterUrl } from '@/constants/tokens';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PosterBackdropProps {
  posterPath: string | null | undefined;
  /** Dominant hex color extracted from the poster. Falls back to accent when null. */
  dominantColor?: string | null;
  /** How strongly to blur the backdrop (0–100). Default 90. */
  blurIntensity?: number;
  children?: React.ReactNode;
}

/**
 * Full-bleed blurred poster backdrop ("Poster-Driven Glass").
 * Used on the Movie Detail page and Quick-Log sheet.
 *
 * Renders the poster scaled to fill the screen with a heavy BlurView overlay,
 * so the page background reads as belonging to that film visual world.
 * Falls back to opaque Canvas + default accent when no poster is available.
 */
export function PosterBackdrop({
  posterPath,
  dominantColor,
  blurIntensity = 90,
  children,
}: PosterBackdropProps) {
  const { colors, colorScheme } = useTheme();
  const imageUrl = posterUrl(posterPath, 'w780');

  if (!imageUrl) {
    // Graceful fallback: plain canvas background
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {children}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Layer 1: full-bleed poster image, slightly scaled so no hard edges */}
      <Image
        source={{ uri: imageUrl }}
        style={styles.backdropImage}
        contentFit="cover"
        transition={300}
      />
      {/* Layer 2: heavy blur to dissolve the poster into an ambient field */}
      <BlurView
        intensity={blurIntensity}
        tint={colorScheme === 'dark' ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      {/* Layer 3: a semi-transparent color wash from the dominant color */}
      {dominantColor ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: dominantColor + '33' }, // 20% opacity tint
          ]}
        />
      ) : null}
      {/* Content rendered on top */}
      <View style={StyleSheet.absoluteFill}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdropImage: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    transform: [{ scale: 1.05 }], // slight overscan so no hard edges
  },
});
