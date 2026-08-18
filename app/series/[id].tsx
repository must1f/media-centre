import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';

import { ToggleButton } from '@/components/ToggleButton';
import { StarRatingControl } from '@/components/StarRatingControl';
import { SeasonPillSelector } from '@/components/SeasonPillSelector';
import { EpisodeRow } from '@/components/EpisodeRow';
import { RowHeader } from '@/components/RowHeader';
import { ErrorState } from '@/components/ErrorState';
import { CardFeedItem } from '@/components/CardFeedItem';
import { useTheme } from '@/context/ThemeContext';
import { FontSize, FontWeight, Radius, Spacing, backdropUrl, posterUrl } from '@/constants/tokens';
import { getSeriesDetails, getSeasonDetails, firstAirYear, type TmdbSeriesDetail } from '@/services/tmdbTv';
import { upsertSeries, getSeries, setSeriesRating, type Series } from '@/db/series';
import { upsertSeason, getSeasonsForSeries } from '@/db/seasons';
import { upsertEpisode, getEpisodesForSeason, setEpisodeWatched, type Episode } from '@/db/episodes';
import { isLiked, toggleLike } from '@/db/likes';
import { isOnWatchlist, toggleWatchlist } from '@/db/watchlist';
import { logWatch, getLogEntriesForMedia, type LogEntry } from '@/db/logEntries';

export default function SeriesDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tmdbId = parseInt(id ?? '0', 10);
  const { colors } = useTheme();

  const [detail, setDetail] = useState<TmdbSeriesDetail | null>(null);
  const [localSeries, setLocalSeries] = useState<Series | null>(null);
  const [activeSeasonNumber, setActiveSeasonNumber] = useState(1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [liked, setLiked] = useState(false);
  const [watchlisted, setWatchlisted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reviewDraft, setReviewDraft] = useState('');
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [newEntryDate, setNewEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [newEntryNote, setNewEntryNote] = useState('');
  const [dateError, setDateError] = useState(false);

  const loadSeason = useCallback(async (seasonNumber: number, seriesId: number) => {
    let season = getSeasonsForSeries(seriesId).find((s) => s.season_number === seasonNumber) ?? null;
    if (!season) {
      const tmdbSeason = await getSeasonDetails(seriesId, seasonNumber);
      const seasonId = upsertSeason({
        series_id: seriesId,
        season_number: tmdbSeason.season_number,
        name: tmdbSeason.name,
        poster_path: null,
        episode_count: tmdbSeason.episodes.length,
      });
      for (const ep of tmdbSeason.episodes) {
        upsertEpisode({
          season_id: seasonId,
          series_id: seriesId,
          episode_number: ep.episode_number,
          name: ep.name,
          overview: ep.overview,
          still_path: ep.still_path,
          air_date: ep.air_date,
          runtime: ep.runtime,
        });
      }
      season = getSeasonsForSeries(seriesId).find((s) => s.season_number === seasonNumber)!;
    }
    setEpisodes(getEpisodesForSeason(season.id));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getSeriesDetails(tmdbId);
      setDetail(data);

      upsertSeries({
        tmdb_id: data.id,
        name: data.name,
        poster_path: data.poster_path,
        dominant_color: null,
        first_air_year: firstAirYear(data.first_air_date),
        genres: JSON.stringify(data.genres.map((g) => g.name)),
        overview: data.overview,
        status: data.status,
      });
      const savedSeries = getSeries(data.id);
      setLocalSeries(savedSeries);
      setReviewDraft(savedSeries?.my_review ?? '');
      setLiked(isLiked(data.id, 'series'));
      setWatchlisted(isOnWatchlist(data.id, 'series'));
      setLogEntries(getLogEntriesForMedia(data.id, 'series'));

      const firstRealSeason = data.seasons.find((s) => s.season_number >= 1)?.season_number ?? 1;
      setActiveSeasonNumber(firstRealSeason);
      await loadSeason(firstRealSeason, data.id);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [tmdbId, loadSeason]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSelectSeason(seasonNumber: number) {
    setActiveSeasonNumber(seasonNumber);
    await loadSeason(seasonNumber, tmdbId);
  }

  function handleToggleEpisodeWatched(episode: Episode) {
    const nowWatched = !episode.watched;
    setEpisodeWatched(episode.id, nowWatched);
    if (nowWatched) {
      logWatch(tmdbId, 'series', new Date().toISOString().slice(0, 10));
      setLogEntries(getLogEntriesForMedia(tmdbId, 'series'));
    }
    setEpisodes(getEpisodesForSeason(episode.season_id));
  }

  function handleToggleLike() {
    const newState = toggleLike(tmdbId, 'series');
    setLiked(newState);
  }

  function handleToggleWatchlist() {
    const newState = toggleWatchlist(tmdbId, 'series');
    setWatchlisted(newState);
  }

  function handleRatingChange(value: number) {
    setSeriesRating(tmdbId, value, localSeries?.my_review ?? null, true);
    setLocalSeries(getSeries(tmdbId));
  }

  function handlePostReview() {
    setSeriesRating(tmdbId, localSeries?.my_rating ?? null, reviewDraft.trim() || null, true);
    setLocalSeries(getSeries(tmdbId));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function isValidDate(value: string): boolean {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return false;
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    const date = new Date(year, month - 1, day);
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  }

  function handleAddDiaryEntry() {
    if (!newEntryDate || !isValidDate(newEntryDate)) {
      setDateError(true);
      return;
    }
    setDateError(false);
    logWatch(tmdbId, 'series', newEntryDate, newEntryNote.trim() || null);
    setLogEntries(getLogEntriesForMedia(tmdbId, 'series'));
    setNewEntryNote('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (error || !detail) {
    return <ErrorState onRetry={load} />;
  }

  const cast = detail.credits?.cast?.slice(0, 10) ?? [];
  const similar = detail.similar?.results?.slice(0, 10) ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView>
        <View style={styles.heroWrapper}>
          <Image
            source={{ uri: backdropUrl(detail.backdrop_path, 'w780') ?? undefined }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
          <LinearGradient
            colors={['transparent', colors.background]}
            style={StyleSheet.absoluteFill}
          />
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <SymbolView name="chevron.left" size={20} tintColor="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.label }]}>{detail.name}</Text>
          <View style={styles.tagsRow}>
            {detail.genres[0] ? (
              <Text style={[styles.tag, { color: colors.secondaryLabel }]}>{detail.genres[0].name.toUpperCase()}</Text>
            ) : null}
            {firstAirYear(detail.first_air_date) ? (
              <Text style={[styles.tag, { color: colors.secondaryLabel }]}>{firstAirYear(detail.first_air_date)}</Text>
            ) : null}
            <View
              style={[
                styles.statusPill,
                { borderColor: detail.status === 'Ended' ? colors.tertiaryLabel : colors.accent },
              ]}
            >
              <Text
                style={[
                  styles.statusPillText,
                  { color: detail.status === 'Ended' ? colors.tertiaryLabel : colors.accent },
                ]}
              >
                {detail.status === 'Ended' ? 'ENDED' : 'ONGOING'}
              </Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <ToggleButton type="like" isActive={liked} onToggle={handleToggleLike} />
            <ToggleButton type="watchlist" isActive={watchlisted} onToggle={handleToggleWatchlist} />
          </View>

          <Text style={[styles.overview, { color: colors.secondaryLabel }]} numberOfLines={3}>
            {detail.overview}
          </Text>
        </View>

        <RowHeader title="Seasons" />
        <SeasonPillSelector
          seasons={detail.seasons
            .filter((s) => s.season_number >= 1)
            .map((s) => ({ seasonNumber: s.season_number, label: `Season ${s.season_number}` }))}
          activeSeasonNumber={activeSeasonNumber}
          onSelect={handleSelectSeason}
        />

        <View style={styles.episodeList}>
          {episodes.map((episode) => (
            <EpisodeRow
              key={episode.id}
              episodeNumber={episode.episode_number}
              title={episode.name ?? ''}
              stillPath={episode.still_path}
              runtimeMinutes={episode.runtime}
              watched={!!episode.watched}
              onToggleWatched={() => handleToggleEpisodeWatched(episode)}
              onPress={() => {}}
            />
          ))}
        </View>

        <View style={styles.content}>
          <Text style={[styles.sectionTitle, { color: colors.label }]}>Your Rating</Text>
          <StarRatingControl value={localSeries?.my_rating ?? null} onChange={handleRatingChange} />
        </View>

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
                      { backgroundColor: colors.tertiaryBackground },
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

        {/* More Like This */}
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
                  title={item.name}
                  posterPath={item.poster_path}
                  releaseYear={firstAirYear(item.first_air_date)}
                  onPress={() => router.push(`/series/${item.id}`)}
                />
              )}
            />
          </View>
        )}

        {/* Public Review */}
        <View style={styles.content}>
          <Text style={[styles.sectionTitle, { color: colors.label }]}>Public Review</Text>
          <TextInput
            style={[
              styles.reviewInput,
              {
                color: colors.label,
                backgroundColor: colors.secondaryBackground,
                borderColor: colors.tertiaryLabel,
              },
            ]}
            value={reviewDraft}
            onChangeText={setReviewDraft}
            placeholder="Share your thoughts on this series..."
            placeholderTextColor={colors.secondaryLabel}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <Pressable
            style={[styles.postButton, { backgroundColor: colors.accent }]}
            onPress={handlePostReview}
            accessibilityRole="button"
            accessibilityLabel="Post review"
          >
            <Text style={styles.postButtonText}>Post Review</Text>
          </Pressable>
        </View>

        {/* Private Diary */}
        <View style={styles.content}>
          <Text style={[styles.sectionTitle, { color: colors.label }]}>Private Diary</Text>

          <View style={styles.newEntryRow}>
            <TextInput
              style={[
                styles.dateInput,
                {
                  color: colors.label,
                  backgroundColor: colors.secondaryBackground,
                  borderColor: dateError ? '#FF3B30' : colors.tertiaryLabel,
                },
              ]}
              value={newEntryDate}
              onChangeText={(text) => {
                setNewEntryDate(text);
                if (dateError) setDateError(false);
              }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.secondaryLabel}
              maxLength={10}
            />
            <TextInput
              style={[
                styles.noteInput,
                {
                  color: colors.label,
                  backgroundColor: colors.secondaryBackground,
                  borderColor: colors.tertiaryLabel,
                },
              ]}
              value={newEntryNote}
              onChangeText={setNewEntryNote}
              placeholder="Note (optional)"
              placeholderTextColor={colors.secondaryLabel}
            />
            <Pressable
              style={[styles.newEntryButton, { backgroundColor: colors.accent }]}
              onPress={handleAddDiaryEntry}
              accessibilityRole="button"
              accessibilityLabel="New diary entry"
            >
              <SymbolView name="plus" size={16} tintColor="#FFFFFF" weight="bold" />
            </Pressable>
          </View>

          {dateError && (
            <Text style={[styles.dateErrorText, { color: '#FF3B30' }]}>
              Enter a valid date as YYYY-MM-DD
            </Text>
          )}

          {logEntries.map((entry) => (
            <View
              key={entry.id}
              style={[styles.diaryEntry, { borderColor: colors.tertiaryLabel }]}
            >
              <Text style={[styles.diaryDate, { color: colors.label }]}>{entry.watched_date}</Text>
              {entry.note ? (
                <Text style={[styles.diaryNote, { color: colors.secondaryLabel }]}>{entry.note}</Text>
              ) : null}
            </View>
          ))}
        </View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroWrapper: { width: '100%', aspectRatio: 16 / 9 },
  backButton: { position: 'absolute', top: Spacing.xl, left: Spacing.md },
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, gap: Spacing.sm },
  title: { fontSize: FontSize.title1, fontWeight: FontWeight.bold },
  tagsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  tag: { fontSize: FontSize.caption1, fontWeight: FontWeight.semibold, textTransform: 'uppercase' },
  statusPill: { borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  statusPillText: { fontSize: FontSize.caption2, fontWeight: FontWeight.bold },
  actionsRow: { flexDirection: 'row', gap: Spacing.sm },
  overview: { fontSize: FontSize.subheadline, lineHeight: 20 },
  episodeList: { paddingBottom: Spacing.md },
  sectionTitle: { fontSize: FontSize.title3, fontWeight: FontWeight.bold },
  section: { marginBottom: Spacing.md },
  sectionHeading: {
    fontSize: FontSize.title3,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  castRow: { paddingHorizontal: Spacing.md, gap: Spacing.md },
  castMember: { width: 72, alignItems: 'center', gap: 4 },
  castAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  castName: { fontSize: FontSize.caption1, fontWeight: FontWeight.semibold, textAlign: 'center', width: '100%' },
  castRole: { fontSize: FontSize.caption2, textAlign: 'center', width: '100%' },
  reviewInput: {
    minHeight: 90,
    borderWidth: 1,
    borderRadius: Radius.card,
    padding: Spacing.sm,
    fontSize: FontSize.body,
    lineHeight: 20,
  },
  postButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
  },
  postButtonText: { color: '#FFFFFF', fontSize: FontSize.subheadline, fontWeight: FontWeight.bold },
  newEntryRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  dateInput: {
    borderWidth: 1,
    borderRadius: Radius.card,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    fontSize: FontSize.subheadline,
    width: 110,
  },
  noteInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.card,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    fontSize: FontSize.subheadline,
  },
  newEntryButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateErrorText: {
    fontSize: FontSize.caption1,
    marginTop: Spacing.xs,
  },
  diaryEntry: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.sm,
    gap: 2,
  },
  diaryDate: { fontSize: FontSize.subheadline, fontWeight: FontWeight.semibold },
  diaryNote: { fontSize: FontSize.caption1, lineHeight: 18 },
});
