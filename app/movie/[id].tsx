import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
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
import { upsertMovie, getMovie, setRating, type Movie } from '@/db/movies';
import { isLiked, toggleLike } from '@/db/likes';
import { isOnWatchlist, toggleWatchlist } from '@/db/watchlist';

import { QuickLogSheet } from './log';

function releaseYearFrom(detail: TmdbMovieDetail): number | null {
  const y = parseInt(detail.release_date?.slice(0, 4) ?? '', 10);
  return isNaN(y) ? null : y;
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

      // Cache metadata locally
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
      setLiked(isLiked(tmdbId));
      setWatchlisted(isOnWatchlist(tmdbId));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [tmdbId]);

  useEffect(() => { load(); }, [load]);

  function handleLikeToggle() {
    const next = toggleLike(tmdbId);
    setLiked(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleWatchlistToggle() {
    const next = toggleWatchlist(tmdbId);
    setWatchlisted(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleLogSaved() {
    setShowLogSheet(false);
    setLocalMovie(getMovie(tmdbId));
  }

  const similar: TmdbMovie[] = detail?.similar?.results?.slice(0, 10) ?? [];
  const cast = detail?.credits?.cast?.slice(0, 10) ?? [];
  const genreNames = detail?.genres?.map((g) => g.name).join(' · ') ?? '';

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
            {/* Poster + title header */}
            <View style={styles.heroRow}>
              <View style={[styles.posterWrapper, { backgroundColor: colors.secondaryBackground }]}>
                {detail.poster_path ? (
                  <Image
                    source={{ uri: posterUrl(detail.poster_path, 'w342') ?? '' }}
                    style={styles.poster}
                    contentFit="cover"
                    transition={200}
                  />
                ) : null}
              </View>

              <View style={styles.heroMeta}>
                <Text style={[styles.movieTitle, { color: colors.label }]} numberOfLines={4}>
                  {detail.title}
                </Text>
                {genreNames ? (
                  <Text style={[styles.genres, { color: colors.secondaryLabel }]} numberOfLines={2}>
                    {genreNames}
                  </Text>
                ) : null}
                {detail.release_date ? (
                  <Text style={[styles.year, { color: colors.secondaryLabel }]}>
                    {releaseYearFrom(detail)}
                    {detail.runtime ? ` · ${detail.runtime} min` : ''}
                  </Text>
                ) : null}

                {/* Action buttons */}
                <View style={styles.actionRow}>
                  <ToggleButton
                    type="like"
                    isActive={liked}
                    onToggle={handleLikeToggle}
                    size={22}
                  />
                  <ToggleButton
                    type="watchlist"
                    isActive={watchlisted}
                    onToggle={handleWatchlistToggle}
                    size={22}
                  />
                </View>
              </View>
            </View>

            {/* Log button */}
            <TouchableOpacity
              style={[styles.logButton, { backgroundColor: colors.accent }]}
              onPress={() => setShowLogSheet(true)}
              accessibilityRole="button"
              accessibilityLabel="Log this movie"
            >
              <Text style={styles.logButtonText}>Log This</Text>
            </TouchableOpacity>

            {/* User's rating */}
            {localMovie?.my_rating != null && (
              <View style={[styles.card, { backgroundColor: colors.secondaryBackground + 'CC', borderColor: colors.separator }]}>
                <Text style={[styles.cardLabel, { color: colors.secondaryLabel }]}>Your Rating</Text>
                <StarRatingControl
                  value={localMovie.my_rating}
                  onChange={() => {}} // read-only display; editing via log sheet
                  readOnly
                />
              </View>
            )}

            {/* User's review */}
            {localMovie?.my_review ? (
              <View style={[styles.card, { backgroundColor: colors.secondaryBackground + 'CC', borderColor: colors.separator }]}>
                <Text style={[styles.cardLabel, { color: colors.secondaryLabel }]}>Your Review</Text>
                <Text style={[styles.reviewText, { color: colors.label }]}>{localMovie.my_review}</Text>
              </View>
            ) : null}

            {/* Overview */}
            {detail.overview ? (
              <View style={[styles.card, { backgroundColor: colors.secondaryBackground + 'CC', borderColor: colors.separator }]}>
                <Text style={[styles.cardLabel, { color: colors.secondaryLabel }]}>Overview</Text>
                <Text style={[styles.overviewText, { color: colors.label }]}>{detail.overview}</Text>
              </View>
            ) : null}

            {/* Cast */}
            {cast.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.label }]}>Cast</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.castRow}>
                  {cast.map((member) => (
                    <View key={member.id} style={styles.castMember}>
                      <View style={[styles.castThumb, { backgroundColor: colors.secondaryBackground }]}>
                        {member.profile_path ? (
                          <Image
                            source={{ uri: posterUrl(member.profile_path, 'w185') ?? '' }}
                            style={StyleSheet.absoluteFill}
                            contentFit="cover"
                          />
                        ) : null}
                      </View>
                      <Text style={[styles.castName, { color: colors.label }]} numberOfLines={2}>{member.name}</Text>
                      <Text style={[styles.castCharacter, { color: colors.secondaryLabel }]} numberOfLines={1}>{member.character}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Similar movies */}
            {similar.length > 0 && (
              <View style={styles.section}>
                <RowHeader title="Similar Movies" />
                <FlashList
                  horizontal
                  data={similar}
                  keyExtractor={(item) => String(item.id)}
                  estimatedItemSize={165}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: Spacing.md }}
                  ItemSeparatorComponent={() => <View style={{ width: Spacing.sm }} />}
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

            <View style={{ height: 40 }} />
          </ScrollView>
        </PosterBackdrop>
      ) : null}

      {/* Quick-Log Sheet */}
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

const POSTER_WIDTH = 110;
const POSTER_HEIGHT = Math.round(POSTER_WIDTH * 1.5);

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingTop: 100, paddingBottom: 60 },
  heroRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  posterWrapper: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: Radius.medium,
    overflow: 'hidden',
    // @ts-ignore
    borderCurve: 'continuous',
  },
  poster: { width: POSTER_WIDTH, height: POSTER_HEIGHT },
  heroMeta: { flex: 1, justifyContent: 'flex-end', gap: Spacing.xs },
  movieTitle: { fontSize: FontSize.title, fontWeight: FontWeight.bold, lineHeight: 32 },
  genres: { fontSize: FontSize.subheadline },
  year: { fontSize: FontSize.subheadline },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  logButton: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.small,
    alignItems: 'center',
    // @ts-ignore
    borderCurve: 'continuous',
  },
  logButtonText: { color: '#FFFFFF', fontSize: FontSize.headline, fontWeight: FontWeight.semibold },
  card: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.xs,
    // @ts-ignore
    borderCurve: 'continuous',
  },
  cardLabel: { fontSize: FontSize.caption, fontWeight: FontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  reviewText: { fontSize: FontSize.body, lineHeight: 22 },
  overviewText: { fontSize: FontSize.body, lineHeight: 22 },
  section: { marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSize.headline, fontWeight: FontWeight.semibold, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  castRow: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
  castMember: { width: 70, gap: 4 },
  castThumb: { width: 70, height: 70, borderRadius: 35, overflow: 'hidden' },
  castName: { fontSize: FontSize.caption, fontWeight: FontWeight.semibold, lineHeight: 14 },
  castCharacter: { fontSize: FontSize.caption, lineHeight: 14 },
});
