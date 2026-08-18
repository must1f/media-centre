import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';

import { PosterBackdrop } from '@/components/PosterBackdrop';
import { ToggleButton } from '@/components/ToggleButton';
import { StarRatingControl } from '@/components/StarRatingControl';
import { CardFeedItem } from '@/components/CardFeedItem';
import { RowHeader } from '@/components/RowHeader';
import { ErrorState } from '@/components/ErrorState';
import { useTheme } from '@/context/ThemeContext';
import { FontSize, FontWeight, Radius, Spacing } from '@/constants/tokens';
import { posterUrl } from '@/constants/tokens';
import { getMovieDetails, type TmdbMovieDetail, type TmdbMovie } from '@/services/tmdb';
import { upsertMovie, getMovie, type Movie } from '@/db/movies';
import { isLiked, toggleLike } from '@/db/likes';
import { isOnWatchlist, toggleWatchlist } from '@/db/watchlist';
import { QuickLogSheet } from '@/components/QuickLogSheet';

function releaseYearFrom(detail: TmdbMovieDetail): number | null {
  const y = parseInt(detail.release_date?.slice(0, 4) ?? '', 10);
  return isNaN(y) ? null : y;
}

function formatRuntime(minutes: number | null | undefined): string | null {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${remainingMinutes > 0 ? `${remainingMinutes}m` : ''}`;
  }
  return `${minutes}m`;
}

export default function MovieDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tmdbId = parseInt(id ?? '0', 10);
  const { colors, colorScheme } = useTheme();

  const [detail, setDetail] = useState<TmdbMovieDetail | null>(null);
  const [localMovie, setLocalMovie] = useState<Movie | null>(null);
  const [liked, setLiked] = useState(false);
  const [watchlisted, setWatchlisted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showLogSheet, setShowLogSheet] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getMovieDetails(tmdbId);
      setDetail(data);

      upsertMovie({
        tmdb_id: data.id,
        title: data.title,
        poster_path: data.poster_path,
        dominant_color: null,
        release_year: releaseYearFrom(data),
        genres: JSON.stringify(data.genres ?? []),
        overview: data.overview,
      });

      setLocalMovie(getMovie(tmdbId));
      setLiked(isLiked(tmdbId, 'movie'));
      setWatchlisted(isOnWatchlist(tmdbId, 'movie'));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [tmdbId]);

  useEffect(() => {
    load();
  }, [load]);

  function handleLikeToggle() {
    const next = toggleLike(tmdbId, 'movie');
    setLiked(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleWatchlistToggle() {
    const next = toggleWatchlist(tmdbId, 'movie');
    setWatchlisted(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function handleShare() {
    if (!detail) return;
    try {
      await Share.share({
        title: detail.title,
        message: `Check out ${detail.title} on Media Centre!`,
      });
    } catch {
      // ignore
    }
  }

  function handleLogSaved() {
    setShowLogSheet(false);
    setLocalMovie(getMovie(tmdbId));
  }

  const similar: TmdbMovie[] = detail?.similar?.results?.slice(0, 10) ?? [];
  const cast = detail?.credits?.cast?.slice(0, 10) ?? [];
  const runtimeFormatted = formatRuntime(detail?.runtime);
  const year = detail ? releaseYearFrom(detail) : null;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          headerTitle: '',
          headerBackTitle: 'Back',
          headerTintColor: colors.label,
        }}
      />

      {loading ? (
        <View style={[styles.centered, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : error ? (
        <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
          <ErrorState onRetry={load} />
        </SafeAreaView>
      ) : detail ? (
        <PosterBackdrop
          posterPath={detail.poster_path}
          dominantColor={localMovie?.dominant_color}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero Section */}
            <View style={styles.heroSection}>
              {/* Floating Poster */}
              <View
                style={[
                  styles.posterWrapper,
                  {
                    backgroundColor: colors.secondaryBackground,
                    borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)',
                    borderWidth: 1,
                    ...colors.cardShadow,
                  },
                ]}
              >
                {detail.poster_path ? (
                  <Image
                    source={{ uri: posterUrl(detail.poster_path, 'w342') ?? '' }}
                    style={styles.poster}
                    contentFit="cover"
                    transition={200}
                  />
                ) : null}
              </View>

              {/* Title & Metadata */}
              <View style={styles.heroMeta}>
                <Text style={[styles.movieTitle, { color: colors.label }]} numberOfLines={3}>
                  {detail.title}
                </Text>

                {/* Metadata Pills */}
                <View style={styles.pillRow}>
                  {year ? (
                    <View
                      style={[
                        styles.metaPill,
                        {
                          backgroundColor: colors.searchBarBackground,
                          borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.06)',
                          borderWidth: 1,
                        },
                      ]}
                    >
                      <Text style={[styles.metaPillText, { color: colors.secondaryLabel }]}>{year}</Text>
                    </View>
                  ) : null}
                  {runtimeFormatted ? (
                    <View
                      style={[
                        styles.metaPill,
                        {
                          backgroundColor: colors.searchBarBackground,
                          borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.06)',
                          borderWidth: 1,
                        },
                      ]}
                    >
                      <Text style={[styles.metaPillText, { color: colors.secondaryLabel }]}>{runtimeFormatted}</Text>
                    </View>
                  ) : null}
                  {detail.vote_average > 0 ? (
                    <View
                      style={[
                        styles.metaPill,
                        {
                          backgroundColor: colors.searchBarBackground,
                          borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.06)',
                          borderWidth: 1,
                        },
                      ]}
                    >
                      <SymbolView name="star.fill" size={10} tintColor={colors.starGold ?? '#FFD60A'} weight="bold" />
                      <Text style={[styles.metaPillText, { color: colors.label, fontWeight: FontWeight.bold }]}>
                        {detail.vote_average.toFixed(1)}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Genre Tags */}
                {detail.genres && detail.genres.length > 0 && (
                  <Text style={[styles.genresText, { color: colors.secondaryLabel }]} numberOfLines={2}>
                    {detail.genres.map((g) => g.name).join(' · ')}
                  </Text>
                )}
              </View>
            </View>

            {/* Apple Action Pill Bar */}
            <View style={styles.actionBar}>
              <TouchableOpacity
                style={[
                  styles.primaryLogButton,
                  {
                    backgroundColor: colors.accent,
                    shadowColor: colors.accent,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.45,
                    shadowRadius: 10,
                    elevation: 6,
                  },
                ]}
                onPress={() => setShowLogSheet(true)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Log this movie"
              >
                <SymbolView name="sparkles" size={16} tintColor="#FFFFFF" weight="bold" />
                <Text style={styles.primaryLogButtonText}>Log Movie</Text>
              </TouchableOpacity>

              <ToggleButton
                type="like"
                isActive={liked}
                onToggle={handleLikeToggle}
                size={20}
              />
              <ToggleButton
                type="watchlist"
                isActive={watchlisted}
                onToggle={handleWatchlistToggle}
                size={20}
              />
              <ToggleButton
                type="share"
                onToggle={handleShare}
                size={20}
              />
            </View>

            {/* User Rating / History Card */}
            {localMovie?.my_rating != null && (
              <View
                style={[
                  styles.insetCard,
                  {
                    backgroundColor:
                      colorScheme === 'dark'
                        ? 'rgba(32, 31, 31, 0.85)'
                        : 'rgba(255, 255, 255, 0.88)',
                    borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.06)',
                    borderWidth: 1,
                    ...colors.cardShadow,
                  },
                ]}
              >
                <View style={styles.cardHeaderRow}>
                  <SymbolView name="star.fill" size={16} tintColor={colors.starGold ?? '#FFD60A'} weight="semibold" />
                  <Text style={[styles.cardTitle, { color: colors.secondaryLabel }]}>
                    YOUR LOGGED RATING
                  </Text>
                </View>
                <StarRatingControl
                  value={localMovie.my_rating}
                  onChange={() => {}}
                  readOnly
                  size={26}
                />
              </View>
            )}

            {/* User Review Card */}
            {localMovie?.my_review ? (
              <View
                style={[
                  styles.insetCard,
                  {
                    backgroundColor:
                      colorScheme === 'dark'
                        ? 'rgba(32, 31, 31, 0.85)'
                        : 'rgba(255, 255, 255, 0.88)',
                    borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.06)',
                    borderWidth: 1,
                    ...colors.cardShadow,
                  },
                ]}
              >
                <View style={styles.cardHeaderRow}>
                  <SymbolView name="text.quote" size={16} tintColor={colors.accent} weight="semibold" />
                  <Text style={[styles.cardTitle, { color: colors.secondaryLabel }]}>
                    YOUR REVIEW
                  </Text>
                </View>
                <Text style={[styles.bodyText, { color: colors.label }]}>
                  {localMovie.my_review}
                </Text>
              </View>
            ) : null}

            {/* Overview Card */}
            {detail.overview ? (
              <View
                style={[
                  styles.insetCard,
                  {
                    backgroundColor:
                      colorScheme === 'dark'
                        ? 'rgba(32, 31, 31, 0.85)'
                        : 'rgba(255, 255, 255, 0.88)',
                    borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.06)',
                    borderWidth: 1,
                    ...colors.cardShadow,
                  },
                ]}
              >
                <Text style={[styles.cardTitle, { color: colors.secondaryLabel }]}>
                  OVERVIEW
                </Text>
                <Text style={[styles.bodyText, { color: colors.label }]}>
                  {detail.overview}
                </Text>
              </View>
            ) : null}

            {/* Cast Section */}
            {cast.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionHeading, { color: colors.label }]}>Cast</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.castRow}
                >
                  {cast.map((member) => (
                    <View key={member.id} style={styles.castMember}>
                      <View
                        style={[
                          styles.castAvatar,
                          {
                            backgroundColor: colors.tertiaryBackground,
                            ...colors.cardShadow,
                          },
                        ]}
                      >
                        {member.profile_path ? (
                          <Image
                            source={{ uri: posterUrl(member.profile_path, 'w185') ?? '' }}
                            style={StyleSheet.absoluteFill}
                            contentFit="cover"
                          />
                        ) : (
                          <SymbolView name="person.fill" size={24} tintColor={colors.secondaryLabel} />
                        )}
                      </View>
                      <Text style={[styles.castName, { color: colors.label }]} numberOfLines={1}>
                        {member.name}
                      </Text>
                      <Text style={[styles.castRole, { color: colors.secondaryLabel }]} numberOfLines={1}>
                        {member.character}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Similar Movies */}
            {similar.length > 0 && (
              <View style={styles.section}>
                <RowHeader title="Similar Movies" />
                <FlashList
                  horizontal
                  data={similar}
                  keyExtractor={(item) => String(item.id)}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: Spacing.md }}
                  ItemSeparatorComponent={() => <View style={{ width: Spacing.xs }} />}
                  renderItem={({ item }) => (
                    <CardFeedItem
                      tmdbId={item.id}
                      title={item.title}
                      posterPath={item.poster_path}
                      releaseYear={item.release_date ? parseInt(item.release_date.slice(0, 4), 10) : null}
                      onPress={() => router.push(`/movie/${item.id}`)}
                    />
                  )}
                />
              </View>
            )}

            <View style={{ height: 60 }} />
          </ScrollView>
        </PosterBackdrop>
      ) : null}

      {/* Quick-Log Sheet Modal */}
      <Modal
        visible={showLogSheet}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLogSheet(false)}
      >
        {detail && (
          <QuickLogSheet
            tmdbId={tmdbId}
            title={detail.title}
            posterPath={detail.poster_path}
            dominantColor={localMovie?.dominant_color}
            existingReview={localMovie?.my_review ?? null}
            existingRating={localMovie?.my_rating ?? null}
            onSave={handleLogSaved}
            onDismiss={() => setShowLogSheet(false)}
          />
        )}
      </Modal>
    </>
  );
}

const POSTER_WIDTH = 118;
const POSTER_HEIGHT = Math.round(POSTER_WIDTH * 1.5);

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingTop: 108, paddingBottom: 60 },
  heroSection: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  posterWrapper: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: Radius.card,
    overflow: 'hidden',
    // @ts-ignore
    borderCurve: 'continuous',
  },
  poster: { width: POSTER_WIDTH, height: POSTER_HEIGHT },
  heroMeta: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: Spacing.xs + 2,
  },
  movieTitle: {
    fontSize: FontSize.title2,
    fontWeight: FontWeight.heavy,
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginVertical: 2,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    // @ts-ignore
    borderCurve: 'continuous',
  },
  metaPillText: {
    fontSize: FontSize.caption2,
    fontWeight: FontWeight.semibold,
  },
  genresText: {
    fontSize: FontSize.subheadline,
    fontWeight: FontWeight.regular,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  primaryLogButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs + 2,
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.pill,
    // @ts-ignore
    borderCurve: 'continuous',
  },
  primaryLogButtonText: {
    color: '#FFFFFF',
    fontSize: FontSize.subheadline,
    fontWeight: FontWeight.bold,
  },
  insetCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.card,
    gap: Spacing.xs,
    // @ts-ignore
    borderCurve: 'continuous',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: FontSize.caption2,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.6,
  },
  bodyText: {
    fontSize: FontSize.body,
    lineHeight: 23,
    letterSpacing: -0.2,
  },
  section: {
    marginBottom: Spacing.md,
  },
  sectionHeading: {
    fontSize: FontSize.title3,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  castRow: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  castMember: {
    width: 72,
    alignItems: 'center',
    gap: 4,
  },
  castAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  castName: {
    fontSize: FontSize.caption1,
    fontWeight: FontWeight.semibold,
    textAlign: 'center',
    width: '100%',
  },
  castRole: {
    fontSize: FontSize.caption2,
    textAlign: 'center',
    width: '100%',
  },
});
