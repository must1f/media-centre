import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { FlashList } from '@shopify/flash-list';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { ToggleButton } from '@/components/ToggleButton';
import { StarRatingControl } from '@/components/StarRatingControl';
import { CardFeedItem } from '@/components/CardFeedItem';
import { RowHeader } from '@/components/RowHeader';
import { ErrorState } from '@/components/ErrorState';
import { useTheme } from '@/context/ThemeContext';
import { FontSize, FontWeight, Radius, Spacing, backdropUrl, posterUrl } from '@/constants/tokens';
import { getMovieDetails, type TmdbMovieDetail, type TmdbMovie } from '@/services/tmdb';
import { upsertMovie, getMovie, type Movie } from '@/db/movies';
import { isLiked, toggleLike } from '@/db/likes';
import { isOnWatchlist, toggleWatchlist } from '@/db/watchlist';
import { hasWatched, logWatch, getLogEntriesForMedia } from '@/db/logEntries';
import { getFranchiseRow, type FranchiseRow } from '@/services/franchise';
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
  const { id, review: openReview } = useLocalSearchParams<{ id: string; review?: string }>();
  const tmdbId = parseInt(id ?? '0', 10);
  const { colors, colorScheme } = useTheme();

  const [detail, setDetail] = useState<TmdbMovieDetail | null>(null);
  const [localMovie, setLocalMovie] = useState<Movie | null>(null);
  const [liked, setLiked] = useState(false);
  const [watchlisted, setWatchlisted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showLogSheet, setShowLogSheet] = useState(false);
  const [franchiseRow, setFranchiseRow] = useState<FranchiseRow | null>(null);
  const [watchCount, setWatchCount] = useState(0);
  const [justRewatched, setJustRewatched] = useState(false);
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const rewatchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rewatchScale = useSharedValue(1);

  useEffect(() => {
    if (openReview === '1' || openReview === 'true') {
      setShowLogSheet(true);
    }
  }, [openReview]);

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
        collection_id: data.belongs_to_collection?.id ?? null,
        collection_name: data.belongs_to_collection?.name ?? null,
      });

      setLocalMovie(getMovie(tmdbId));
      setLiked(isLiked(tmdbId, 'movie'));
      setWatchlisted(isOnWatchlist(tmdbId, 'movie'));

      getFranchiseRow(data)
        .then((row) => setFranchiseRow(row ? { ...row, movies: row.movies.filter((m) => m.id !== tmdbId) } : null))
        .catch(() => setFranchiseRow(null));

      setWatchCount(getLogEntriesForMedia(tmdbId, 'movie').length);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [tmdbId]);

  useEffect(() => {
    return () => {
      if (rewatchTimerRef.current) clearTimeout(rewatchTimerRef.current);
    };
  }, []);

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

  function handleLogChanged() {
    setLocalMovie(getMovie(tmdbId));
    setWatchCount(getLogEntriesForMedia(tmdbId, 'movie').length);
  }

  function handleLogDismiss() {
    handleLogChanged();
    setShowLogSheet(false);
  }

  function handleRewatch() {
    const today = new Date().toISOString().slice(0, 10);
    logWatch(tmdbId, 'movie', today);

    setLocalMovie(getMovie(tmdbId));
    setWatchCount(getLogEntriesForMedia(tmdbId, 'movie').length);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    rewatchScale.value = withSequence(
      withSpring(1.15, { damping: 10, stiffness: 260 }),
      withSpring(1, { damping: 12, stiffness: 260 })
    );

    setJustRewatched(true);
    if (rewatchTimerRef.current) clearTimeout(rewatchTimerRef.current);
    rewatchTimerRef.current = setTimeout(() => setJustRewatched(false), 1500);
  }

  const rewatchAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rewatchScale.value }],
  }));

  const similar: TmdbMovie[] = detail?.similar?.results?.slice(0, 10) ?? [];
  const cast = detail?.credits?.cast?.slice(0, 12) ?? [];
  const director = detail?.credits?.crew?.find((c) => c.job === 'Director');
  const communityReviews = detail?.reviews?.results?.slice(0, 3) ?? [];
  const runtimeFormatted = formatRuntime(detail?.runtime);
  const year = detail ? releaseYearFrom(detail) : null;
  const imageBackdropUri = backdropUrl(detail?.backdrop_path, 'w780');

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* Floating Custom Navigation Header */}
      <View style={styles.floatingHeader}>
        <TouchableOpacity
          style={styles.circleNavButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <SymbolView name="chevron.left" size={18} tintColor="#FFFFFF" weight="semibold" />
        </TouchableOpacity>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.circleNavButton}
            onPress={handleShare}
            accessibilityRole="button"
            accessibilityLabel="Share"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <SymbolView name="square.and.arrow.up" size={17} tintColor="#FFFFFF" weight="semibold" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : error || !detail ? (
        <SafeAreaView style={styles.centered}>
          <ErrorState onRetry={load} />
        </SafeAreaView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Backdrop Section */}
          <View style={styles.heroSection}>
            {imageBackdropUri ? (
              <Image
                source={{ uri: imageBackdropUri }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={300}
              />
            ) : detail.poster_path ? (
              <Image
                source={{ uri: posterUrl(detail.poster_path, 'w780') ?? '' }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={300}
              />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.secondaryBackground }]} />
            )}

            {/* Ambient subtle glow overlay */}
            <View style={styles.heroGlowBlob} pointerEvents="none" />

            {/* Gradient Scrim fading smoothly into screen background */}
            <LinearGradient
              colors={['transparent', 'rgba(19, 19, 19, 0.55)', colors.background]}
              locations={[0, 0.65, 1.0]}
              style={StyleSheet.absoluteFill}
            />

            {/* Overlapping Poster & Main Title Header */}
            <View style={styles.heroForeground}>
              <View style={styles.posterAndTitleRow}>
                {/* Floating Glass Poster */}
                <View
                  style={[
                    styles.posterCard,
                    {
                      backgroundColor: colors.secondaryBackground,
                      borderColor: 'rgba(255, 255, 255, 0.12)',
                      ...colors.cardShadow,
                    },
                  ]}
                >
                  {detail.poster_path ? (
                    <Image
                      source={{ uri: posterUrl(detail.poster_path, 'w342') ?? '' }}
                      style={styles.posterImage}
                      contentFit="cover"
                      transition={200}
                    />
                  ) : null}
                </View>

                {/* Title & Metadata */}
                <View style={styles.titleInfoContainer}>
                  {/* Genre chips */}
                  {detail.genres && detail.genres.length > 0 && (
                    <View style={styles.genrePillRow}>
                      <View style={styles.genrePill}>
                        <Text style={styles.genrePillText}>
                          {detail.genres[0].name.toUpperCase()}
                        </Text>
                      </View>
                      {detail.genres[1] && (
                        <View style={styles.genrePill}>
                          <Text style={styles.genrePillText}>
                            {detail.genres[1].name.toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  <Text style={[styles.movieTitle, { color: colors.label }]} numberOfLines={2}>
                    {detail.title}
                  </Text>

                  {detail.tagline ? (
                    <Text style={[styles.tagline, { color: colors.secondaryLabel }]} numberOfLines={1}>
                      "{detail.tagline}"
                    </Text>
                  ) : null}

                  {/* Metadata line: 2024 · 2h 49m · ★ 8.5 */}
                  <View style={styles.metadataRow}>
                    {year ? <Text style={styles.metaItem}>{year}</Text> : null}
                    {year && runtimeFormatted ? <Text style={styles.metaDot}>•</Text> : null}
                    {runtimeFormatted ? <Text style={styles.metaItem}>{runtimeFormatted}</Text> : null}
                    {detail.vote_average > 0 ? (
                      <>
                        <Text style={styles.metaDot}>•</Text>
                        <View style={styles.ratingBadge}>
                          <SymbolView name="star.fill" size={11} tintColor="#FFD60A" weight="bold" />
                          <Text style={styles.ratingBadgeText}>{detail.vote_average.toFixed(1)}</Text>
                        </View>
                      </>
                    ) : null}
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Action Bar (Rate & Review + Watchlist + Like + Rewatch) */}
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
              accessibilityLabel="Rate & Review this movie"
            >
              <SymbolView name="sparkles" size={16} tintColor="#FFFFFF" weight="bold" />
              <Text style={styles.primaryLogButtonText}>Rate & Review</Text>
            </TouchableOpacity>

            {watchCount > 0 && (
              <Animated.View style={rewatchAnimatedStyle}>
                <TouchableOpacity
                  style={[
                    styles.rewatchButton,
                    {
                      backgroundColor: 'rgba(32, 31, 31, 0.7)',
                      borderColor: colors.accent,
                      borderWidth: 1.5,
                    },
                  ]}
                  onPress={handleRewatch}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Log a rewatch for today"
                >
                  <SymbolView
                    name={justRewatched ? 'checkmark' : 'arrow.clockwise'}
                    size={18}
                    tintColor={colors.accent}
                    weight="bold"
                  />
                </TouchableOpacity>
              </Animated.View>
            )}

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
          </View>

          {/* Quick Facts Strip */}
          <View style={styles.quickFactsRow}>
            {director && (
              <View style={styles.quickFactItem}>
                <Text style={styles.quickFactLabel}>DIRECTOR</Text>
                <Text style={[styles.quickFactValue, { color: colors.label }]} numberOfLines={1}>
                  {director.name}
                </Text>
              </View>
            )}
            {detail.status && (
              <View style={styles.quickFactItem}>
                <Text style={styles.quickFactLabel}>STATUS</Text>
                <Text style={[styles.quickFactValue, { color: colors.label }]} numberOfLines={1}>
                  {detail.status}
                </Text>
              </View>
            )}
            {detail.original_language && (
              <View style={styles.quickFactItem}>
                <Text style={styles.quickFactLabel}>LANGUAGE</Text>
                <Text style={[styles.quickFactValue, { color: colors.label }]}>
                  {detail.original_language.toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.quickFactItem}>
              <Text style={styles.quickFactLabel}>LOGGED</Text>
              <Text style={[styles.quickFactValue, { color: colors.label }]}>
                {watchCount > 0 ? `${watchCount}x` : 'Unwatched'}
              </Text>
            </View>
          </View>

          {/* User's Logged Rating / Review (If set) */}
          {localMovie?.my_rating != null && (
            <View style={styles.userLogCard}>
              <View style={styles.userLogHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <SymbolView name="star.fill" size={15} tintColor="#FFD60A" weight="bold" />
                  <Text style={styles.userLogTitle}>YOUR LOGGED RATING</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowLogSheet(true)}
                  style={styles.userLogEditButton}
                >
                  <SymbolView name="pencil" size={12} tintColor={colors.accent} weight="bold" />
                  <Text style={[styles.userLogEditText, { color: colors.accent }]}>Edit</Text>
                </TouchableOpacity>
              </View>
              <StarRatingControl
                value={localMovie.my_rating}
                onChange={() => {}}
                readOnly
                size={28}
                color={colors.accent}
              />
              {localMovie.my_review ? (
                <Text style={[styles.userReviewQuote, { color: colors.label }]}>
                  "{localMovie.my_review}"
                </Text>
              ) : null}
            </View>
          )}

          {/* Storyline / Synopsis Section */}
          {detail.overview ? (
            <View style={styles.synopsisCard}>
              <Text style={styles.sectionHeader}>Storyline</Text>
              <Text
                style={[styles.overviewText, { color: colors.label }]}
                numberOfLines={overviewExpanded ? undefined : 4}
              >
                {detail.overview}
              </Text>
              {detail.overview.length > 160 && (
                <TouchableOpacity
                  onPress={() => setOverviewExpanded((prev) => !prev)}
                  style={styles.readMoreButton}
                >
                  <Text style={[styles.readMoreText, { color: colors.accent }]}>
                    {overviewExpanded ? 'Show less' : 'Read more'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}

          {/* Top Cast Section */}
          {cast.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionHeader}>Top Cast</Text>
                <Text style={styles.sectionSubCount}>{cast.length} members</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.castRow}
              >
                {cast.map((member) => (
                  <View key={member.id} style={styles.castMember}>
                    <View style={styles.castAvatar}>
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

          {/* Community Reviews Section */}
          {communityReviews.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionHeader, { paddingHorizontal: Spacing.md, marginBottom: Spacing.sm }]}>
                Community Reviews
              </Text>
              <View style={styles.reviewsList}>
                {communityReviews.map((rev) => (
                  <View key={rev.id} style={styles.reviewCard}>
                    <View style={styles.reviewCardHeader}>
                      <View style={styles.reviewAuthorGroup}>
                        <View style={styles.reviewAvatar}>
                          <Text style={styles.reviewAvatarInitial}>
                            {rev.author ? rev.author.charAt(0).toUpperCase() : 'U'}
                          </Text>
                        </View>
                        <View>
                          <Text style={[styles.reviewAuthorName, { color: colors.label }]}>
                            {rev.author}
                          </Text>
                          <Text style={styles.reviewDate}>
                            {rev.created_at ? rev.created_at.slice(0, 10) : 'Recent'}
                          </Text>
                        </View>
                      </View>
                      {rev.author_details?.rating ? (
                        <View style={styles.communityRatingPill}>
                          <SymbolView name="star.fill" size={11} tintColor="#FFD60A" weight="bold" />
                          <Text style={styles.communityRatingText}>
                            {rev.author_details.rating} / 10
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={[styles.reviewBody, { color: 'rgba(229, 226, 225, 0.85)' }]} numberOfLines={3}>
                      {rev.content.replace(/\r\n/g, ' ')}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Similar Movies Carousel */}
          {similar.length > 0 && (
            <View style={styles.section}>
              <RowHeader title="More Like This" />
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

          {/* Franchise Universe Carousel */}
          {franchiseRow && franchiseRow.movies.length > 0 && (
            <View style={styles.section}>
              <RowHeader title={franchiseRow.title} />
              <FlashList
                horizontal
                data={franchiseRow.movies}
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
                    watched={hasWatched(item.id, 'movie')}
                    onPress={() => router.push(`/movie/${item.id}`)}
                  />
                )}
              />
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      )}

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
            backdropPath={detail.backdrop_path}
            genreLabel={detail.genres?.[0]?.name ?? null}
            releaseYear={year}
            dominantColor={localMovie?.dominant_color}
            existingReview={localMovie?.my_review ?? null}
            existingRating={localMovie?.my_rating ?? null}
            onChange={handleLogChanged}
            onDismiss={handleLogDismiss}
          />
        )}
      </Modal>
    </View>
  );
}

const POSTER_WIDTH = 118;
const POSTER_HEIGHT = Math.round(POSTER_WIDTH * 1.5);

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingHeader: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
  },
  circleNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(20, 20, 20, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  scroll: {
    paddingBottom: 60,
  },
  heroSection: {
    width: '100%',
    height: 440,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  heroGlowBlob: {
    position: 'absolute',
    top: 0,
    left: -40,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
  },
  heroForeground: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    zIndex: 10,
  },
  posterAndTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.md,
  },
  posterCard: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: Radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    // @ts-ignore
    borderCurve: 'continuous',
  },
  posterImage: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
  },
  titleInfoContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: 4,
  },
  genrePillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  genrePill: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  genrePillText: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#E9BCB6',
  },
  movieTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 30,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  metaItem: {
    fontSize: 13,
    fontWeight: '500',
    color: '#A0A0A0',
  },
  metaDot: {
    fontSize: 12,
    color: '#6E6E6E',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 214, 10, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.small,
  },
  ratingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFD60A',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginVertical: Spacing.md,
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
  rewatchButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    // @ts-ignore
    borderCurve: 'continuous',
  },
  quickFactsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: 14,
    backgroundColor: 'rgba(32, 31, 31, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  quickFactItem: {
    alignItems: 'center',
    gap: 2,
  },
  quickFactLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#8E8E93',
  },
  quickFactValue: {
    fontSize: 12.5,
    fontWeight: '600',
    maxWidth: 90,
  },
  userLogCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: 16,
    backgroundColor: 'rgba(28, 27, 27, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: Spacing.xs + 2,
  },
  userLogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  userLogTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#E9BCB6',
  },
  userLogEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(229, 9, 20, 0.12)',
  },
  userLogEditText: {
    fontSize: 11,
    fontWeight: '700',
  },
  userReviewQuote: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
    marginTop: 4,
  },
  synopsisCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: 16,
    backgroundColor: 'rgba(32, 31, 31, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    gap: Spacing.xs,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: '#E5E2E1',
  },
  overviewText: {
    fontSize: 14.5,
    lineHeight: 22,
    letterSpacing: -0.1,
    color: 'rgba(229, 226, 225, 0.9)',
  },
  readMoreButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  readMoreText: {
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    marginBottom: Spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  sectionSubCount: {
    fontSize: 12,
    color: '#8E8E93',
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
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
  reviewsList: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  reviewCard: {
    padding: Spacing.md,
    borderRadius: 14,
    backgroundColor: 'rgba(28, 27, 27, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    gap: 6,
  },
  reviewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewAuthorGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  reviewAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#353534',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarInitial: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFB4AA',
  },
  reviewAuthorName: {
    fontSize: 13,
    fontWeight: '600',
  },
  reviewDate: {
    fontSize: 10.5,
    color: '#8E8E93',
  },
  communityRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 214, 10, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.small,
  },
  communityRatingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFD60A',
  },
  reviewBody: {
    fontSize: 13,
    lineHeight: 19,
  },
});
