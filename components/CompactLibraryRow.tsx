import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useTheme } from '@/context/ThemeContext';
import { FontSize, FontWeight, Radius, Spacing } from '@/constants/tokens';
import { posterUrl } from '@/constants/tokens';

interface CompactLibraryRowProps {
  title: string;
  posterPath: string | null;
  releaseYear?: number | null;
  rating?: number | null;
  watchedDate?: string | null;
  onPress: () => void;
  isLast?: boolean;
}

export function CompactLibraryRow({
  title,
  posterPath,
  releaseYear,
  rating,
  watchedDate,
  onPress,
  isLast = false,
}: CompactLibraryRowProps) {
  const { colors } = useTheme();
  const imageUrl = posterUrl(posterPath, 'w185');

  const metaParts: string[] = [];
  if (releaseYear) metaParts.push(String(releaseYear));
  if (watchedDate) metaParts.push(`Watched ${watchedDate}`);

  return (
    <TouchableOpacity
      style={[
        styles.row,
        {
          backgroundColor: colors.secondaryBackground,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={title + (releaseYear ? ', ' + releaseYear : '')}
    >
      {/* Thumbnail */}
      <View
        style={[
          styles.thumbWrapper,
          {
            backgroundColor: colors.tertiaryBackground,
            ...colors.cardShadow,
          },
        ]}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View style={styles.placeholder}>
            <SymbolView name="film" size={16} tintColor={colors.secondaryLabel} weight="medium" />
          </View>
        )}
      </View>

      {/* Main Info */}
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.label }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.subRow}>
          {rating != null && (
            <View style={styles.ratingBadge}>
              <SymbolView name="star.fill" size={10} tintColor="#FFD60A" weight="bold" />
              <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            </View>
          )}
          {metaParts.length > 0 && (
            <Text style={[styles.meta, { color: colors.secondaryLabel }]} numberOfLines={1}>
              {metaParts.join(' · ')}
            </Text>
          )}
        </View>
      </View>

      {/* Chevron */}
      <SymbolView name="chevron.right" size={13} tintColor={colors.tertiaryLabel} weight="semibold" />

      {/* Inset Separator */}
      {!isLast && (
        <View
          style={[
            styles.separator,
            {
              backgroundColor: colors.separator,
            },
          ]}
        />
      )}
    </TouchableOpacity>
  );
}

const THUMB_WIDTH = 42;
const THUMB_HEIGHT = Math.round(THUMB_WIDTH * 1.45);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.md,
    position: 'relative',
  },
  thumbWrapper: {
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    borderRadius: Radius.small,
    overflow: 'hidden',
    // @ts-ignore
    borderCurve: 'continuous',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    letterSpacing: -0.3,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: FontSize.caption2,
    fontWeight: FontWeight.bold,
    color: '#FF9F0A',
  },
  meta: {
    fontSize: FontSize.subheadline,
    fontWeight: FontWeight.regular,
  },
  separator: {
    position: 'absolute',
    left: Spacing.md + THUMB_WIDTH + Spacing.md,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },
});
