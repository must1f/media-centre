import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  SegmentedControlIOS, // Fallback to custom segment bar for Android/Web compatibility
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useTheme } from '@/context/ThemeContext';
import { FontSize, FontWeight, Spacing } from '@/constants/tokens';
import { PosterGridCell } from '@/components/PosterGridCell';
import { CompactLibraryRow } from '@/components/CompactLibraryRow';
import { EmptyState } from '@/components/EmptyState';

// DB CRUD functions
import { getAllCachedMovies, getRatedMovies, type Movie } from '@/db/movies';
import { getAllLogEntries, type LogEntry } from '@/db/logEntries';
import { getWatchlistIds } from '@/db/watchlist';

type TabType = 'watched' | 'diary' | 'ratings' | 'watchlist';
type ViewMode = 'grid' | 'list';

export default function LibraryScreen() {
  const { colors } = useTheme();
  
  // State
  const [activeTab, setActiveTab] = useState<TabType>('watched');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  // Data State
  const [movies, setMovies] = useState<Movie[]>([]);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [watchlistIds, setWatchlistIds] = useState<number[]>([]);

  // Refresh data every time the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      setMovies(getAllCachedMovies());
      setLogEntries(getAllLogEntries());
      setWatchlistIds(getWatchlistIds());
    }, [])
  );

  // Derived data sets
  // 1. Watched Movies (Unique movies that have at least one LogEntry)
  const watchedMovieIds = new Set(logEntries.map((l) => l.movie_id));
  const watchedMovies = movies.filter((m) => watchedMovieIds.has(m.tmdb_id));

  // 2. Rated Movies
  const ratedMovies = movies.filter((m) => m.my_rating !== null)
    .sort((a, b) => (b.my_rating ?? 0) - (a.my_rating ?? 0));

  // 3. Watchlist Movies
  const watchlistSet = new Set(watchlistIds);
  const watchlistMovies = movies.filter((m) => watchlistSet.has(m.tmdb_id));

  // 4. Diary Entries (Log entries enriched with Movie metadata)
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

  const renderHeader = () => {
    return (
      <View style={styles.header}>
        <Text style={[styles.largeTitle, { color: colors.label }]}>Library</Text>
        <TouchableOpacity
          onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          style={[styles.toggleButton, { borderColor: colors.separator }]}
          accessibilityRole="button"
          accessibilityLabel={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
        >
          <Text style={{ color: colors.accent, fontSize: FontSize.subheadline, fontWeight: FontWeight.semibold }}>
            {viewMode === 'grid' ? 'List View' : 'Grid View'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderTabs = () => {
    const tabs: { type: TabType; label: string }[] = [
      { type: 'watched', label: 'Watched' },
      { type: 'diary', label: 'Diary' },
      { type: 'ratings', label: 'Ratings' },
      { type: 'watchlist', label: 'Watchlist' },
    ];

    return (
      <View style={[styles.tabsContainer, { borderBottomColor: colors.separator }]}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.type;
          return (
            <TouchableOpacity
              key={tab.type}
              style={[
                styles.tabButton,
                isActive && { borderBottomColor: colors.accent },
              ]}
              onPress={() => setActiveTab(tab.type)}
            >
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? colors.accent : colors.secondaryLabel },
                  isActive && { fontWeight: FontWeight.bold },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const navigateToDetail = (tmdbId: number) => {
    router.push(`/movie/${tmdbId}`);
  };

  const renderContent = () => {
    if (activeTab === 'watched') {
      if (watchedMovies.length === 0) {
        return (
          <EmptyState
            title="No watched movies yet"
            body="Movies you watch and log will appear here."
            ctaLabel="Go Search"
            onCtaPress={() => router.push('/search')}
          />
        );
      }
      return viewMode === 'grid' ? (
        <FlashList
          data={watchedMovies}
          numColumns={3}
          keyExtractor={(item) => String(item.tmdb_id)}
          estimatedItemSize={165}
          contentContainerStyle={{ padding: Spacing.sm, paddingBottom: 120 }}
          renderItem={({ item }) => (
            <PosterGridCell
              tmdbId={item.tmdb_id}
              title={item.title}
              posterPath={item.poster_path}
              releaseYear={item.release_year}
              onPress={() => navigateToDetail(item.tmdb_id)}
              style={{ marginHorizontal: Spacing.xs / 2, marginBottom: Spacing.sm }}
            />
          )}
        />
      ) : (
        <FlashList
          data={watchedMovies}
          keyExtractor={(item) => String(item.tmdb_id)}
          estimatedItemSize={70}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item }) => (
            <CompactLibraryRow
              title={item.title}
              posterPath={item.poster_path}
              releaseYear={item.release_year}
              rating={item.my_rating}
              onPress={() => navigateToDetail(item.tmdb_id)}
            />
          )}
        />
      );
    }

    if (activeTab === 'diary') {
      if (diaryItems.length === 0) {
        return (
          <EmptyState
            title="Your diary is empty"
            body="Log a watch entry to start keeping track of your media journey."
            ctaLabel="Browse Trending"
            onCtaPress={() => router.push('/')}
          />
        );
      }
      return viewMode === 'grid' ? (
        <FlashList
          data={diaryItems}
          numColumns={3}
          keyExtractor={(item) => `${item.logId}`}
          estimatedItemSize={165}
          contentContainerStyle={{ padding: Spacing.sm, paddingBottom: 120 }}
          renderItem={({ item }) => (
            <PosterGridCell
              tmdbId={item.tmdbId}
              title={item.title}
              posterPath={item.posterPath}
              releaseYear={item.releaseYear}
              onPress={() => navigateToDetail(item.tmdbId)}
              style={{ marginHorizontal: Spacing.xs / 2, marginBottom: Spacing.sm }}
            />
          )}
        />
      ) : (
        <FlashList
          data={diaryItems}
          keyExtractor={(item) => `${item.logId}`}
          estimatedItemSize={70}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item }) => (
            <CompactLibraryRow
              title={item.title}
              posterPath={item.posterPath}
              releaseYear={item.releaseYear}
              rating={item.rating}
              watchedDate={item.watchedDate}
              onPress={() => navigateToDetail(item.tmdbId)}
            />
          )}
        />
      );
    }

    if (activeTab === 'ratings') {
      if (ratedMovies.length === 0) {
        return (
          <EmptyState
            title="No ratings yet"
            body="Rate movies when you log them or edit them from the details page."
            ctaLabel="Go Rate Movies"
            onCtaPress={() => router.push('/')}
          />
        );
      }
      return viewMode === 'grid' ? (
        <FlashList
          data={ratedMovies}
          numColumns={3}
          keyExtractor={(item) => String(item.tmdb_id)}
          estimatedItemSize={165}
          contentContainerStyle={{ padding: Spacing.sm, paddingBottom: 120 }}
          renderItem={({ item }) => (
            <PosterGridCell
              tmdbId={item.tmdb_id}
              title={item.title}
              posterPath={item.poster_path}
              releaseYear={item.release_year}
              onPress={() => navigateToDetail(item.tmdb_id)}
              style={{ marginHorizontal: Spacing.xs / 2, marginBottom: Spacing.sm }}
            />
          )}
        />
      ) : (
        <FlashList
          data={ratedMovies}
          keyExtractor={(item) => String(item.tmdb_id)}
          estimatedItemSize={70}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item }) => (
            <CompactLibraryRow
              title={item.title}
              posterPath={item.poster_path}
              releaseYear={item.release_year}
              rating={item.my_rating}
              onPress={() => navigateToDetail(item.tmdb_id)}
            />
          )}
        />
      );
    }

    if (activeTab === 'watchlist') {
      if (watchlistMovies.length === 0) {
        return (
          <EmptyState
            title="Your watchlist is empty"
            body="Bookmark movies to watch them later."
            ctaLabel="Find Movies"
            onCtaPress={() => router.push('/search')}
          />
        );
      }
      return viewMode === 'grid' ? (
        <FlashList
          data={watchlistMovies}
          numColumns={3}
          keyExtractor={(item) => String(item.tmdb_id)}
          estimatedItemSize={165}
          contentContainerStyle={{ padding: Spacing.sm, paddingBottom: 120 }}
          renderItem={({ item }) => (
            <PosterGridCell
              tmdbId={item.tmdb_id}
              title={item.title}
              posterPath={item.poster_path}
              releaseYear={item.release_year}
              onPress={() => navigateToDetail(item.tmdb_id)}
              style={{ marginHorizontal: Spacing.xs / 2, marginBottom: Spacing.sm }}
            />
          )}
        />
      ) : (
        <FlashList
          data={watchlistMovies}
          keyExtractor={(item) => String(item.tmdb_id)}
          estimatedItemSize={70}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item }) => (
            <CompactLibraryRow
              title={item.title}
              posterPath={item.poster_path}
              releaseYear={item.release_year}
              rating={item.my_rating}
              onPress={() => navigateToDetail(item.tmdb_id)}
            />
          )}
        />
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {renderHeader()}
      {renderTabs()}
      {renderContent()}
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
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  largeTitle: {
    fontSize: FontSize.largeTitle,
    fontWeight: FontWeight.bold,
  },
  toggleButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.xs,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    fontSize: FontSize.subheadline,
  },
});
