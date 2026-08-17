import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { FontSize, FontWeight, Radius, Spacing } from '@/constants/tokens';
import { ACCENT_PALETTE, type AppearanceMode } from '@/services/settings';

// DB CRUD functions
import { getAllCachedMovies, type Movie } from '@/db/movies';
import { getAllLogEntries, type LogEntry } from '@/db/logEntries';

export default function ProfileScreen() {
  const { colors, colorScheme, appearanceMode, setAppearanceMode, accentColor, setAccentColor } = useTheme();

  // Data State
  const [movies, setMovies] = useState<Movie[]>([]);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      setMovies(getAllCachedMovies());
      setLogEntries(getAllLogEntries());
    }, [])
  );

  // Statistics calculation
  const totalWatched = logEntries.length;
  const uniqueWatchedSet = new Set(logEntries.map((l) => l.movie_id));
  const uniqueWatched = uniqueWatchedSet.size;

  const ratedMovies = movies.filter((m) => uniqueWatchedSet.has(m.tmdb_id) && m.my_rating !== null);
  const averageRating =
    ratedMovies.length > 0
      ? ratedMovies.reduce((acc, curr) => acc + (curr.my_rating ?? 0), 0) / ratedMovies.length
      : 0;

  // Genre counts
  const genreCounts: Record<string, number> = {};
  movies
    .filter((m) => uniqueWatchedSet.has(m.tmdb_id))
    .forEach((m) => {
      if (!m.genres) return;
      try {
        const parsed = JSON.parse(m.genres) as Array<{ id: number; name: string } | string>;
        parsed.forEach((g) => {
          const name = typeof g === 'string' ? g : g.name;
          genreCounts[name] = (genreCounts[name] ?? 0) + 1;
        });
      } catch (e) {
        // ignore
      }
    });

  let topGenre = 'None';
  let maxCount = 0;
  Object.entries(genreCounts).forEach(([genre, count]) => {
    if (count > maxCount) {
      maxCount = count;
      topGenre = genre;
    }
  });

  const renderStats = () => {
    const stats = [
      { label: 'Watched', value: String(totalWatched) },
      { label: 'Unique Films', value: String(uniqueWatched) },
      { label: 'Avg Rating', value: averageRating > 0 ? averageRating.toFixed(1) : '—' },
      { label: 'Top Genre', value: topGenre },
    ];

    return (
      <View style={styles.statsGrid}>
        {stats.map((stat, idx) => (
          <View
            key={idx}
            style={[
              styles.statCard,
              { backgroundColor: colors.secondaryBackground, borderColor: colors.separator },
            ]}
          >
            <Text style={[styles.statValue, { color: colors.label }]} numberOfLines={1}>
              {stat.value}
            </Text>
            <Text style={[styles.statLabel, { color: colors.secondaryLabel }]}>
              {stat.label}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderAppearanceSettings = () => {
    const modes: { value: AppearanceMode; label: string }[] = [
      { value: 'auto', label: 'System' },
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' },
    ];

    return (
      <View
        style={[
          styles.settingsSection,
          { backgroundColor: colors.secondaryBackground, borderColor: colors.separator },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.label }]}>Appearance</Text>
        <View style={styles.segmentedControl}>
          {modes.map((mode) => {
            const isSelected = appearanceMode === mode.value;
            return (
              <TouchableOpacity
                key={mode.value}
                style={[
                  styles.segmentButton,
                  isSelected && { backgroundColor: colors.accent },
                ]}
                onPress={() => setAppearanceMode(mode.value)}
              >
                <Text
                  style={[
                    styles.segmentLabel,
                    { color: isSelected ? '#FFFFFF' : colors.secondaryLabel },
                    isSelected && { fontWeight: FontWeight.semibold },
                  ]}
                >
                  {mode.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderAccentColorSettings = () => {
    return (
      <View
        style={[
          styles.settingsSection,
          { backgroundColor: colors.secondaryBackground, borderColor: colors.separator },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.label }]}>Accent Color</Text>
        <View style={styles.colorPalette}>
          {ACCENT_PALETTE.map((color) => {
            const isSelected = accentColor === color;
            return (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorCircle,
                  { backgroundColor: color },
                  isSelected && [styles.selectedCircle, { borderColor: colors.label }],
                ]}
                onPress={() => setAccentColor(color)}
                accessibilityRole="button"
                accessibilityLabel={`Accent color ${color}`}
              />
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.largeTitle, { color: colors.label }]}>Profile</Text>
        </View>

        {renderStats()}

        <Text style={[styles.groupHeader, { color: colors.secondaryLabel }]}>App Settings</Text>
        {renderAppearanceSettings()}
        {renderAccentColorSettings()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 120 },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  largeTitle: {
    fontSize: FontSize.largeTitle,
    fontWeight: FontWeight.bold,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    width: '45%',
    aspectRatio: 1.2,
    marginHorizontal: '2.5%',
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    // @ts-ignore
    borderCurve: 'continuous',
  },
  statValue: {
    fontSize: FontSize.title,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSize.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupHeader: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  settingsSection: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    // @ts-ignore
    borderCurve: 'continuous',
  },
  sectionTitle: {
    fontSize: FontSize.headline,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.md,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: Radius.small,
    padding: 2,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Radius.small - 2,
  },
  segmentLabel: {
    fontSize: FontSize.subheadline,
  },
  colorPalette: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  selectedCircle: {
    borderWidth: 3,
  },
});
