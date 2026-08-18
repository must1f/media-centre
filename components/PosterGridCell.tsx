import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Radius, Spacing, FontSize, FontWeight } from '@/constants/tokens';
import { useTheme } from '@/context/ThemeContext';
import { posterUrl } from '@/constants/tokens';
import { AnimatedPressable } from '@/components/AnimatedPressable';

interface PosterGridCellProps {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseYear?: number | null;
  rating?: number | null;
  episodeTag?: string;
  onPress: () => void;
  style?: ViewStyle;
  /** Width of the cell — height is derived at 3:2 poster ratio */
  width?: number;
}

export function PosterGridCell({
  title,
  posterPath,
  releaseYear,
  rating,
  episodeTag,
  onPress,
  style,
  width = 110,
}: PosterGridCellProps) {
  const { colors, colorScheme } = useTheme();
  const imageUrl = posterUrl(posterPath, 'w342');
  const height = Math.round(width * 1.5);

  return (
    <AnimatedPressable
      onPress={onPress}
      style={[styles.container, { width }, style]}
      scaleTo={0.93}
      accessibilityRole="button"
      accessibilityLabel={title + (releaseYear ? ', ' + releaseYear : '')}
    >
      <View
        style={[
          styles.posterWrapper,
          {
            width,
            height,
            backgroundColor: colors.secondaryBackground,
            borderWidth: 1,
            borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.06)',
            ...colors.cardShadow,
          },
        ]}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.placeholder, { backgroundColor: colors.secondaryBackground }]}>
            <Text style={[styles.placeholderText, { color: colors.secondaryLabel }]} numberOfLines={3}>
              {title}
            </Text>
          </View>
        )}

        {rating != null && (
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>★ {rating.toFixed(1)}</Text>
          </View>
        )}
        {episodeTag ? (
          <View style={styles.episodeTagBadge}>
            <Text style={styles.episodeTagText}>{episodeTag}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: colors.label }]} numberOfLines={1}>
          {title}
        </Text>
        {releaseYear ? (
          <Text style={[styles.meta, { color: colors.secondaryLabel }]}>{releaseYear}</Text>
        ) : null}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm,
  },
  posterWrapper: {
    borderRadius: Radius.card,
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
    fontSize: FontSize.caption1,
    textAlign: 'center',
    fontWeight: FontWeight.medium,
  },
  ratingBadge: {
    position: 'absolute',
    bottom: Spacing.xs,
    right: Spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.small,
  },
  ratingText: {
    color: '#FFD60A',
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  episodeTagBadge: {
    position: 'absolute',
    top: Spacing.xs,
    left: Spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.small,
  },
  episodeTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  textContainer: {
    marginTop: Spacing.xs,
    paddingHorizontal: 2,
    gap: 1,
  },
  title: {
    fontSize: FontSize.caption1,
    fontWeight: FontWeight.semibold,
    letterSpacing: -0.2,
  },
  meta: {
    fontSize: FontSize.caption2,
    fontWeight: FontWeight.regular,
  },
});
