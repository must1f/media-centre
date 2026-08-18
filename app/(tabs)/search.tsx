import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { SymbolView } from 'expo-symbols';
import { GenreTile } from '@/components/GenreTile';
import { PosterGridCell } from '@/components/PosterGridCell';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { ErrorState } from '@/components/ErrorState';
import { useTheme } from '@/context/ThemeContext';
import { FontSize, FontWeight, Radius, Spacing, posterUrl } from '@/constants/tokens';
import {
  discoverByGenre,
  getGenres,
  getTrending,
  searchMovies,
  type TmdbGenre,
  type TmdbMovie,
} from '@/services/tmdb';
import { searchSeries } from '@/services/tmdbTv';
import { Image } from 'expo-image';

type Mode = 'idle' | 'genre' | 'search';

type SearchResult = TmdbMovie & { mediaType: 'movie' | 'series' };

export default function SearchScreen() {
  const { colors, colorScheme } = useTheme();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<Mode>('idle');
  const [selectedGenreName, setSelectedGenreName] = useState<string>('');
  const [genres, setGenres] = useState<TmdbGenre[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<TmdbMovie[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getGenres()
      .then(setGenres)
      .catch((err) => console.error('Error fetching genres:', err));

    getTrending()
      .then((data) => setTrendingSearches(data.slice(0, 4)))
      .catch((err) => console.error('Error fetching trending:', err));
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      if (mode === 'search') {
        setMode('idle');
        setResults([]);
      }
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setMode('search');
      setSelectedGenreName('');
      setLoading(true);
      setError(false);
      try {
        const [movieSettled, seriesSettled] = await Promise.allSettled([
          searchMovies(query.trim()),
          searchSeries(query.trim()),
        ]);
        if (movieSettled.status === 'rejected' && seriesSettled.status === 'rejected') {
          throw movieSettled.reason;
        }
        const movieResults = movieSettled.status === 'fulfilled' ? movieSettled.value : [];
        const seriesResults = seriesSettled.status === 'fulfilled' ? seriesSettled.value : [];
        if (movieSettled.status === 'rejected') console.error(movieSettled.reason);
        if (seriesSettled.status === 'rejected') console.error(seriesSettled.reason);
        const combined: SearchResult[] = [
          ...movieResults.map((m) => ({ ...m, mediaType: 'movie' as const })),
          ...seriesResults.map((s) => ({
            ...s,
            mediaType: 'series' as const,
            title: s.name,
            release_date: s.first_air_date,
          })),
        ];
        setResults(combined);
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }, 350);
  }, [query]);

  async function handleGenreTap(genre: TmdbGenre) {
    setMode('genre');
    setSelectedGenreName(genre.name);
    setQuery('');
    setLoading(true);
    setError(false);
    try {
      const res = await discoverByGenre(genre.id);
      setResults(res.map((m) => ({ ...m, mediaType: 'movie' as const })));
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setQuery('');
    setSelectedGenreName('');
    setMode('idle');
    setResults([]);
    setError(false);
  }

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
            <SymbolView name="magnifyingglass" size={16} tintColor="#FFFFFF" weight="heavy" />
          </View>
          <Text style={[styles.largeTitle, { color: colors.label }]}>
            {mode === 'genre' && selectedGenreName ? selectedGenreName : 'Search'}
          </Text>
        </View>

        {mode === 'genre' ? (
          <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.clearGenreText, { color: colors.accent }]}>All Genres</Text>
          </TouchableOpacity>
        ) : (
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
        )}
      </View>

      {/* Stitch Floating Search Capsule */}
      <View style={styles.searchBarWrapper}>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor:
                colorScheme === 'dark'
                  ? isFocused
                    ? 'rgba(42, 42, 42, 0.95)'
                    : 'rgba(32, 31, 31, 0.85)'
                  : isFocused
                  ? 'rgba(255, 255, 255, 1)'
                  : 'rgba(240, 240, 240, 0.9)',
              borderColor: isFocused
                ? colors.accent
                : colorScheme === 'dark'
                ? 'rgba(255, 255, 255, 0.12)'
                : 'rgba(0, 0, 0, 0.08)',
              borderWidth: isFocused ? 1.5 : 1,
              shadowColor: isFocused ? colors.accent : '#000000',
              shadowOffset: { width: 0, height: isFocused ? 4 : 2 },
              shadowOpacity: isFocused ? 0.35 : 0.1,
              shadowRadius: isFocused ? 10 : 4,
              elevation: isFocused ? 6 : 2,
            },
          ]}
        >
          <SymbolView
            name="magnifyingglass"
            size={18}
            tintColor={isFocused ? colors.accent : colors.secondaryLabel}
            weight="semibold"
          />
          <TextInput
            style={[styles.input, { color: colors.label }]}
            placeholder="Movies, shows, actors..."
            placeholderTextColor={colors.secondaryLabel}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="never"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={handleClear}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Clear search"
            >
              <SymbolView name="xmark.circle.fill" size={18} tintColor={colors.secondaryLabel} weight="medium" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : error ? (
        <ErrorState
          body="Could not load results. Check your connection."
          onRetry={handleClear}
        />
      ) : mode === 'idle' ? (
        <ScrollView
          style={styles.contentWrapper}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Explore Genres Section */}
          <Text style={[styles.sectionTitle, { color: colors.label }]}>
            Explore Genres
          </Text>
          <View style={styles.genresGrid}>
            {genres.map((item, index) => (
              <View key={item.id} style={styles.genreTileWrapper}>
                <GenreTile
                  name={item.name}
                  index={index}
                  onPress={() => handleGenreTap(item)}
                />
              </View>
            ))}
          </View>

          {/* Recent / Suggested Searches Section (Stitch Style) */}
          {trendingSearches.length > 0 && (
            <View style={styles.recentSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.label, paddingHorizontal: 0, marginBottom: 0 }]}>
                  Trending Searches
                </Text>
              </View>

              <View style={styles.recentList}>
                {trendingSearches.map((movie) => {
                  const year = movie.release_date ? movie.release_date.slice(0, 4) : '';
                  return (
                    <AnimatedPressable
                      key={movie.id}
                      style={[
                        styles.recentItem,
                        {
                          backgroundColor:
                            colorScheme === 'dark'
                              ? 'rgba(32, 31, 31, 0.85)'
                              : 'rgba(255, 255, 255, 0.90)',
                          borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                          borderWidth: 1,
                          ...colors.cardShadow,
                        },
                      ]}
                      onPress={() => router.push(`/movie/${movie.id}`)}
                      scaleTo={0.96}
                    >
                      {movie.poster_path ? (
                        <Image
                          source={{ uri: posterUrl(movie.poster_path, 'w185') ?? '' }}
                          style={styles.recentThumbnail}
                          contentFit="cover"
                          transition={200}
                        />
                      ) : (
                        <View style={[styles.recentThumbnail, { backgroundColor: colors.secondaryBackground }]} />
                      )}
                      <View style={styles.recentMeta}>
                        <Text style={[styles.recentTitle, { color: colors.label }]} numberOfLines={1}>
                          {movie.title}
                        </Text>
                        <Text style={[styles.recentSubtitle, { color: colors.secondaryLabel }]}>
                          {year ? `${year} • ` : ''}★ {movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.arrowIcon}>
                        <SymbolView name="arrow.up.right" size={16} tintColor={colors.secondaryLabel} weight="semibold" />
                      </View>
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={styles.contentWrapper}>
          {results.length === 0 ? (
            <View style={styles.emptyResults}>
              <SymbolView name="film" size={48} tintColor={colors.secondaryLabel} weight="light" />
              <Text style={[styles.emptyResultsText, { color: colors.label }]}>No results found</Text>
              <Text style={[styles.emptyResultsSub, { color: colors.secondaryLabel }]}>
                Try searching for a different title or keyword.
              </Text>
            </View>
          ) : (
            <FlashList
              data={results}
              numColumns={3}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingTop: Spacing.xs, paddingBottom: 130 }}
              ItemSeparatorComponent={() => <View style={{ height: Spacing.xs }} />}
              renderItem={({ item }) => (
                <PosterGridCell
                  tmdbId={item.id}
                  title={item.title}
                  posterPath={item.poster_path}
                  releaseYear={
                    item.release_date ? parseInt(item.release_date.slice(0, 4), 10) : null
                  }
                  episodeTag={item.mediaType === 'series' ? 'TV' : 'MOVIE'}
                  onPress={() =>
                    router.push(
                      item.mediaType === 'series' ? `/series/${item.id}` : `/movie/${item.id}`
                    )
                  }
                  style={{ marginHorizontal: Spacing.xs / 2 }}
                />
              )}
            />
          )}
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
  clearGenreText: {
    fontSize: FontSize.subheadline,
    fontWeight: FontWeight.semibold,
  },
  searchBarWrapper: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.pill,
    gap: Spacing.sm,
    // @ts-ignore
    borderCurve: 'continuous',
  },
  input: {
    flex: 1,
    fontSize: FontSize.body,
    paddingVertical: 0,
    letterSpacing: -0.2,
  },
  contentWrapper: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 130,
  },
  sectionTitle: {
    fontSize: FontSize.headline,
    fontWeight: FontWeight.heavy,
    letterSpacing: -0.3,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  genresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md - 4,
    marginBottom: Spacing.lg,
  },
  genreTileWrapper: {
    width: '50%',
    padding: 4,
  },
  recentSection: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  recentList: {
    gap: Spacing.sm,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radius.medium,
    gap: Spacing.md,
    // @ts-ignore
    borderCurve: 'continuous',
  },
  recentThumbnail: {
    width: 48,
    height: 72,
    borderRadius: Radius.small,
    overflow: 'hidden',
  },
  recentMeta: {
    flex: 1,
    gap: 4,
  },
  recentTitle: {
    fontSize: FontSize.subheadline,
    fontWeight: FontWeight.bold,
  },
  recentSubtitle: {
    fontSize: FontSize.caption1,
    fontWeight: FontWeight.medium,
  },
  arrowIcon: {
    padding: Spacing.xs,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyResults: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyResultsText: {
    fontSize: FontSize.headline,
    fontWeight: FontWeight.bold,
  },
  emptyResultsSub: {
    fontSize: FontSize.subheadline,
    textAlign: 'center',
  },
});
