import React, { useState } from 'react';
import {
  Modal,
  Pressable,
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
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { FontSize, FontWeight, Radius, Spacing } from '@/constants/tokens';
import { PosterGridCell } from '@/components/PosterGridCell';
import { CompactLibraryRow } from '@/components/CompactLibraryRow';
import { EmptyState } from '@/components/EmptyState';
import { RowHeader } from '@/components/RowHeader';
import { sortMovies, primaryGenreName, SORT_OPTIONS, type SortOption } from '@/services/librarySort';

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
  const [sortBy, setSortBy] = useState<SortOption | null>(null);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);

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
  const watchedMoviesBase = movies.filter((m) => watchedMovieIds.has(m.tmdb_id));

  const watchedSeriesIds = new Set(
    logEntries.filter((l) => l.media_type === 'series').map((l) => l.movie_id)
  );
  const watchedSeries = series.filter((s) => watchedSeriesIds.has(s.tmdb_id));

  const ratedMoviesBase = movies.filter((m) => m.my_rating !== null);

  const watchlistSet = new Set(watchlistIds);
  const watchlistMoviesBase = movies.filter((m) => watchlistSet.has(m.tmdb_id));

  const watchlistSeriesSet = new Set(watchlistSeriesIds);
  const watchlistSeries = series.filter((s) => watchlistSeriesSet.has(s.tmdb_id));

  // Apply the active sort (falling back to sensible defaults per section when none chosen)
  const watchedMovies = sortBy ? sortMovies(watchedMoviesBase, sortBy, logEntries) : watchedMoviesBase;
  const ratedMovies = sortBy
    ? sortMovies(ratedMoviesBase, sortBy, logEntries)
    : sortMovies(ratedMoviesBase, 'rating', logEntries);
  const watchlistMovies = sortBy ? sortMovies(watchlistMoviesBase, sortBy, logEntries) : watchlistMoviesBase;
  const sortedMovies = sortBy ? sortMovies(movies, sortBy, logEntries) : movies;

  // Combined watchlist (movies + series) for the "Watchlist" reel/filter/grid/list.
  const watchlistItems = [
    ...watchlistMovies.map((m) => ({ ...m, mediaType: 'movie' as const })),
    ...watchlistSeries.map((s) => ({ ...s, mediaType: 'series' as const })),
  ];

  const diaryItemsBase = logEntries.map((log) => {
    const movie = movies.find((m) => m.tmdb_id === log.movie_id);
    return {
      logId: log.id,
      tmdbId: log.movie_id,
      title: movie?.title ?? 'Unknown Movie',
      posterPath: movie?.poster_path ?? null,
      releaseYear: movie?.release_year ?? null,
      rating: movie?.my_rating ?? null,
      genre: primaryGenreName(movie?.genres ?? null),
      watchedDate: log.watched_date,
    };
  });

  const diaryItems = sortBy
    ? [...diaryItemsBase].sort((a, b) => {
        switch (sortBy) {
          case 'rating':
            return (b.rating ?? -1) - (a.rating ?? -1);
          case 'title':
            return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
          case 'genre':
            if (a.genre === '' && b.genre === '') return 0;
            if (a.genre === '') return 1;
            if (b.genre === '') return -1;
            return a.genre.toLowerCase().localeCompare(b.genre.toLowerCase());
          case 'dateWatched':
          default:
            return b.watchedDate.localeCompare(a.watchedDate);
        }
      })
    : diaryItemsBase;

  const totalVaultCount = movies.length + watchlistMoviesBase.length + watchlistSeries.length + series.length;

  // The single data set currently on screen for grid/list mode, respecting both the active filter and sort.
  const listModeData: any[] =
    activeFilter === 'watchlist'
      ? watchlistItems
      : activeFilter === 'ratings'
      ? ratedMovies
      : activeFilter === 'diary'
      ? diaryItems
      : activeFilter === 'series'
      ? watchedSeries.length > 0
        ? watchedSeries
        : series
      : watchedMovies.length > 0
      ? watchedMovies
      : sortedMovies;

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
              styles.sortButton,
              {
                backgroundColor: sortBy ? colors.secondaryBackground : 'transparent',
                borderColor: sortBy ? colors.accent : colors.separator,
                borderWidth: 1,
              },
            ]}
            onPress={() => setSortMenuVisible(true)}
            activeOpacity={0.8}
            accessibilityLabel="Sort library"
            accessibilityRole="button"
          >
            <SymbolView
              name="arrow.up.arrow.down"
              size={13}
              tintColor={sortBy ? colors.accent : colors.secondaryLabel}
              weight="semibold"
            />
            <Text
              style={[
                styles.sortButtonText,
                { color: sortBy ? colors.accent : colors.secondaryLabel },
              ]}
            >
              {sortBy ? SORT_OPTIONS.find((o) => o.id === sortBy)?.label : 'Sort'}
            </Text>
          </TouchableOpacity>

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
                {sortedMovies.map((movie) => (
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
          data={listModeData}
          numColumns={3}
          keyExtractor={(item: any) =>
            item.logId != null
              ? `log-${item.logId}`
              : `${item.mediaType ?? (activeFilter === 'series' ? 'series' : 'movie')}-${item.tmdb_id ?? item.tmdbId}`
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
              data={listModeData}
              keyExtractor={(item: any) =>
                item.logId != null
                  ? `log-${item.logId}`
                  : `${item.mediaType ?? (activeFilter === 'series' ? 'series' : 'movie')}-${item.tmdb_id ?? item.tmdbId}`
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
                  isLast={index === listModeData.length - 1}
                />
              )}
            />
          </View>
        </View>
      )}

      {/* Sort Menu */}
      <Modal
        visible={sortMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSortMenuVisible(false)}
      >
        <Pressable
          style={styles.sortMenuBackdrop}
          onPress={() => setSortMenuVisible(false)}
          accessibilityLabel="Close sort menu"
        >
          <Pressable
            style={[
              styles.sortMenuCard,
              { backgroundColor: colors.secondaryBackground, ...colors.cardShadow },
            ]}
            onPress={() => {}}
          >
            <Text style={[styles.sortMenuHeader, { color: colors.secondaryLabel }]}>Sort By</Text>
            {SORT_OPTIONS.map((option) => {
              const isActive = sortBy === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={styles.sortMenuItem}
                  activeOpacity={0.7}
                  accessibilityLabel={`Sort by ${option.label}`}
                  accessibilityRole="menuitem"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSortBy(isActive ? null : option.id);
                    setSortMenuVisible(false);
                  }}
                >
                  <View style={styles.sortMenuItemLabel}>
                    <SymbolView
                      name={option.icon as any}
                      size={15}
                      tintColor={isActive ? colors.accent : colors.secondaryLabel}
                      weight="medium"
                    />
                    <Text
                      style={[
                        styles.sortMenuItemText,
                        { color: isActive ? colors.accent : colors.label, fontWeight: isActive ? FontWeight.semibold : FontWeight.regular },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </View>
                  {isActive && <SymbolView name="checkmark" size={14} tintColor={colors.accent} weight="bold" />}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
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
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.sm,
    height: 30,
    borderRadius: Radius.small,
  },
  sortButtonText: {
    fontSize: FontSize.caption1,
    fontWeight: FontWeight.semibold,
  },
  sortMenuBackdrop: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  sortMenuCard: {
    marginTop: 220,
    marginRight: Spacing.md,
    minWidth: 190,
    borderRadius: Radius.medium,
    paddingVertical: Spacing.xs,
    overflow: 'hidden',
    // @ts-ignore
    borderCurve: 'continuous',
  },
  sortMenuHeader: {
    fontSize: FontSize.caption2,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  sortMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  sortMenuItemLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sortMenuItemText: {
    fontSize: FontSize.subheadline,
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
