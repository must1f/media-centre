import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Radius, Spacing, FontSize, FontWeight } from '@/constants/tokens';
import { useTheme } from '@/context/ThemeContext';

interface SeasonPillSelectorProps {
  seasons: { seasonNumber: number; label: string }[];
  activeSeasonNumber: number;
  onSelect: (seasonNumber: number) => void;
}

export function SeasonPillSelector({ seasons, activeSeasonNumber, onSelect }: SeasonPillSelectorProps) {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {seasons.map((season) => {
        const active = season.seasonNumber === activeSeasonNumber;
        return (
          <TouchableOpacity
            key={season.seasonNumber}
            onPress={() => onSelect(season.seasonNumber)}
            activeOpacity={0.8}
            style={[
              styles.pill,
              {
                backgroundColor: active ? colors.accent : 'transparent',
                borderColor: active ? colors.accent : colors.separator,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={season.label}
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.label, { color: active ? '#FFFFFF' : colors.label }]}>{season.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  label: {
    fontSize: FontSize.subheadline,
    fontWeight: FontWeight.semibold,
  },
});
