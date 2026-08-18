import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Radius, Spacing, FontSize, FontWeight } from '@/constants/tokens';
import { posterUrl } from '@/constants/tokens';
import { AnimatedPressable } from '@/components/AnimatedPressable';

// Stitch CineVault design tokens
const STITCH_SURFACE_CONTAINER_HIGH = '#2a2a2a';
const STITCH_ON_SURFACE = '#e5e2e1';
const STITCH_SECONDARY = '#c8c6c6';
const STITCH_PRIMARY = '#ffb4aa';
const STITCH_SURFACE_VARIANT = '#353534';

interface PosterGridCellProps {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseYear?: number | null;
  rating?: number | null;
  episodeTag?: string;
  progressPercent?: number;
  onPress: () => void;
  style?: ViewStyle;
  /** Width of the cell — height is derived at 2:3 poster ratio */
  width?: number;
}

export function PosterGridCell({
  title,
  posterPath,
  releaseYear,
  rating,
  episodeTag,
  progressPercent,
  onPress,
  style,
  width = 110,
}: PosterGridCellProps) {
  const imageUrl = posterUrl(posterPath, 'w342');
  // Stitch: aspect-[2/3] — height = width * 1.5
  const height = Math.round(width * 1.5);

  return (
    <AnimatedPressable
      onPress={onPress}
      // Stitch: group relative aspect-[2/3] rounded-xl overflow-hidden bg-surface-container-high
      //         transition-transform duration-300 active:scale-[0.98] shadow-md cursor-pointer
      style={[
        styles.container,
        { width, height, backgroundColor: STITCH_SURFACE_CONTAINER_HIGH },
        style,
      ]}
      scaleTo={0.97}
      accessibilityRole="button"
      accessibilityLabel={title + (releaseYear ? ', ' + releaseYear : '')}
    >
      {/* Poster image */}
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
          <Text style={styles.placeholderText} numberOfLines={3}>
            {title}
          </Text>
        </View>
      )}

      {/* Stitch: absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-80 */}
      <LinearGradient
        colors={['rgba(19,19,19,0.9)', 'rgba(19,19,19,0.2)', 'transparent']}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Episode tag badge — Stitch: absolute top-2 left-2 px-2 py-1 rounded-md bg-surface-variant/80 */}
      {episodeTag ? (
        <View style={styles.episodeTagBadge}>
          <Text style={styles.episodeTagText}>{episodeTag}</Text>
        </View>
      ) : null}

      {/* Rating badge */}
      {rating != null && (
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingText}>★ {rating.toFixed(1)}</Text>
        </View>
      )}

      {/* Bottom overlay: title + genre/year + progress bar */}
      {/* Stitch: absolute bottom-0 left-0 right-0 p-3 flex flex-col gap-1 */}
      <View style={styles.bottomOverlay}>
        {/* Title */}
        <Text style={styles.overlayTitle} numberOfLines={1}>{title}</Text>
        {/* Year / meta */}
        {releaseYear ? (
          <Text style={styles.overlayMeta}>{releaseYear}</Text>
        ) : null}

        {/* Progress bar — Stitch: w-full h-1 bg-surface-variant rounded-full overflow-hidden */}
        {progressPercent != null && progressPercent > 0 && (
          <View style={styles.progressTrack}>
            {/* Stitch: h-full bg-primary rounded-full */}
            <View style={[styles.progressFill, { width: `${Math.min(progressPercent, 100)}%` as any }]} />
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12, // Stitch: rounded-xl
    overflow: 'hidden',
    // @ts-ignore
    borderCurve: 'continuous',
    position: 'relative',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
  },
  placeholderText: {
    color: STITCH_SECONDARY,
    fontSize: FontSize.caption1,
    textAlign: 'center',
    fontWeight: FontWeight.medium,
  },
  // Stitch: absolute top-2 left-2 px-2 py-1 rounded-md bg-surface-variant/80 backdrop-blur-md
  episodeTagBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(53,53,52,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6, // rounded-md
  },
  episodeTagText: {
    color: STITCH_ON_SURFACE,
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.3,
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ratingText: {
    color: '#FFD60A',
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  // Stitch: absolute bottom-0 left-0 right-0 p-3 flex flex-col gap-1
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    gap: 4,
  },
  // Stitch: font-label-md text-on-surface truncate drop-shadow-md
  overlayTitle: {
    color: STITCH_ON_SURFACE,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.02,
  },
  // Stitch: font-label-sm text-secondary drop-shadow-md
  overlayMeta: {
    color: STITCH_SECONDARY,
    fontSize: 12,
    fontWeight: '500',
  },
  // Stitch: w-full h-1 bg-surface-variant rounded-full overflow-hidden
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: STITCH_SURFACE_VARIANT, // '#353534'
    borderRadius: 9999,
    overflow: 'hidden',
    marginTop: 4,
  },
  // Stitch: h-full bg-primary (#ffb4aa) rounded-full
  progressFill: {
    height: '100%',
    backgroundColor: STITCH_PRIMARY, // '#ffb4aa'
    borderRadius: 9999,
  },
});
