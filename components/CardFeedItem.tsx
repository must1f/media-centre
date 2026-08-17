import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/context/ThemeContext';
import { FontSize, FontWeight, Radius, Spacing } from '@/constants/tokens';
import { posterUrl } from '@/constants/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Card occupies ~80% of screen width; 3:2 poster ratio
const CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.55);
const POSTER_HEIGHT = Math.round(CARD_WIDTH * 1.5);

interface CardFeedItemProps {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseYear?: number | null;
  genres?: string | null;  // JSON-encoded string e.g. '[{"id":28,"name":"Action"}]'
  rating?: number | null;
  /** Optional numbered badge (used in "Top 10 This Week" row) */
  badge?: number;
  onPress: () => void;
  style?: ViewStyle;
}

/**
 * Card Feed Item — the primary content unit on the Home screen.
 * Renders a poster image with a glassmorphic info card below it.
 * Used in horizontal FlashList rows.
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
}: CardFeedItemProps) {
  const { colors, colorScheme } = useTheme();
  const imageUrl = posterUrl(posterPath, 'w342');

  // Parse genre names from JSON string
  let genreNames: string[] = [];
  if (genres) {
    try {
      const parsed = JSON.parse(genres) as Array<{ id: number; name: string } | string>;
      genreNames = parsed.map((g) => (typeof g === 'string' ? g : g.name)).slice(0, 2);
    } catch {
      // ignore malformed genre data
    }
  }

  const metaParts: string[] = [];
  if (releaseYear) metaParts.push(String(releaseYear));
  if (genreNames.length > 0) metaParts.push(genreNames.join(', '));
  if (rating) metaParts.push(`★ ${rating.toFixed(1)}`);

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${title}${releaseYear ? `, ${releaseYear}` : ''}`}
    >
      {/* Poster image */}
      <View style={styles.posterWrapper}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.poster}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.poster, styles.posterPlaceholder, { backgroundColor: colors.secondaryBackground }]}>
            <Text style={[styles.placeholderText, { color: colors.secondaryLabel }]} numberOfLines={3}>
              {title}
            </Text>
          </View>
        )}

        {/* Top 10 numbered badge */}
        {badge != null && (
          <View style={[styles.badge, { backgroundColor: colors.accent }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>

      {/* Info card below poster */}
      <BlurView
        intensity={60}
        tint={colorScheme === 'dark' ? 'dark' : 'light'}
        style={[styles.infoCard, { borderColor: colors.separator }]}
      >
        <Text style={[styles.cardTitle, { color: colors.label }]} numberOfLines={1}>
          {title}
        </Text>
        {metaParts.length > 0 && (
          <Text style={[styles.metaLine, { color: colors.secondaryLabel }]} numberOfLines={1}>
            {metaParts.join(' · ')}
          </Text>
        )}
      </BlurView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    marginRight: Spacing.sm,
  },
  posterWrapper: {
    borderRadius: Radius.medium,
    overflow: 'hidden',
    // @ts-ignore — borderCurve is valid on iOS 13+
    borderCurve: 'continuous',
  },
  poster: {
    width: CARD_WIDTH,
    height: POSTER_HEIGHT,
  },
  posterPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
  },
  placeholderText: {
    fontSize: FontSize.caption,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    // SF Pro Rounded for badge numerals
    fontFamily: 'ui-rounded',
  },
  infoCard: {
    marginTop: Spacing.xs,
    borderRadius: Radius.small,
    overflow: 'hidden',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  cardTitle: {
    fontSize: FontSize.subheadline,
    fontWeight: FontWeight.semibold,
  },
  metaLine: {
    fontSize: FontSize.caption,
  },
});
