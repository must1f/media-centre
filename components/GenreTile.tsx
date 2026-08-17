import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { Radius, Spacing, FontSize, FontWeight } from '@/constants/tokens';

// A palette of distinct genre tile colors (independent of theme —
// genre tiles are always colorful on both light and dark modes).
const GENRE_COLORS = [
  '#FF6B6B', '#FF9F0A', '#30D158', '#0A84FF',
  '#BF5AF2', '#FF375F', '#5E5CE6', '#32ADE6',
  '#FFD60A', '#AC8E68', '#FF9F0A', '#30D158',
];

export function genreColor(index: number): string {
  return GENRE_COLORS[index % GENRE_COLORS.length];
}

interface GenreTileProps {
  name: string;
  index: number;         // used to pick a color from the palette
  onPress: () => void;
  style?: ViewStyle;
}

export function GenreTile({ name, index, onPress, style }: GenreTileProps) {
  const bg = genreColor(index);

  return (
    <TouchableOpacity
      style={[styles.tile, { backgroundColor: bg }, style]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Browse ${name} movies`}
      activeOpacity={0.75}
    >
      <Text style={styles.label} numberOfLines={2}>
        {name}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: Radius.small,
    padding: Spacing.md,
    minHeight: 80,
    justifyContent: 'flex-end',
    // @ts-ignore — borderCurve is valid on iOS 13+
    borderCurve: 'continuous',
  },
  label: {
    color: '#FFFFFF',
    fontSize: FontSize.subheadline,
    fontWeight: FontWeight.semibold,
  },
});
