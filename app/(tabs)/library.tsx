import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { SymbolView } from 'expo-symbols';
import { useTheme } from '@/context/ThemeContext';
import { FontSize, FontWeight, Radius, Spacing } from '@/constants/tokens';
import { PosterGridCell } from '@/components/PosterGridCell';
import { CompactLibraryRow } from '@/components/CompactLibraryRow';
import { EmptyState } from '@/components/EmptyState';
import { RowHeader } from '@/components/RowHeader';

// DB CRUD functions
import { getAllCachedMovies, type Movie } from '@/db/movies';
import { getAllCachedSeries, type Series } from '@/db/series';
import { getAllLogEntries, type LogEntry } from '@/db/logEntries';
import { getWatchlistIds } from '@/db/watchlist';

type FilterCategory = 'all' | 'movies' | 'series' | 'diary' | 'watchlist' | 'ratings';
type DisplayMode = 'reels' | 'grid' | 'list';

export default function VaultScreen() {
  const { colors, colorScheme } = useTheme();

  // Filter & view mode state
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('reels');

  // Data State
  const [movies, setMovies] = useState<Movie[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [watchlistIds, setWatchlistIds] = useState<number[]>([]);
  const [watchlistSeriesIds, setWatchlistSeriesIds] = useState<number[]>([]);

  // Refresh data every time the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      setMovies(getAllCachedMovies());
      setSeries(getAllCachedSeries());
      setLogEntries(getAllLogEntries());
      setWatchlistIds(getWatchlistIds('movie'));
      setWatchlistSeriesIds(getWatchlistIds('series'));
    }, [])
  );

  // Derived data sets
  const watchedMovieIds = new Set(
    logEntries.filter((l) => l.media_type === 'movie').map((l) => l.movie_id)
  );
  const watchedMovies = movies.filter((m) => watchedMovieIds.has(m.tmdb_id));

  const watchedSeriesIds = new Set(
    logEntries.filter((l) => l.media_type === 'series').map((l) => l.movie_id)
  );
  const watchedSeries = series.filter((s) => watchedSeriesIds.has(s.tmdb_id));

  const ratedMovies = movies
    .filter((m) => m.my_rating !== null)
    .sort((a, b) => (b.my_rating ?? 0) - (a.my_rating ?? 0));

  const watchlistSet = new Set(watchlistIds);
  const watchlistMovies = movies.filter((m) => watchlistSet.has(m.tmdb_id));

  const watchlistSeriesSet = new Set(watchlistSeriesIds);
  const watchlistSeries = series.filter((s) => watchlistSeriesSet.has(s.tmdb_id));

  // Combined watchlist (movies + series) for the "Watchlist" reel/filter/grid/list.
  const watchlistItems = [
    ...watchlistMovies.map((m) => ({ ...m, mediaType: 'movie' as const })),
    ...watchlistSeries.map((s) => ({ ...s, mediaType: 'series' as const })),
  ];

  const diaryItems = logEntries.map((log) => {
    const movie = movies.find((m) => m.tmdb_id === log.movie_id);
    return {
      logId: log.id,
      tmdbId: log.movie_id,
      title: movie?.title ?? 'Unknown Movie',
      posterPath: movie?.poster_path ?? null,
      releaseYear: movie?.release_year ?? null,
      rating: movie?.my_rating ?? null,
      watchedDate: log.watched_date,
    };
  });

  const totalVaultCount = movies.length + watchlistMovies.length + watchlistSeries.length + series.length;

  const navigateToDetail = (tmdbId: number) => {
    router.push(`/movie/${tmdbId}`);
  };

  const navigateToItem = (item: any) => {
    const mediaType = item.mediaType ?? (activeFilter === 'series' ? 'series' : 'movie');
    if (mediaType === 'series') {
      router.push(`/series/${item.tmdb_id}`);
    } else {
      navigateToDetail(item.tmdb_id ?? item.tmdbId);
    }
  };

  const filterChips: { id: FilterCategory; label: string; icon?: string }[] = [
    { id: 'all', label: 'All Saves' },
    { id: 'movies', label: 'Watched' },
    { id: 'series', label: 'TV Shows' },
    { id: 'watchlist', label: 'Watchlist', icon: 'bookmark.fill' },
    { id: 'ratings', label: 'Ratings', icon: 'star.fill' },
    { id: 'diary', label: 'Diary', icon: 'calendar' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Stitch Top Header */}
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <View
            style={[
              styles.brandLogo,
              {
                backgroundColor: colors.accent,
                shadowColor: colors.accent,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.45,
                shadowRadius: 8,
                elevation: 4,
              },
            ]}
          >
            <SymbolView name="folder.fill.badge.plus" size={16} tintColor="#FFFFFF" weight="heavy" />
          </View>
          <Text style={[styles.largeTitle, { color: colors.label }]}>Vault</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.profileAvatarButton,
            {
              borderColor: colors.accent,
              backgroundColor: colors.secondaryBackground,
            },
          ]}
          onPress={() => router.push('/profile')}
          activeOpacity={0.8}
        >
          <SymbolView name="person.crop.circle.fill" size={26} tintColor={colors.accent} weight="medium" />
        </TouchableOpacity>
      </View>

      {/* Stitch Filter Pills (Horizontal Scroll) */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {filterChips.map((chip) => {
            const isActive = activeFilter === chip.id;
            return (
              <TouchableOpacity
                key={chip.id}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive
                      ? colors.accent
                      : colorScheme === 'dark'
                      ? 'rgba(42, 42, 42, 0.85)'
                      : 'rgba(235, 235, 235, 0.95)',
                    borderColor: isActive
                      ? colors.accent
                      : colorScheme === 'dark'
                      ? 'rgba(255, 255, 255, 0.10)'
                      : 'rgba(0, 0, 0, 0.08)',
                    borderWidth: 1,
                    shadowColor: isActive ? colors.accent : '#000000',
                    shadowOffset: { width: 0, height: isActive ? 3 : 1 },
                    shadowOpacity: isActive ? 0.35 : 0.05,
                    shadowRadius: isActive ? 8 : 2,
                    elevation: isActive ? 4 : 1,
                  },
                ]}
                onPress={() => setActiveFilter(chip.id)}
                activeOpacity={0.8}
              >
                {chip.icon ? (
                  <SymbolView
                    name={chip.icon as any}
                    size={12}
                    tintColor={isActive ? '#FFFFFF' : colors.secondaryLabel}
                    weight="bold"
                  />
                ) : null}
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: isActive ? '#FFFFFF' : colors.label,
                      fontWeight: isActive ? FontWeight.heavy : FontWeight.semibold,
                    },
                  ]}
                >
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Vault Stats & View Mode Controls */}
      <View style={styles.statsSummaryRow}>
        <Text style={[styles.statsCount, { color: colors.secondaryLabel }]}>
          {totalVaultCount} {totalVaultCount === 1 ? 'item' : 'items'} in your vault
        </Text>

        <View style={styles.viewControls}>
          <TouchableOpacity
            style={[
              styles.viewToggleBtn,
              {
                backgroundColor:
                  displayMode === 'reels'
                    ? colors.secondaryBackground
                    : 'transparent',
                borderColor:
                  displayMode === 'reels' ? colors.accent : 'transparent',
                borderWidth: 1,
              },
            ]}
            onPress={() => setDisplayMode('reels')}
            activeOpacity={0.8}
          >
            <SymbolView
              name="rectangle.stack.fill"
              size={15}
              tintColor={displayMode === 'reels' ? colors.accent : colors.secondaryLabel}
              weight="semibold"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.viewToggleBtn,
              {
                backgroundColor:
                  displayMode === 'grid'
                    ? colors.secondaryBackground
                    : 'transparent',
                borderColor:
                  displayMode === 'grid' ? colors.accent : 'transparent',
                borderWidth: 1,
              },
            ]}
            onPress={() => setDisplayMode('grid')}
            activeOpacity={0.8}
          >
            <SymbolView
              name="square.grid.2x2.fill"
              size={15}
              tintColor={displayMode === 'grid' ? colors.accent : colors.secondaryLabel}
              weight="semibold"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.viewToggleBtn,
              {
                backgroundColor:
                  displayMode === 'list'
                    ? colors.secondaryBackground
                    : 'transparent',
                borderColor:
                  displayMode === 'list' ? colors.accent : 'transparent',
                borderWidth: 1,
              },
            ]}
            onPress={() => setDisplayMode('list')}
            activeOpacity={0.8}
          >
            <SymbolView
              name="list.bullet"
              size={15}
              tintColor={displayMode === 'list' ? colors.accent : colors.secondaryLabel}
              weight="semibold"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      {totalVaultCount === 0 ? (
        <EmptyState
          title="Your Vault is Empty"
          body="Save movies and shows here to build your personal cinematic library."
          ctaLabel="Discover Movies"
          iconName="film.stack"
          onCtaPress={() => router.push('/')}
        />
      ) : activeFilter === 'all' && displayMode === 'reels' ? (
        /* Categorized Reels View (Stitch Feature) */
        <ScrollView
          style={styles.reelsScroll}
          contentContainerStyle={styles.reelsScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Watched Movies Reel */}
          {watchedMovies.length > 0 && (
            <View style={styles.reelSection}>
              <RowHeader title="Movies Watched" onSeeAll={() => setActiveFilter('movies')} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: Spacing.md }}
              >
                {watchedMovies.map((movie) => (
                  <View key={movie.tmdb_id} style={{ width: 130, marginRight: Spacing.xs + 2 }}>
                    <PosterGridCell
                      tmdbId={movie.tmdb_id}
                      title={movie.title}
                      posterPath={movie.poster_path}
                      releaseYear={movie.release_year}
                      rating={movie.my_rating}
                      onPress={() => navigateToDetail(movie.tmdb_id)}
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Watched Series Reel */}
          {watchedSeries.length > 0 && (
            <View style={styles.reelSection}>
              <RowHeader title="Series Watched" onSeeAll={() => setActiveFilter('series')} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: Spacing.md }}
              >
                {watchedSeries.map((show) => (
                  <View key={show.tmdb_id} style={{ width: 130, marginRight: Spacing.xs + 2 }}>
                    <PosterGridCell
                      tmdbId={show.tmdb_id}
                      title={show.name}
                      posterPath={show.poster_path}
                      releaseYear={show.first_air_year}
                      rating={show.my_rating}
                      onPress={() => router.push(`/series/${show.tmdb_id}`)}
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Watchlist Reel */}
          {watchlistItems.length > 0 && (
            <View style={styles.reelSection}>
              <RowHeader title="Watchlist" onSeeAll={() => setActiveFilter('watchlist')} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: Spacing.md }}
              >
                {watchlistItems.map((item) => (
                  <View key={`${item.mediaType}-${item.tmdb_id}`} style={{ width: 130, marginRight: Spacing.xs + 2 }}>
                    <PosterGridCell
                      tmdbId={item.tmdb_id}
                      title={(item as any).title ?? (item as any).name}
                      posterPath={item.poster_path}
                      releaseYear={(item as any).release_year ?? (item as any).first_air_year}
                      rating={item.my_rating}
                      onPress={() => navigateToItem(item)}
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* All Saved Titles Reel if no specific sub-filters populated */}
          {movies.length > 0 && watchedMovies.length === 0 && watchlistItems.length === 0 && ratedMovies.length === 0 && (
            <View style={styles.reelSection}>
              <RowHeader title="Saved in Vault" onSeeAll={() => setDisplayMode('grid')} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: Spacing.md }}
              >
                {movies.map((movie) => (
                  <View key={movie.tmdb_id} style={{ width: 130, marginRight: Spacing.xs + 2 }}>
                    <PosterGridCell
                      tmdbId={movie.tmdb_id}
                      title={movie.title}
                      posterPath={movie.poster_path}
                      releaseYear={movie.release_year}
                      rating={movie.my_rating}
                      onPress={() => navigateToDetail(movie.tmdb_id)}
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Top Rated Reel */}
          {ratedMovies.length > 0 && (
            <View style={styles.reelSection}>
              <RowHeader title="Your Top Ratings" onSeeAll={() => setActiveFilter('ratings')} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: Spacing.md }}
              >
                {ratedMovies.map((movie) => (
                  <View key={movie.tmdb_id} style={{ width: 130, marginRight: Spacing.xs + 2 }}>
                    <PosterGridCell
                      tmdbId={movie.tmdb_id}
                      title={movie.title}
                      posterPath={movie.poster_path}
                      releaseYear={movie.release_year}
                      rating={movie.my_rating}
                      onPress={() => navigateToDetail(movie.tmdb_id)}
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </ScrollView>
      ) : displayMode === 'grid' || (activeFilter !== 'all' && displayMode === 'reels') ? (
        /* Full Grid Mode */
        <FlashList
          data={
            activeFilter === 'series'
              ? series
              : activeFilter === 'watchlist'
              ? watchlistItems
              : activeFilter === 'ratings'
              ? ratedMovies
              : activeFilter === 'diary'
              ? (diaryItems as any)
              : watchedMovies.length > 0
              ? watchedMovies
              : movies
          }
          numColumns={3}
          keyExtractor={(item: any) =>
            `${item.mediaType ?? (activeFilter === 'series' ? 'series' : 'movie')}-${item.tmdb_id ?? item.tmdbId}`
          }
          contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingTop: Spacing.xs, paddingBottom: 130 }}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.xs }} />}
          renderItem={({ item }: { item: any }) => (
            <PosterGridCell
              tmdbId={item.tmdb_id ?? item.tmdbId}
              title={item.title ?? item.name}
              posterPath={item.poster_path ?? item.posterPath}
              releaseYear={item.release_year ?? item.releaseYear ?? item.first_air_year}
              rating={item.my_rating ?? item.rating}
              onPress={() => navigateToItem(item)}
              style={{ marginHorizontal: Spacing.xs / 2 }}
            />
          )}
        />
      ) : (
        /* List Mode */
        <View style={styles.listContainer}>
          <View
            style={[
              styles.insetGroupCard,
              { backgroundColor: colors.secondaryBackground, ...colors.cardShadow },
            ]}
          >
            <FlashList
              data={
                activeFilter === 'series'
                  ? series
                  : activeFilter === 'watchlist'
                  ? watchlistItems
                  : activeFilter === 'ratings'
                  ? ratedMovies
                  : activeFilter === 'diary'
                  ? (diaryItems as any)
                  : watchedMovies.length > 0
                  ? watchedMovies
                  : movies
              }
              keyExtractor={(item: any) =>
                `${item.mediaType ?? (activeFilter === 'series' ? 'series' : 'movie')}-${item.tmdb_id ?? item.tmdbId}`
              }
              contentContainerStyle={{ paddingBottom: 130 }}
              renderItem={({ item, index }: { item: any; index: number }) => (
                <CompactLibraryRow
                  title={item.title ?? item.name}
                  posterPath={item.poster_path ?? item.posterPath}
                  releaseYear={item.release_year ?? item.releaseYear ?? item.first_air_year}
                  rating={item.my_rating ?? item.rating}
                  watchedDate={item.watchedDate}
                  onPress={() => navigateToItem(item)}
                  isLast={index === movies.length - 1}
                />
              )}
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  brandLogo: {
    width: 30,
    height: 30,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeTitle: {
    fontSize: FontSize.title2,
    fontWeight: FontWeight.heavy,
    letterSpacing: -0.5,
  },
  profileAvatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBar: {
    paddingVertical: Spacing.xs,
  },
  filterScroll: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs + 2,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 3,
    borderRadius: Radius.pill,
  },
  filterChipText: {
    fontSize: FontSize.subheadline,
    letterSpacing: -0.1,
  },
  statsSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
  },
  statsCount: {
    fontSize: FontSize.caption1,
    fontWeight: FontWeight.semibold,
  },
  viewControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewToggleBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reelsScroll: {
    flex: 1,
  },
  reelsScrollContent: {
    paddingBottom: 130,
  },
  reelSection: {
    marginBottom: Spacing.md,
  },
  listContainer: {
    paddingHorizontal: Spacing.md,
  },
  insetGroupCard: {
    borderRadius: Radius.card,
    overflow: 'hidden',
    // @ts-ignore
    borderCurve: 'continuous',
  },
});
