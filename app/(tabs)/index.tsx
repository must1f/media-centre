/**
 * Home Screen — Stitch CineVault Modern design fidelity implementation.
 *
 * Matches exactly: projects/13266612319433074653/screens/2961879d3c864dc4b98ebb9327150e87
 */
import React, { useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { LinearGradient } from 'expo-linear-gradient';
import { ErrorState } from '@/components/ErrorState';
import { useTheme } from '@/context/ThemeContext';
import { backdropUrl, posterUrl } from '@/constants/tokens';
import { getTrending, getTopRated, type TmdbMovie } from '@/services/tmdb';
import { getSuggestedForYou, getDiscoverSomethingNew } from '@/services/recommendations';
import { getTrendingSeries, type TmdbSeries } from '@/services/tmdbTv';
import { getAllCachedSeries, type Series } from '@/db/series';
import { getWatchedEpisodeCount, getTotalEpisodeCount } from '@/db/episodes';

const { width: SW } = Dimensions.get('window');

// ─── Stitch Design Tokens ─────────────────────────────────────────────────────
const STITCH = {
  background: '#131313',
  surfaceContainer: '#201f1f',
  surfaceContainerHigh: '#2a2a2a',
  surfaceContainerHighest: '#353534',
  surfaceBright: '#3a3939',
  onSurface: '#e5e2e1',
  onSurfaceVariant: '#e9bcb6',
  primary: '#ffb4aa',
  primaryContainer: '#e50914',
  secondary: '#c8c6c6',
  outline: '#af8782',
  outlineVariant: '#5e3f3b',
};

// ─── Custom Hooks ─────────────────────────────────────────────────────────────
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

  useEffect(() => { load(); }, []);
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

  useEffect(() => { load(); }, []);
  return { series, loading, error, reload: load };
}

// ─── Stitch Movie Tile (140px wide, 2:3 ratio, inner white border, red glow on press) ─
function StitchMovieTile({ movie, onPress }: { movie: TmdbMovie; onPress: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const imgUri = posterUrl(movie.poster_path, 'w342');

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1.05, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };
  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[styles.movieTile, { transform: [{ scale: scaleAnim }] }]}>
        {/* Poster image */}
        {imgUri ? (
          <Image source={{ uri: imgUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: STITCH.surfaceContainerHigh }]} />
        )}
        {/* Inner white border — Stitch: shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] */}
        <View style={styles.movieTileInnerBorder} />
        {/* Red glow border on press — Stitch: inset 0 0 0 2px #e50914, 0 0 20px rgba(229,9,20,0.3) */}
        <Animated.View style={[styles.movieTileGlowBorder, { opacity: glowAnim }]} />
      </Animated.View>
    </Pressable>
  );
}

// ─── Stitch Series Tile ───────────────────────────────────────────────────────
function StitchSeriesTile({ item, onPress }: { item: TmdbSeries; onPress: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const imgUri = posterUrl(item.poster_path, 'w342');

  const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 1.05, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[styles.movieTile, { transform: [{ scale: scaleAnim }] }]}>
        {imgUri ? (
          <Image source={{ uri: imgUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: STITCH.surfaceContainerHigh }]} />
        )}
        <View style={styles.movieTileInnerBorder} />
      </Animated.View>
    </Pressable>
  );
}

// ─── Continue Watching Tile (240px wide landscape, Stitch spec) ───────────────
function ContinueWatchingTile({
  movie,
  progressPercent,
  subtitle,
  onPress,
}: {
  movie: TmdbMovie;
  progressPercent: number;
  subtitle: string;
  onPress: () => void;
}) {
  const imgUri = backdropUrl(movie.backdrop_path, 'w780') ?? posterUrl(movie.poster_path, 'w342');
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 1.03, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[styles.cwTile, { transform: [{ scale: scaleAnim }] }]}>
        {/* Video thumbnail */}
        <View style={styles.cwThumb}>
          {imgUri ? (
            <Image source={{ uri: imgUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : null}
          {/* Dark overlay */}
          <View style={styles.cwThumbOverlay} />
          {/* Play button overlay */}
          <View style={styles.cwPlayOverlay}>
            <SymbolView name="play.fill" size={18} tintColor="#FFFFFF" weight="heavy" />
          </View>
        </View>
        {/* Red progress bar — Stitch: h-1 bg-surface-bright, fill bg-primary-container (#e50914) */}
        <View style={styles.cwProgressTrack}>
          <View style={[styles.cwProgressFill, { width: `${Math.min(progressPercent, 100)}%` as any }]} />
        </View>
        {/* Metadata */}
        <View style={styles.cwMeta}>
          <Text style={styles.cwTitle} numberOfLines={1}>{movie.title}</Text>
          <Text style={styles.cwSubtitle}>{subtitle}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

// ─── Section Header (Stitch: headline-md 24px/600 + "See All" in primary) ────
function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onSeeAll ? (
        <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7}>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ─── Movie Row ────────────────────────────────────────────────────────────────
function MovieRow({
  title,
  movies,
  loading,
  error,
  onRetry,
  onSeeAll,
}: {
  title: string;
  movies: TmdbMovie[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onSeeAll?: () => void;
}) {
  return (
    <View style={styles.rowSection}>
      <SectionHeader title={title} onSeeAll={onSeeAll} />
      {loading ? (
        <ActivityIndicator color={STITCH.primaryContainer} style={styles.rowLoader} />
      ) : error ? (
        <View style={styles.rowError}>
          <ErrorState body={`Could not load ${title.toLowerCase()}.`} onRetry={onRetry} />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rowScroll}
          decelerationRate="fast"
          snapToInterval={140 + 12}
          snapToAlignment="start"
        >
          {movies.map((movie) => (
            <View key={movie.id} style={styles.tileSpacer}>
              <StitchMovieTile
                movie={movie}
                onPress={() => router.push(`/movie/${movie.id}`)}
              />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Series Row ───────────────────────────────────────────────────────────────
function SeriesRow({
  title,
  series,
  loading,
  error,
  onRetry,
}: {
  title: string;
  series: TmdbSeries[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  return (
    <View style={styles.rowSection}>
      <SectionHeader title={title} />
      {loading ? (
        <ActivityIndicator color={STITCH.primaryContainer} style={styles.rowLoader} />
      ) : error ? (
        <View style={styles.rowError}>
          <ErrorState body={`Could not load ${title.toLowerCase()}.`} onRetry={onRetry} />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rowScroll}
          decelerationRate="fast"
          snapToInterval={140 + 12}
          snapToAlignment="start"
        >
          {series.map((item) => (
            <View key={item.id} style={styles.tileSpacer}>
              <StitchSeriesTile
                item={item}
                onPress={() => router.push(`/series/${item.id}`)}
              />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

interface InProgressSeries {
  series: Series;
  watched: number;
  total: number;
}

// ─── Main Home Screen ─────────────────────────────────────────────────────────
export default function HomeScreen() {
  const trending = useMovieRow(getTrending);
  const topRated = useMovieRow(getTopRated);
  const suggested = useMovieRow(getSuggestedForYou);
  const discover = useMovieRow(getDiscoverSomethingNew);
  const trendingSeries = useSeriesRow(getTrendingSeries);
  const [inProgressSeries, setInProgressSeries] = useState<InProgressSeries[]>([]);

  const featuredMovie = trending.movies.length > 0 ? trending.movies[0] : null;
  const continueWatchingMovies = trending.movies.slice(1, 5);

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

  const heroImageUri = featuredMovie
    ? (backdropUrl(featuredMovie.backdrop_path, 'w1280') ?? posterUrl(featuredMovie.poster_path, 'w780'))
    : null;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Stitch Hero Section ── */}
        {/* Stitch: relative w-full h-[618px] flex flex-col justify-end */}
        <View style={styles.hero}>
          {/* Background image — full bleed */}
          {heroImageUri ? (
            <Image
              source={{ uri: heroImageUri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: STITCH.surfaceContainer }]} />
          )}

          {/* Gradient: bg-gradient-to-t from-background via-background/60 to-transparent */}
          <LinearGradient
            colors={['rgba(19,19,19,0)', 'rgba(19,19,19,0.6)', '#131313']}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
          {/* Gradient: bg-gradient-to-r from-background/80 via-transparent to-transparent */}
          <LinearGradient
            colors={['rgba(19,19,19,0.8)', 'rgba(19,19,19,0.2)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 0.6, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Hero content */}
          <View style={styles.heroContent}>
            {/* Badges row */}
            <View style={styles.heroBadgeRow}>
              {/* Exclusive pill badge */}
              <View style={styles.exclusiveBadge}>
                <Text style={styles.exclusiveBadgeText}>EXCLUSIVE</Text>
              </View>
              {/* #1 Today red badge */}
              <View style={styles.trendingBadge}>
                <SymbolView name="chart.line.uptrend.xyaxis" size={12} tintColor={STITCH.primary} weight="bold" />
                <Text style={styles.trendingBadgeText}>#1 Today</Text>
              </View>
            </View>

            {/* Movie Title — Stitch: font-display-lg text-display-lg (48px 800) */}
            {featuredMovie ? (
              <Text style={styles.heroTitle} numberOfLines={2}>{featuredMovie.title}</Text>
            ) : null}

            {/* Overview */}
            {featuredMovie?.overview ? (
              <Text style={styles.heroOverview} numberOfLines={2}>{featuredMovie.overview}</Text>
            ) : null}

            {/* CTA row — Watch Now + glass + */}
            <View style={styles.heroCtaRow}>
              {/* Watch Now — Stitch: bg-primary-container text-on-primary-container rounded-[12px] shadow-[0_8px_24px_rgba(229,9,20,0.4)] */}
              <TouchableOpacity
                style={styles.watchNowBtn}
                onPress={() => featuredMovie && router.push(`/movie/${featuredMovie.id}`)}
                activeOpacity={0.85}
              >
                <SymbolView name="play.fill" size={16} tintColor="#FFFFFF" weight="heavy" />
                <Text style={styles.watchNowText}>Watch Now</Text>
              </TouchableOpacity>
              {/* Glass + button — Stitch: w-[52px] h-[52px] bg-white/10 backdrop-blur rounded-[12px] */}
              <TouchableOpacity
                style={styles.glassPlusBtn}
                onPress={() => featuredMovie && router.push(`/movie/${featuredMovie.id}`)}
                activeOpacity={0.7}
              >
                <SymbolView name="plus" size={20} tintColor="#FFFFFF" weight="bold" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Content Sections ── */}
        <View style={styles.sections}>

          {/* Trending Now */}
          <MovieRow
            title="Trending Now"
            movies={trending.movies}
            loading={trending.loading}
            error={trending.error}
            onRetry={trending.reload}
            onSeeAll={() => router.push('/search')}
          />

          {/* Continue Watching */}
          {(continueWatchingMovies.length > 0 || inProgressSeries.length > 0) && (
            <View style={styles.rowSection}>
              <SectionHeader title="Continue Watching" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.rowScroll}
                decelerationRate="fast"
              >
                {continueWatchingMovies.map((movie, idx) => (
                  <View key={`cw-${movie.id}`} style={styles.cwSpacer}>
                    <ContinueWatchingTile
                      movie={movie}
                      progressPercent={idx === 0 ? 65 : idx === 1 ? 40 : 80}
                      subtitle={idx === 0 ? '42m left' : idx === 1 ? '1h 10m left' : '15m left'}
                      onPress={() => router.push(`/movie/${movie.id}`)}
                    />
                  </View>
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
          />

          {/* Suggested For You */}
          <MovieRow
            title="Suggested For You"
            movies={suggested.movies.length > 0 ? suggested.movies : trending.movies}
            loading={suggested.loading && trending.loading}
            error={suggested.error}
            onRetry={suggested.reload}
          />

          {/* Discover Something New */}
          <MovieRow
            title="Discover Something New"
            movies={discover.movies.length > 0 ? discover.movies : trending.movies}
            loading={discover.loading && trending.loading}
            error={discover.error}
            onRetry={discover.reload}
          />
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: STITCH.background,
  },
  scroll: {
    paddingBottom: 140,
  },

  // ── Hero ──────────────────────────────────────────────────────────────────
  // Stitch: relative w-full h-[618px] flex flex-col justify-end
  hero: {
    width: SW,
    height: 618,
    justifyContent: 'flex-end',
  },
  heroContent: {
    // Stitch: relative z-10 px-margin-mobile pb-stack-md flex flex-col gap-stack-sm
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 8,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  // Stitch: px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-label-sm uppercase tracking-widest shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]
  exclusiveBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  exclusiveBadgeText: {
    color: STITCH.onSurface,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  // Stitch: text-primary text-label-sm uppercase flex items-center gap-1
  trendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendingBadgeText: {
    color: STITCH.primary,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  // Stitch: font-display-lg text-display-lg (48px 800 letterSpacing -0.02em)
  heroTitle: {
    color: STITCH.onSurface,
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -0.96,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  // Stitch: font-body-md text-on-surface-variant line-clamp-2 max-w-[85%]
  heroOverview: {
    color: STITCH.onSurfaceVariant,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    maxWidth: '85%',
  },
  heroCtaRow: {
    // Stitch: flex gap-3 mt-stack-sm
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    alignItems: 'center',
  },
  // Stitch: flex-1 bg-primary-container text-on-primary-container py-3.5 rounded-[12px] shadow-[0_8px_24px_rgba(229,9,20,0.4)]
  watchNowBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: STITCH.primaryContainer, // #e50914
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#e50914',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  watchNowText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  // Stitch: w-[52px] h-[52px] shrink-0 bg-white/10 backdrop-blur rounded-[12px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]
  glassPlusBtn: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },

  // ── Sections ──────────────────────────────────────────────────────────────
  sections: {
    // Stitch: flex flex-col gap-stack-lg pb-stack-lg relative z-20 -mt-4
    gap: 40,
    paddingBottom: 40,
    marginTop: -4,
  },
  rowSection: {
    gap: 12,
  },
  // Stitch: px-margin-mobile flex items-end justify-between
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  // Stitch: font-headline-md text-headline-md (24px 600) tracking-tight
  sectionTitle: {
    color: STITCH.onSurface,
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  // Stitch: text-label-sm text-primary hover:text-primary-fixed
  seeAll: {
    color: STITCH.primary,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  rowScroll: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  tileSpacer: {
    marginRight: 12,
  },
  rowLoader: {
    marginVertical: 32,
  },
  rowError: {
    height: 120,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  // ── Stitch Movie Tile ─────────────────────────────────────────────────────
  // Stitch: snap-start shrink-0 w-[140px] aspect-[2/3] rounded-[16px] bg-surface-container
  //         shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]
  movieTile: {
    width: 140,
    height: 210, // 2:3 ratio
    borderRadius: 16,
    backgroundColor: STITCH.surfaceContainer,
    overflow: 'hidden',
  },
  // Inner white border
  movieTileInnerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  // Red glow border on press — Stitch: inset 0 0 0 2px #e50914, 0 0 20px rgba(229,9,20,0.3)
  movieTileGlowBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e50914',
    shadowColor: '#e50914',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },

  // ── Continue Watching Tile ────────────────────────────────────────────────
  // Stitch: snap-start shrink-0 w-[240px] flex flex-col gap-2
  cwTile: {
    width: 240,
    gap: 8,
  },
  cwSpacer: {
    marginRight: 16,
  },
  // Stitch: relative w-full aspect-video rounded-[12px] overflow-hidden
  cwThumb: {
    width: 240,
    height: 135, // 16:9
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: STITCH.surfaceContainer,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cwThumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  // Stitch: absolute inset-0 bg-black/20 flex items-center justify-center
  cwPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Stitch: w-full h-1 bg-surface-bright rounded-full overflow-hidden
  cwProgressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: STITCH.surfaceBright, // '#3a3939'
    borderRadius: 9999,
    overflow: 'hidden',
  },
  // Stitch: h-full bg-primary-container (#e50914)
  cwProgressFill: {
    height: '100%',
    backgroundColor: STITCH.primaryContainer, // '#e50914'
    borderRadius: 9999,
  },
  cwMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  cwTitle: {
    color: STITCH.onSurface,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  cwSubtitle: {
    color: STITCH.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '500',
  },
});
