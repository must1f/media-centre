import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { CardFeedItem } from '@/components/CardFeedItem';
import { LandscapeMediaCard } from '@/components/LandscapeMediaCard';
import { PosterGridCell } from '@/components/PosterGridCell';
import { FeaturedHeroBanner } from '@/components/FeaturedHeroBanner';
import { RowHeader } from '@/components/RowHeader';
import { ErrorState } from '@/components/ErrorState';
import { useTheme } from '@/context/ThemeContext';
import { FontSize, FontWeight, Radius, Spacing } from '@/constants/tokens';
import { getTrending, getTopRated, type TmdbMovie } from '@/services/tmdb';
import { getSuggestedForYou, getDiscoverSomethingNew } from '@/services/recommendations';
import { getTrendingSeries, type TmdbSeries } from '@/services/tmdbTv';
import { getAllCachedSeries, type Series } from '@/db/series';
import { getWatchedEpisodeCount, getTotalEpisodeCount } from '@/db/episodes';

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

function useSeriesRow(fetcher: () => Promise<TmdbSeries[]>) {
  const [series, setSeries] = useState<TmdbSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const data = await fetcher();
      setSeries(data);
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

  return { series, loading, error, reload: load };
}

interface SeriesRowProps {
  title: string;
  series: TmdbSeries[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}

function SeriesRow({ title, series, loading, error, onRetry }: SeriesRowProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.rowSection}>
      <RowHeader title={title} />
      {loading ? (
        <ActivityIndicator color={colors.accent} style={styles.rowLoader} />
      ) : error ? (
        <View style={styles.rowError}>
          <ErrorState body={`Could not load ${title.toLowerCase()}.`} onRetry={onRetry} />
        </View>
      ) : (
        <View style={{ minHeight: 220 }}>
          <FlashList
            horizontal
            data={series}
            keyExtractor={(item) => String(item.id)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: Spacing.md }}
            ItemSeparatorComponent={() => <View style={{ width: Spacing.xs }} />}
            renderItem={({ item }) => (
              <PosterGridCell
                tmdbId={item.id}
                title={item.name}
                posterPath={item.poster_path}
                releaseYear={item.first_air_date ? parseInt(item.first_air_date.slice(0, 4), 10) : null}
                onPress={() => router.push(`/series/${item.id}`)}
              />
            )}
          />
        </View>
      )}
    </View>
  );
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
  onSeeAll?: () => void;
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
  onSeeAll,
}: MovieRowProps) {
  const { colors } = useTheme();

  const isFallback = movies.length === 0 && !loading && !error && trendingFallback && trendingFallback.length > 0;
  const displayMovies = isFallback ? trendingFallback : movies;

  return (
    <View style={styles.rowSection}>
      <RowHeader title={title} onSeeAll={onSeeAll} />
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
        <View style={{ minHeight: 220 }}>
          <FlashList
            horizontal
            data={displayMovies}
            keyExtractor={(item) => String(item.id)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: Spacing.md }}
            ItemSeparatorComponent={() => <View style={{ width: Spacing.xs }} />}
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

interface InProgressSeries {
  series: Series;
  watched: number;
  total: number;
}

export default function HomeScreen() {
  const { colors, colorScheme } = useTheme();
  const trending = useMovieRow(getTrending);
  const topRated = useMovieRow(getTopRated);
  const suggested = useMovieRow(getSuggestedForYou);
  const discover = useMovieRow(getDiscoverSomethingNew);
  const trendingSeries = useSeriesRow(getTrendingSeries);

  const featuredMovie = trending.movies.length > 0 ? trending.movies[0] : null;

  // Mock continue watching items from trending/topRated for rich media demonstration
  const continueWatchingMovies = trending.movies.slice(1, 5);

  const [inProgressSeries, setInProgressSeries] = useState<InProgressSeries[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      const cached = getAllCachedSeries();
      const inProgress: InProgressSeries[] = [];
      for (const s of cached) {
        const watched = getWatchedEpisodeCount(s.tmdb_id);
        const total = getTotalEpisodeCount(s.tmdb_id);
        if (watched > 0 && watched < total) {
          inProgress.push({ series: s, watched, total });
        }
      }
      setInProgressSeries(inProgress);
    }, []),
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
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
              <SymbolView name="sparkles" size={16} tintColor="#FFFFFF" weight="heavy" />
            </View>
            <Text style={[styles.largeTitle, { color: colors.label }]}>Home</Text>
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
            accessibilityLabel="Go to Profile"
          >
            <SymbolView name="person.crop.circle.fill" size={26} tintColor={colors.accent} weight="medium" />
          </TouchableOpacity>
        </View>

        {/* Featured Hero Banner */}
        {featuredMovie && (
          <FeaturedHeroBanner
            movie={featuredMovie}
            onPress={() => router.push(`/movie/${featuredMovie.id}`)}
          />
        )}

        {/* Trending Now */}
        <MovieRow
          title="Trending Now"
          movies={trending.movies}
          loading={trending.loading}
          error={trending.error}
          onRetry={trending.reload}
          onSeeAll={() => router.push('/search')}
        />

        {/* Continue Watching Section (Stitch Design) */}
        {(continueWatchingMovies.length > 0 || inProgressSeries.length > 0) && (
          <View style={styles.rowSection}>
            <RowHeader title="Continue Watching" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: Spacing.md }}
            >
              {continueWatchingMovies.map((movie, idx) => (
                <LandscapeMediaCard
                  key={`movie-${movie.id}`}
                  title={movie.title}
                  backdropPath={movie.backdrop_path}
                  posterPath={movie.poster_path}
                  progressPercent={idx === 0 ? 65 : idx === 1 ? 40 : 80}
                  subtitle={idx === 0 ? '42m left' : idx === 1 ? '1h 10m left' : '15m left'}
                  onPress={() => router.push(`/movie/${movie.id}`)}
                />
              ))}
              {inProgressSeries.map(({ series, watched, total }) => (
                <LandscapeMediaCard
                  key={`series-${series.tmdb_id}`}
                  title={series.name}
                  posterPath={series.poster_path}
                  progressPercent={Math.round((watched / total) * 100)}
                  subtitle={`${watched}/${total} episodes`}
                  onPress={() => router.push(`/series/${series.tmdb_id}`)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Trending Shows */}
        <SeriesRow
          title="Trending Shows"
          series={trendingSeries.series}
          loading={trendingSeries.loading}
          error={trendingSeries.error}
          onRetry={trendingSeries.reload}
        />

        {/* Top 10 This Week */}
        <MovieRow
          title="Top 10 This Week"
          movies={topRated.movies}
          loading={topRated.loading}
          error={topRated.error}
          onRetry={topRated.reload}
          badge
        />

        {/* Suggested For You */}
        <MovieRow
          title="Suggested For You"
          movies={suggested.movies}
          loading={suggested.loading}
          error={suggested.error}
          onRetry={suggested.reload}
          trendingFallback={trending.movies}
          firstRunNote="Log some movies to personalise this row"
        />

        {/* Discover Something New */}
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
  scroll: { paddingBottom: 130 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
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
  rowSection: {
    marginBottom: Spacing.sm,
  },
  rowLoader: {
    marginVertical: Spacing.lg,
  },
  rowError: {
    height: 120,
    justifyContent: 'center',
  },
  firstRunNote: {
    fontSize: FontSize.caption1,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
  },
});
