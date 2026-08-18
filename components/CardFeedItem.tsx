import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  Dimensions,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/context/ThemeContext';
import { FontSize, FontWeight, Radius, Spacing } from '@/constants/tokens';
import { posterUrl } from '@/constants/tokens';
import { AnimatedPressable } from '@/components/AnimatedPressable';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Proportional card width (~44% of screen on mobile, allowing 2.2 cards visible per row)
const CARD_WIDTH = Math.min(160, Math.round(SCREEN_WIDTH * 0.40));

interface CardFeedItemProps {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseYear?: number | null;
  genres?: string | null;
  rating?: number | null;
  /** Optional numbered badge (e.g. 1-10 for Top 10 row) */
  badge?: number;
  onPress: () => void;
  style?: ViewStyle;
  width?: number;
}

/**
 * Card Feed Item — Apple TV / Letterboxd style floating poster card with Stitch spring animations.
 */
export function CardFeedItem({
  title,
  posterPath,
  releaseYear,
  genres,
  rating,
  badge,
  onPress,
  style,
  width = CARD_WIDTH,
}: CardFeedItemProps) {
  const { colors, colorScheme } = useTheme();
  const imageUrl = posterUrl(posterPath, 'w342');
  const height = Math.round(width * 1.5);

  let genreNames: string[] = [];
  if (genres) {
    try {
      const parsed = JSON.parse(genres) as Array<{ id: number; name: string } | string>;
      genreNames = parsed.map((g) => (typeof g === 'string' ? g : g.name)).slice(0, 2);
    } catch {
      // ignore
    }
  }

  const metaParts: string[] = [];
  if (releaseYear) metaParts.push(String(releaseYear));
  if (genreNames.length > 0) metaParts.push(genreNames.join(', '));
  if (rating) metaParts.push(`★ ${rating.toFixed(1)}`);

  return (
    <AnimatedPressable
      style={[styles.container, { width }, style]}
      onPress={onPress}
      scaleTo={0.94}
      accessibilityRole="button"
      accessibilityLabel={`${title}${releaseYear ? `, ${releaseYear}` : ''}`}
    >
      {/* Poster Image with Shadow & 1px Inner Stroke */}
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
          <View style={[StyleSheet.absoluteFill, styles.posterPlaceholder, { backgroundColor: colors.secondaryBackground }]}>
            <Text style={[styles.placeholderText, { color: colors.secondaryLabel }]} numberOfLines={3}>
              {title}
            </Text>
          </View>
        )}

        {/* Apple TV-style frosted rank numeral for Top 10 */}
        {badge != null && (
          <View style={styles.rankContainer}>
            <Text
              style={[
                styles.rankNumber,
                {
                  color: '#FFFFFF',
                  textShadowColor: 'rgba(0, 0, 0, 0.8)',
                  textShadowOffset: { width: 0, height: 2 },
                  textShadowRadius: 6,
                },
              ]}
            >
              {badge}
            </Text>
          </View>
        )}
      </View>

      {/* Typography underneath poster */}
      <View style={styles.metaContainer}>
        <Text
          style={[
            styles.cardTitle,
            { color: colors.label },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {metaParts.length > 0 ? (
          <Text style={[styles.metaLine, { color: colors.secondaryLabel }]} numberOfLines={1}>
            {metaParts.join(' · ')}
          </Text>
        ) : null}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginRight: Spacing.sm,
  },
  posterWrapper: {
    borderRadius: Radius.card,
    overflow: 'hidden',
    // @ts-ignore
    borderCurve: 'continuous',
    position: 'relative',
  },
  posterPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
  },
  placeholderText: {
    fontSize: FontSize.caption1,
    fontWeight: FontWeight.medium,
    textAlign: 'center',
  },
  rankContainer: {
    position: 'absolute',
    bottom: -6,
    left: 6,
    zIndex: 2,
  },
  rankNumber: {
    fontSize: 48,
    fontWeight: FontWeight.heavy,
    fontFamily: Platform.OS === 'ios' ? 'ui-rounded' : undefined,
    letterSpacing: -2,
    lineHeight: 52,
  },
  metaContainer: {
    marginTop: Spacing.xs + 2,
    gap: 2,
    paddingHorizontal: 2,
  },
  cardTitle: {
    fontSize: FontSize.subheadline,
    fontWeight: FontWeight.semibold,
    letterSpacing: -0.2,
  },
  metaLine: {
    fontSize: FontSize.caption1,
    fontWeight: FontWeight.regular,
  },
});
