import React, { useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { EmptyState } from '@/components/EmptyState';
import { useTheme } from '@/context/ThemeContext';
import { FontSize, FontWeight, Radius, Spacing } from '@/constants/tokens';
import { getAllLogEntries, type LogEntry } from '@/db/logEntries';
import { getAllCachedMovies, type Movie } from '@/db/movies';
import { computeYearStats, monthName, type YearStats } from '@/services/yearRecap';

const CURRENT_YEAR = new Date().getFullYear();

export default function YearRecapScreen() {
  const { colors, colorScheme } = useTheme();
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      setLogEntries(getAllLogEntries());
      setMovies(getAllCachedMovies());
    }, [])
  );

  const stats: YearStats = useMemo(
    () => computeYearStats(logEntries, movies, CURRENT_YEAR),
    [logEntries, movies]
  );

  const isEmpty = stats.totalWatched === 0;

  const heroTint = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.03)';

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: '',
          headerBackTitle: 'Back',
          headerTintColor: colors.label,
        }}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        {isEmpty ? (
          <EmptyState
            title="No recap yet"
            body={`Log a few movies in ${CURRENT_YEAR} and your Year in Review will show up here.`}
            iconName="sparkles"
          />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Wrapped-style gradient hero (layered translucent tints — no external gradient lib) */}
            <View
              style={[
                styles.hero,
                {
                  backgroundColor: colors.accent,
                },
              ]}
            >
              <View style={[StyleSheet.absoluteFill, { backgroundColor: heroTint }]} />
              <View style={[styles.heroGlow, { backgroundColor: 'rgba(255,255,255,0.18)' }]} />
              <SymbolView name="sparkles" size={28} tintColor="#FFFFFF" weight="bold" />
              <Text style={styles.heroEyebrow}>YOUR YEAR</Text>
              <Text style={styles.heroYear}>{stats.year}</Text>
              <Text style={styles.heroSubtitle}>
                {stats.totalWatched} {stats.totalWatched === 1 ? 'movie' : 'movies'} logged this year
              </Text>
            </View>

            {/* Hero stat grid */}
            <View style={styles.section}>
              <Text style={[styles.sectionHeading, { color: colors.secondaryLabel }]}>By The Numbers</Text>
              <View style={styles.statsGrid}>
                <StatCard
                  value={stats.totalWatched}
                  label="TOTAL WATCHES"
                  color={colors.label}
                  colors={colors}
                  colorScheme={colorScheme}
                />
                <StatCard
                  value={stats.uniqueTitles}
                  label="UNIQUE TITLES"
                  color={colors.accent}
                  colors={colors}
                  colorScheme={colorScheme}
                />
                <StatCard
                  value={stats.averageRating != null ? stats.averageRating.toFixed(1) : '—'}
                  label="AVG RATING"
                  color={colors.starGold}
                  colors={colors}
                  colorScheme={colorScheme}
                />
                <StatCard
                  value={stats.busiestMonth ? monthName(stats.busiestMonth.month).slice(0, 3) : '—'}
                  label="BUSIEST MONTH"
                  color={colors.label}
                  colors={colors}
                  colorScheme={colorScheme}
                  isText
                />
              </View>
            </View>

            {/* Top genre hero callout */}
            {stats.topGenre ? (
              <View style={styles.section}>
                <Text style={[styles.sectionHeading, { color: colors.secondaryLabel }]}>Your Top Genre</Text>
                <View
                  style={[
                    styles.genreCard,
                    {
                      backgroundColor: colorScheme === 'dark' ? '#201F1F' : 'rgba(255, 255, 255, 0.90)',
                      borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                      borderWidth: 1,
                    },
                  ]}
                >
                  <SymbolView name="theatermasks.fill" size={22} tintColor={colors.accent} weight="bold" />
                  <View style={styles.genreMeta}>
                    <Text style={[styles.genreName, { color: colors.label }]}>{stats.topGenre.name}</Text>
                    <Text style={[styles.genreCount, { color: colors.secondaryLabel }]}>
                      {stats.topGenre.count} {stats.topGenre.count === 1 ? 'watch' : 'watches'}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {/* Top-rated movies list */}
            {stats.topRatedMovies.length > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionHeading, { color: colors.secondaryLabel }]}>Top Rated This Year</Text>
                <View
                  style={[
                    styles.groupedCard,
                    {
                      backgroundColor: colorScheme === 'dark' ? '#201F1F' : 'rgba(255, 255, 255, 0.90)',
                      borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                      borderWidth: 1,
                    },
                  ]}
                >
                  {stats.topRatedMovies.slice(0, 5).map((entry, index) => (
                    <View key={entry.movie.tmdb_id}>
                      <View style={styles.movieRow}>
                        <Text style={[styles.movieRank, { color: colors.secondaryLabel }]}>{index + 1}</Text>
                        <Text style={[styles.movieTitle, { color: colors.label }]} numberOfLines={1}>
                          {entry.movie.title}
                        </Text>
                        <View style={styles.movieRatingWrap}>
                          <SymbolView name="star.fill" size={13} tintColor={colors.starGold} weight="bold" />
                          <Text style={[styles.movieRating, { color: colors.starGold }]}>
                            {entry.rating.toFixed(1)}
                          </Text>
                        </View>
                      </View>
                      {index < Math.min(stats.topRatedMovies.length, 5) - 1 ? (
                        <View
                          style={[
                            styles.divider,
                            { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
                          ]}
                        />
                      ) : null}
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Monthly breakdown */}
            {stats.monthBreakdown.length > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionHeading, { color: colors.secondaryLabel }]}>Month By Month</Text>
                <View style={styles.monthGrid}>
                  {stats.monthBreakdown.map((m) => {
                    const isBusiest = stats.busiestMonth?.month === m.month;
                    return (
                      <View
                        key={m.month}
                        style={[
                          styles.monthPill,
                          {
                            backgroundColor: isBusiest
                              ? colors.accent
                              : colorScheme === 'dark'
                              ? '#201F1F'
                              : 'rgba(255, 255, 255, 0.90)',
                            borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                            borderWidth: 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.monthPillCount,
                            { color: isBusiest ? '#FFFFFF' : colors.label },
                          ]}
                        >
                          {m.count}
                        </Text>
                        <Text
                          style={[
                            styles.monthPillLabel,
                            { color: isBusiest ? 'rgba(255,255,255,0.85)' : colors.secondaryLabel },
                          ]}
                        >
                          {monthName(m.month).slice(0, 3).toUpperCase()}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </ScrollView>
        )}
      </SafeAreaView>
    </>
  );
}

function StatCard({
  value,
  label,
  color,
  colors,
  colorScheme,
  isText,
}: {
  value: string | number;
  label: string;
  color: string;
  colors: ReturnType<typeof useTheme>['colors'];
  colorScheme: ReturnType<typeof useTheme>['colorScheme'];
  isText?: boolean;
}) {
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: colorScheme === 'dark' ? '#201F1F' : 'rgba(255, 255, 255, 0.90)',
          borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          borderWidth: 1,
        },
      ]}
    >
      <Text
        style={[
          styles.statNumber,
          { color },
          isText && styles.statNumberText,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text style={[styles.statUnit, { color: colors.secondaryLabel }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: Spacing.xxl },
  hero: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: Radius.large,
    // @ts-ignore
    borderCurve: 'continuous',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  heroEyebrow: {
    marginTop: Spacing.sm,
    fontSize: FontSize.caption1,
    fontWeight: FontWeight.heavy,
    letterSpacing: 2.5,
    color: 'rgba(255,255,255,0.85)',
  },
  heroYear: {
    fontSize: 56,
    fontWeight: FontWeight.heavy,
    fontFamily: Platform.OS === 'ios' ? 'ui-rounded' : undefined,
    color: '#FFFFFF',
    letterSpacing: -1,
    marginTop: 2,
  },
  heroSubtitle: {
    marginTop: Spacing.xs,
    fontSize: FontSize.subheadline,
    fontWeight: FontWeight.semibold,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.lg,
  },
  sectionHeading: {
    fontSize: FontSize.subheadline,
    fontWeight: FontWeight.semibold,
    letterSpacing: -0.1,
    marginBottom: Spacing.xs + 2,
    paddingHorizontal: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  statCard: {
    width: '48.2%',
    paddingVertical: Spacing.md,
    borderRadius: Radius.card,
    // @ts-ignore
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  statNumber: {
    fontSize: FontSize.title1,
    fontWeight: FontWeight.heavy,
    fontFamily: Platform.OS === 'ios' ? 'ui-rounded' : undefined,
    letterSpacing: -0.5,
  },
  statNumberText: {
    fontSize: FontSize.title2,
  },
  statUnit: {
    fontSize: 10,
    fontWeight: FontWeight.heavy,
    letterSpacing: 1.2,
  },
  genreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.card,
    // @ts-ignore
    borderCurve: 'continuous',
  },
  genreMeta: { gap: 1 },
  genreName: {
    fontSize: FontSize.title3,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
  },
  genreCount: {
    fontSize: FontSize.footnote,
    fontWeight: FontWeight.medium,
  },
  groupedCard: {
    borderRadius: Radius.card,
    // @ts-ignore
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  movieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
  },
  movieRank: {
    width: 20,
    fontSize: FontSize.subheadline,
    fontWeight: FontWeight.heavy,
    fontFamily: Platform.OS === 'ios' ? 'ui-rounded' : undefined,
  },
  movieTitle: {
    flex: 1,
    fontSize: FontSize.subheadline,
    fontWeight: FontWeight.semibold,
  },
  movieRatingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  movieRating: {
    fontSize: FontSize.footnote,
    fontWeight: FontWeight.bold,
    fontFamily: Platform.OS === 'ios' ? 'ui-rounded' : undefined,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.md,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  monthPill: {
    width: '22%',
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.medium,
    // @ts-ignore
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  monthPillCount: {
    fontSize: FontSize.headline,
    fontWeight: FontWeight.heavy,
    fontFamily: Platform.OS === 'ios' ? 'ui-rounded' : undefined,
  },
  monthPillLabel: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.6,
  },
});
