import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { CardFeedItem } from '@/components/CardFeedItem';
import { RowHeader } from '@/components/RowHeader';
import { ErrorState } from '@/components/ErrorState';
import { useTheme } from '@/context/ThemeContext';
import { FontSize, FontWeight, Spacing } from '@/constants/tokens';
import { getTrending, getTopRated, type TmdbMovie } from '@/services/tmdb';
import { getSuggestedForYou, getDiscoverSomethingNew } from '@/services/recommendations';

function useMovieRow(fetcher: () => Promise<TmdbMovie[]>) {
  const [movies, setMovies] = useState<TmdbMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const data = await fetcher();
      setMovies(data);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return { movies, loading, error, reload: load };
}

interface MovieRowProps {
  title: string;
  movies: TmdbMovie[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  badge?: boolean;
  firstRunNote?: string;
  trendingFallback?: TmdbMovie[];
}

function MovieRow({
  title,
  movies,
  loading,
  error,
  onRetry,
  badge,
  firstRunNote,
  trendingFallback,
}: MovieRowProps) {
  const { colors } = useTheme();
  
  // Fall back to trending if no movies returned (first-run personalisation check)
  const isFallback = movies.length === 0 && !loading && !error && trendingFallback && trendingFallback.length > 0;
  const displayMovies = isFallback ? trendingFallback : movies;

  return (
    <View style={styles.rowSection}>
      <RowHeader title={title} />
      {isFallback && firstRunNote ? (
        <Text style={[styles.firstRunNote, { color: colors.secondaryLabel }]}>
          {firstRunNote}
        </Text>
      ) : null}
      {loading ? (
        <ActivityIndicator color={colors.accent} style={styles.rowLoader} />
      ) : error ? (
        <View style={styles.rowError}>
          <ErrorState body={`Could not load ${title.toLowerCase()}.`} onRetry={onRetry} />
        </View>
      ) : (
        <View style={{ minHeight: 250 }}>
          <FlashList
            horizontal
            data={displayMovies}
            keyExtractor={(item) => String(item.id)}
            estimatedItemSize={165}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: Spacing.md }}
            ItemSeparatorComponent={() => <View style={{ width: Spacing.sm }} />}
            renderItem={({ item, index }) => (
              <CardFeedItem
                tmdbId={item.id}
                title={item.title}
                posterPath={item.poster_path}
                releaseYear={item.release_date ? parseInt(item.release_date.slice(0, 4), 10) : null}
                badge={badge ? index + 1 : undefined}
                onPress={() => router.push(`/movie/${item.id}`)}
              />
            )}
          />
        </View>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const trending = useMovieRow(getTrending);
  const topRated = useMovieRow(getTopRated);
  const suggested = useMovieRow(getSuggestedForYou);
  const discover = useMovieRow(getDiscoverSomethingNew);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.largeTitle, { color: colors.label }]}>Home</Text>
        </View>

        <MovieRow
          title="Trending Now"
          movies={trending.movies}
          loading={trending.loading}
          error={trending.error}
          onRetry={trending.reload}
        />

        <MovieRow
          title="Top 10 This Week"
          movies={topRated.movies}
          loading={topRated.loading}
          error={topRated.error}
          onRetry={topRated.reload}
          badge
        />

        <MovieRow
          title="Suggested For You"
          movies={suggested.movies}
          loading={suggested.loading}
          error={suggested.error}
          onRetry={suggested.reload}
          trendingFallback={trending.movies}
          firstRunNote="Log some movies to personalise this row"
        />

        <MovieRow
          title="Discover Something New"
          movies={discover.movies}
          loading={discover.loading}
          error={discover.error}
          onRetry={discover.reload}
          trendingFallback={trending.movies}
          firstRunNote="Log some movies to personalise this row"
        />
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
    paddingBottom: Spacing.xs,
  },
  largeTitle: {
    fontSize: FontSize.largeTitle,
    fontWeight: FontWeight.bold,
  },
  rowSection: {
    marginBottom: Spacing.md,
  },
  rowLoader: {
    marginVertical: Spacing.lg,
  },
  rowError: {
    height: 120,
    justifyContent: 'center',
  },
  firstRunNote: {
    fontSize: FontSize.caption,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
  },
});
