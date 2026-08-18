import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { FlashList } from '@shopify/flash-list';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { PosterGridCell } from '@/components/PosterGridCell';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { ErrorState } from '@/components/ErrorState';
import { useTheme } from '@/context/ThemeContext';
import { FontSize, FontWeight, Radius, Spacing, posterUrl } from '@/constants/tokens';
import {
  discoverByGenre,
  getTopRated,
  searchMovies,
  type TmdbMovie,
} from '@/services/tmdb';
import { searchSeries } from '@/services/tmdbTv';
import {
  searchAnime,
  animeTitle,
  startYear as anilistStartYear,
  cleanDescription,
} from '@/services/anilist';

type SearchResult = TmdbMovie & { mediaType: 'movie' | 'series' | 'anime' };
type MediaTypeFilter = 'all' | 'movie' | 'series' | 'anime';
type SortFilter = 'relevance' | 'rating' | 'date';

const RECENT_STORAGE_KEY = 'media_centre_recent_searches_v2';
const DEFAULT_RECENTS = ['Blade Runner 2049', 'Cyberpunk', 'Denis Villeneuve'];

interface TrendingGenreItem {
  id: string;
  name: string;
  query?: string;
  genreId?: number;
  imageUri: string;
}

const TRENDING_GENRES: TrendingGenreItem[] = [
  {
    id: 'cyberpunk',
    name: 'Cyberpunk📈',
    query: 'Cyberpunk',
    imageUri: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'noir',
    name: 'Noir',
    query: 'Noir',
    imageUri: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'scifi',
    name: 'Sci-Fi',
    genreId: 878,
    imageUri: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'thriller',
    name: 'Thriller',
    genreId: 53,
    imageUri: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
  },
];

interface SpotlightCollection {
  id: string;
  title: string;
  curator: string;
  saves: string;
  query: string;
  posters: string[];
}

const SPOTLIGHT_COLLECTIONS: SpotlightCollection[] = [
  {
    id: 'best-2024',
    title: 'Best of 2024',
    curator: 'Curated by @cinephile_x',
    saves: '1.2k Saves',
    query: 'Dune',
    posters: [
      'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=200&auto=format&fit=crop&q=80',
    ],
  },
  {
    id: 'neo-noir',
    title: 'Neo-Noir Essentials',
    curator: 'Curated by @dark_frames',
    saves: '856 Saves',
    query: 'Blade Runner',
    posters: [
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=200&auto=format&fit=crop&q=80',
    ],
  },
];

export default function SearchScreen() {
  const { q: initialQ, query: initialQuery } = useLocalSearchParams<{ q?: string; query?: string }>();
  const { colors, colorScheme } = useTheme();
  const [query, setQuery] = useState(initialQ || initialQuery || '');
  const [recentSearches, setRecentSearches] = useState<string[]>(DEFAULT_RECENTS);
  const [topRated, setTopRated] = useState<TmdbMovie[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Filters
  const [mediaTypeFilter, setMediaTypeFilter] = useState<MediaTypeFilter>('all');
  const [sortFilter, setSortFilter] = useState<SortFilter>('relevance');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load Recent Searches and Top Rated
  useEffect(() => {
    AsyncStorage.getItem(RECENT_STORAGE_KEY)
      .then((val) => {
        if (val) {
          try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setRecentSearches(parsed);
            }
          } catch {
            // ignore
          }
        }
      })
      .catch(() => {});

    getTopRated()
      .then((data) => setTopRated(data.slice(0, 10)))
      .catch((err) => console.error('Error fetching top rated:', err));
  }, []);

  const saveRecentSearch = useCallback(async (newTerm: string) => {
    if (!newTerm.trim()) return;
    const trimmed = newTerm.trim();
    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 8);
      AsyncStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const removeRecentSearch = useCallback(async (termToRemove: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRecentSearches((prev) => {
      const updated = prev.filter((item) => item !== termToRemove);
      AsyncStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const clearAllRecents = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRecentSearches([]);
    AsyncStorage.removeItem(RECENT_STORAGE_KEY).catch(() => {});
  }, []);

  // Perform Search
  const performSearch = useCallback(
    async (searchTerm: string, mediaType: MediaTypeFilter, sort: SortFilter) => {
      if (!searchTerm.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(false);
      try {
        let combined: SearchResult[] = [];
        if (mediaType === 'movie') {
          const movies = await searchMovies(searchTerm.trim());
          combined = movies.map((m) => ({ ...m, mediaType: 'movie' as const }));
        } else if (mediaType === 'series') {
          const series = await searchSeries(searchTerm.trim());
          combined = series.map((s) => ({
            ...s,
            mediaType: 'series' as const,
            title: s.name,
            release_date: s.first_air_date,
          }));
        } else if (mediaType === 'anime') {
          const anime = await searchAnime(searchTerm.trim());
          combined = anime.map((a) => ({
            id: a.id,
            mediaType: 'anime' as const,
            title: animeTitle(a.title),
            poster_path: a.coverImage.large,
            release_date: anilistStartYear(a) ? `${anilistStartYear(a)}-01-01` : '',
            genre_ids: [],
            overview: cleanDescription(a.description) ?? '',
            vote_average: (a.averageScore ?? 0) / 10,
          }));
        } else {
          const [movieSettled, seriesSettled, animeSettled] = await Promise.allSettled([
            searchMovies(searchTerm.trim()),
            searchSeries(searchTerm.trim()),
            searchAnime(searchTerm.trim()),
          ]);
          const movieResults = movieSettled.status === 'fulfilled' ? movieSettled.value : [];
          const seriesResults = seriesSettled.status === 'fulfilled' ? seriesSettled.value : [];
          const animeResults = animeSettled.status === 'fulfilled' ? animeSettled.value : [];
          combined = [
            ...movieResults.map((m) => ({ ...m, mediaType: 'movie' as const })),
            ...seriesResults.map((s) => ({
              ...s,
              mediaType: 'series' as const,
              title: s.name,
              release_date: s.first_air_date,
            })),
            ...animeResults.map((a) => ({
              id: a.id,
              mediaType: 'anime' as const,
              title: animeTitle(a.title),
              poster_path: a.coverImage.large,
              release_date: anilistStartYear(a) ? `${anilistStartYear(a)}-01-01` : '',
              genre_ids: [],
              overview: cleanDescription(a.description) ?? '',
              vote_average: (a.averageScore ?? 0) / 10,
            })),
          ];
        }

        // Apply Sorting
        if (sort === 'rating') {
          combined.sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0));
        } else if (sort === 'date') {
          combined.sort((a, b) => (b.release_date ?? '').localeCompare(a.release_date ?? ''));
        }

        setResults(combined);
        saveRecentSearch(searchTerm);
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [saveRecentSearch]
  );

  // Debounced search when typing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      performSearch(query, mediaTypeFilter, sortFilter);
    }, 350);
  }, [query, mediaTypeFilter, sortFilter, performSearch]);

  const handleSelectGenre = async (genreItem: TrendingGenreItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (genreItem.query) {
      setQuery(genreItem.query);
      performSearch(genreItem.query, mediaTypeFilter, sortFilter);
    } else if (genreItem.genreId) {
      setLoading(true);
      setError(false);
      setQuery(genreItem.name);
      try {
        const res = await discoverByGenre(genreItem.genreId);
        setResults(res.map((m) => ({ ...m, mediaType: 'movie' as const })));
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSelectCollection = (spotlight: SpotlightCollection) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuery(spotlight.query);
    performSearch(spotlight.query, mediaTypeFilter, sortFilter);
  };

  const handleClearQuery = () => {
    setQuery('');
    setResults([]);
    setError(false);
  };

  const isSearchActive = query.trim().length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.smallIndicatorBadge}>
            <View style={styles.innerIndicatorDot} />
          </View>
          <Text style={[styles.largeTitle, { color: colors.label }]}>Search</Text>
        </View>

        <TouchableOpacity
          style={styles.smallIndicatorBadge}
          onPress={() => router.push('/profile')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Profile"
        >
          <SymbolView name="person.fill" size={13} tintColor="#A7C8FF" weight="bold" />
        </TouchableOpacity>
      </View>

      {/* Recessed Search Bar with Filter Sliders Button */}
      <View style={styles.searchBarWrapper}>
        <View
          style={[
            styles.searchBar,
            {
              // Stitch: bg-surface-container rounded-xl border border-outline/10 focus-within:border-primary-container/50
              backgroundColor: '#201f1f',
              borderColor: isFocused ? 'rgba(229,9,20,0.5)' : 'rgba(175,135,130,0.1)',
              borderWidth: 1,
            },
          ]}
        >
          <SymbolView
            name="magnifyingglass"
            size={18}
            tintColor={isFocused ? colors.accent : '#8E8E93'}
            weight="semibold"
          />
          <TextInput
            style={[styles.input, { color: colors.label }]}
            placeholder="Search movies, series..."
            placeholderTextColor="#8E8E93"
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
              onPress={handleClearQuery}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Clear search text"
            >
              <SymbolView name="xmark.circle.fill" size={17} tintColor="#8E8E93" weight="medium" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.filterButton,
              (mediaTypeFilter !== 'all' || sortFilter !== 'relevance') && {
                backgroundColor: 'rgba(229, 9, 20, 0.15)',
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowFilterModal(true);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Filter search results"
          >
            <SymbolView
              name="slider.horizontal.3"
              size={18}
              tintColor={
                mediaTypeFilter !== 'all' || sortFilter !== 'relevance'
                  ? colors.accent
                  : '#E5E2E1'
              }
              weight="semibold"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content Area */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : error ? (
        <ErrorState
          body="Could not load search results. Check your connection."
          onRetry={() => performSearch(query, mediaTypeFilter, sortFilter)}
        />
      ) : isSearchActive ? (
        /* Results View */
        <View style={styles.resultsContainer}>
          {results.length === 0 ? (
            <View style={styles.emptyResults}>
              <SymbolView name="film" size={48} tintColor={colors.secondaryLabel} weight="light" />
              <Text style={[styles.emptyResultsText, { color: colors.label }]}>No results found</Text>
              <Text style={[styles.emptyResultsSub, { color: colors.secondaryLabel }]}>
                Try searching for a different title, creator, or keyword.
              </Text>
            </View>
          ) : (
            <FlashList
              data={results}
              numColumns={3}
              keyExtractor={(item) => `${item.mediaType}-${item.id}`}
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
                  episodeTag={
                    item.mediaType === 'series' ? 'SERIES' : item.mediaType === 'anime' ? 'ANIME' : 'MOVIE'
                  }
                  onPress={() =>
                    router.push(
                      item.mediaType === 'series'
                        ? `/series/${item.id}`
                        : item.mediaType === 'anime'
                        ? `/anime/${item.id}`
                        : `/movie/${item.id}`
                    )
                  }
                  style={{ marginHorizontal: Spacing.xs / 2 }}
                />
              )}
            />
          )}
        </View>
      ) : (
        /* Idle Search Discovery State (Stitch Screen) */
        <ScrollView
          style={styles.contentWrapper}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Recent Searches Section */}
          {recentSearches.length > 0 && (
            <View style={styles.recentSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Recent Searches</Text>
                <TouchableOpacity
                  onPress={clearAllRecents}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.clearText, { color: colors.accent }]}>CLEAR</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recentChipsRow}
              >
                {recentSearches.map((term) => (
                  <View key={term} style={styles.recentChip}>
                    <TouchableOpacity
                      onPress={() => {
                        setQuery(term);
                        performSearch(term, mediaTypeFilter, sortFilter);
                      }}
                      style={styles.recentChipTextContainer}
                    >
                      <Text style={styles.recentChipText} numberOfLines={1}>
                        {term}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => removeRecentSearch(term)}
                      style={styles.chipRemoveButton}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <SymbolView name="xmark" size={10} tintColor="#A0A0A0" weight="bold" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Trending Genres (2x2 Grid) */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { paddingHorizontal: Spacing.md }]}>
              Trending Genres
            </Text>
            <View style={styles.genreGrid}>
              {TRENDING_GENRES.map((item) => (
                <AnimatedPressable
                  key={item.id}
                  style={styles.genreCard}
                  onPress={() => handleSelectGenre(item)}
                  scaleTo={0.97}
                >
                  <Image
                    source={{ uri: item.imageUri }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    transition={200}
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(19, 19, 19, 0.75)', '#131313']}
                    locations={[0, 0.55, 1.0]}
                    style={StyleSheet.absoluteFill}
                  />
                  <Text style={styles.genreCardTitle}>{item.name}</Text>
                </AnimatedPressable>
              ))}
            </View>
          </View>

          {/* Top Rated This Week Carousel */}
          {topRated.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { paddingHorizontal: Spacing.md }]}>
                Top Rated This Week
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.topRatedRow}
              >
                {topRated.map((movie) => (
                  <AnimatedPressable
                    key={movie.id}
                    style={styles.topRatedPosterCard}
                    onPress={() => router.push(`/movie/${movie.id}`)}
                    scaleTo={0.96}
                  >
                    {movie.poster_path ? (
                      <Image
                        source={{ uri: posterUrl(movie.poster_path, 'w342') ?? '' }}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                        transition={200}
                      />
                    ) : (
                      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#201F1F' }]} />
                    )}
                    {movie.vote_average > 0 && (
                      <View style={styles.topRatedBadge}>
                        <SymbolView name="star.fill" size={10} tintColor="#FFD60A" weight="bold" />
                        <Text style={styles.topRatedBadgeText}>
                          {movie.vote_average.toFixed(1)}
                        </Text>
                      </View>
                    )}
                  </AnimatedPressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Community Spotlight Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { paddingHorizontal: Spacing.md }]}>
              Community Spotlight
            </Text>
            <View style={styles.spotlightList}>
              {SPOTLIGHT_COLLECTIONS.map((spotlight) => (
                <AnimatedPressable
                  key={spotlight.id}
                  style={styles.spotlightCard}
                  onPress={() => handleSelectCollection(spotlight)}
                  scaleTo={0.98}
                >
                    {/* 2x2 4-Grid Thumbnail */}
                    <View style={styles.gridCoverContainer}>
                      {spotlight.posters.map((p, idx) => (
                        <View key={idx} style={styles.miniPosterSlot}>
                          {p ? (
                            <Image
                              source={{ uri: p.startsWith('http') ? p : posterUrl(p, 'w185') ?? '' }}
                              style={StyleSheet.absoluteFill}
                              contentFit="cover"
                            />
                          ) : (
                            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#2A2A2A' }]} />
                          )}
                        </View>
                      ))}
                    </View>

                  {/* Metadata */}
                  <View style={styles.spotlightMeta}>
                    <Text style={styles.spotlightTitle}>{spotlight.title}</Text>
                    <Text style={styles.spotlightCurator}>{spotlight.curator}</Text>
                    <View style={styles.spotlightSavesRow}>
                      <SymbolView name="heart" size={12} tintColor="#A0A0A0" weight="semibold" />
                      <Text style={styles.spotlightSavesText}>{spotlight.saves}</Text>
                    </View>
                  </View>
                </AnimatedPressable>
              ))}
            </View>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>
      )}

      {/* Filter Options Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.label }]}>Search Filters</Text>
            <TouchableOpacity
              onPress={() => setShowFilterModal(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <SymbolView name="xmark.circle.fill" size={24} tintColor={colors.secondaryLabel} weight="medium" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            {/* Media Type Filter */}
            <Text style={styles.filterGroupTitle}>MEDIA TYPE</Text>
            <View style={styles.filterPillsRow}>
              {(['all', 'movie', 'series', 'anime'] as MediaTypeFilter[]).map((type) => {
                const isSelected = mediaTypeFilter === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.filterPill,
                      isSelected && {
                        backgroundColor: colors.accent,
                        borderColor: colors.accent,
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setMediaTypeFilter(type);
                    }}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        isSelected ? { color: '#FFFFFF', fontWeight: '700' } : { color: colors.label },
                      ]}
                    >
                      {type === 'all'
                        ? 'All Content'
                        : type === 'movie'
                        ? 'Movies Only'
                        : type === 'series'
                        ? 'Series Only'
                        : 'Anime Only'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Sort Order */}
            <Text style={[styles.filterGroupTitle, { marginTop: Spacing.lg }]}>SORT BY</Text>
            <View style={styles.filterPillsRow}>
              {(['relevance', 'rating', 'date'] as SortFilter[]).map((sort) => {
                const isSelected = sortFilter === sort;
                return (
                  <TouchableOpacity
                    key={sort}
                    style={[
                      styles.filterPill,
                      isSelected && {
                        backgroundColor: colors.accent,
                        borderColor: colors.accent,
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSortFilter(sort);
                    }}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        isSelected ? { color: '#FFFFFF', fontWeight: '700' } : { color: colors.label },
                      ]}
                    >
                      {sort === 'relevance' ? 'Relevance' : sort === 'rating' ? 'Top Rated' : 'Newest'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Reset & Apply Buttons */}
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalResetButton}
                onPress={() => {
                  setMediaTypeFilter('all');
                  setSortFilter('relevance');
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={styles.modalResetText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalApplyButton, { backgroundColor: colors.accent }]}
                onPress={() => {
                  setShowFilterModal(false);
                  if (query.trim()) {
                    performSearch(query, mediaTypeFilter, sortFilter);
                  }
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
              >
                <Text style={styles.modalApplyText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  smallIndicatorBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(32, 31, 31, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#A7C8FF',
  },
  largeTitle: {
    fontSize: FontSize.title2,
    fontWeight: FontWeight.heavy,
    letterSpacing: -0.5,
  },
  searchBarWrapper: {
    // Stitch: sticky top-16 z-40 bg-background/90 backdrop-blur-md px-margin-mobile pt-4 pb-2
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  searchBar: {
    // Stitch: flex-1 bg-surface-container rounded-xl flex items-center px-4 py-3
    //         border border-outline/10 focus-within:border-primary-container/50
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12, // rounded-xl in Stitch
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: FontSize.body,
    paddingVertical: 0,
    letterSpacing: -0.2,
  },
  filterButton: {
    padding: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentWrapper: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  resultsContainer: {
    flex: 1,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    // Stitch: font-headline-md text-headline-md (24px 600) tracking-tight
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: '#E5E2E1',
    marginBottom: 8,
  },
  clearText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  recentSection: {
    marginBottom: Spacing.lg,
  },
  recentChipsRow: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    backgroundColor: '#201F1F',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  recentChipTextContainer: {
    justifyContent: 'center',
  },
  recentChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#E5E2E1',
  },
  chipRemoveButton: {
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genreGrid: {
    // Stitch: grid grid-cols-2 gap-3 px-margin-mobile
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  genreCard: {
    // Stitch: relative h-24 (96px) rounded-xl overflow-hidden cursor-pointer
    width: '47%',
    height: 96,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 12,
  },
  genreCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  topRatedRow: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm + 2,
  },
  topRatedPosterCard: {
    width: 120,
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    // @ts-ignore
    borderCurve: 'continuous',
  },
  topRatedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: Radius.small,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  topRatedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFD60A',
  },
  spotlightList: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm + 2,
  },
  spotlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm + 4,
    borderRadius: 16,
    backgroundColor: '#201F1F',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    gap: Spacing.md,
    // @ts-ignore
    borderCurve: 'continuous',
  },
  gridCoverContainer: {
    width: 64,
    height: 64,
    borderRadius: 10,
    overflow: 'hidden',
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  miniPosterSlot: {
    width: 32,
    height: 32,
    overflow: 'hidden',
  },
  spotlightMeta: {
    flex: 1,
    gap: 3,
  },
  spotlightTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E5E2E1',
  },
  spotlightCurator: {
    fontSize: 12,
    color: '#8E8E93',
  },
  spotlightSavesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  spotlightSavesText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#A0A0A0',
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
  modalRoot: {
    flex: 1,
    paddingTop: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  modalBody: {
    padding: Spacing.lg,
  },
  filterGroupTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#8E8E93',
    marginBottom: Spacing.sm,
  },
  filterPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    backgroundColor: '#201F1F',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterPillText: {
    fontSize: 13.5,
    fontWeight: '500',
  },
  modalActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xxl,
  },
  modalResetButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: Radius.pill,
    backgroundColor: '#201F1F',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalResetText: {
    color: '#E5E2E1',
    fontSize: 14,
    fontWeight: '600',
  },
  modalApplyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalApplyText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
