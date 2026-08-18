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
import { EpisodeRow } from '@/components/EpisodeRow';
import { RowHeader } from '@/components/RowHeader';
import { ErrorState } from '@/components/ErrorState';
import { CardFeedItem } from '@/components/CardFeedItem';
import { useTheme } from '@/context/ThemeContext';
import { FontSize, FontWeight, Radius, Spacing, backdropUrl, posterUrl } from '@/constants/tokens';
import {
  getAnimeDetails,
  getSimilarAnime,
  animeTitle,
  startYear,
  cleanDescription,
  type AniListMediaDetail,
} from '@/services/anilist';
import { upsertAnime, getAnime, setAnimeRating, type Anime } from '@/db/anime';
import {
  upsertAnimeEpisode,
  getEpisodesForAnime,
  setAnimeEpisodeWatched,
  getTotalAnimeEpisodeCount,
  type AnimeEpisode,
} from '@/db/animeEpisodes';
import db from '@/db/client';
import { isLiked, toggleLike } from '@/db/likes';
import { isOnWatchlist, toggleWatchlist } from '@/db/watchlist';
import { logWatch, getLogEntriesForMedia, deleteLogEntry, type LogEntry } from '@/db/logEntries';

export default function AnimeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const anilistId = parseInt(id ?? '0', 10);
  const { colors } = useTheme();

  const [detail, setDetail] = useState<AniListMediaDetail | null>(null);
  const [localAnime, setLocalAnime] = useState<Anime | null>(null);
  const [episodes, setEpisodes] = useState<AnimeEpisode[]>([]);
  const [liked, setLiked] = useState(false);
  const [watchlisted, setWatchlisted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reviewDraft, setReviewDraft] = useState('');
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [newEntryDate, setNewEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [newEntryNote, setNewEntryNote] = useState('');
  const [dateError, setDateError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getAnimeDetails(anilistId);
      setDetail(data);

      upsertAnime({
        anilist_id: data.id,
        title: animeTitle(data.title),
        poster_path: data.coverImage.large,
        dominant_color: null,
        start_year: startYear(data),
        genres: JSON.stringify(data.genres),
        overview: cleanDescription(data.description),
        status: data.status,
        episode_count: data.episodes,
      });
      const savedAnime = getAnime(data.id);
      setLocalAnime(savedAnime);
      setReviewDraft(savedAnime?.my_review ?? '');
      setLiked(isLiked(data.id, 'anime'));
      setWatchlisted(isOnWatchlist(data.id, 'anime'));
      setLogEntries(getLogEntriesForMedia(data.id, 'anime'));

      // AniList has no per-episode numbering on streamingEpisodes — build a
      // flat 1..N list (N = known episode count, falling back to however
      // many streaming episode entries AniList returned while airing) and
      // match streamingEpisodes to episode numbers positionally.
      const totalEpisodes = data.episodes ?? data.streamingEpisodes.length;
      if (getTotalAnimeEpisodeCount(data.id) !== totalEpisodes) {
        db.withTransactionSync(() => {
          for (let i = 0; i < totalEpisodes; i += 1) {
            const streaming = data.streamingEpisodes[i];
            upsertAnimeEpisode({
              anime_id: data.id,
              episode_number: i + 1,
              title: streaming?.title ?? null,
              thumbnail: streaming?.thumbnail ?? null,
            });
          }
        });
      }
      setEpisodes(getEpisodesForAnime(data.id));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [anilistId]);

  useEffect(() => {
    load();
  }, [load]);

  function handleToggleEpisodeWatched(episode: AnimeEpisode) {
    const nowWatched = !episode.watched;
    setAnimeEpisodeWatched(episode.id, nowWatched);
    const today = new Date().toISOString().slice(0, 10);
    if (nowWatched) {
      logWatch(anilistId, 'anime', today);
    } else {
      const markedDate = episode.watched_at?.slice(0, 10) ?? today;
      const markedEntry = getLogEntriesForMedia(anilistId, 'anime').find(
        (entry) => entry.watched_date === markedDate,
      );
      if (markedEntry) {
        deleteLogEntry(markedEntry.id);
      }
    }
    setLogEntries(getLogEntriesForMedia(anilistId, 'anime'));
    setEpisodes(getEpisodesForAnime(anilistId));
  }

  function handleToggleLike() {
    const newState = toggleLike(anilistId, 'anime');
    setLiked(newState);
  }

  function handleToggleWatchlist() {
    const newState = toggleWatchlist(anilistId, 'anime');
    setWatchlisted(newState);
  }

  function handleRatingChange(value: number) {
    setAnimeRating(anilistId, value, localAnime?.my_review ?? null, true);
    setLocalAnime(getAnime(anilistId));
  }

  function handlePostReview() {
    setAnimeRating(anilistId, localAnime?.my_rating ?? null, reviewDraft.trim() || null, true);
    setLocalAnime(getAnime(anilistId));
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
    logWatch(anilistId, 'anime', newEntryDate, newEntryNote.trim() || null);
    setLogEntries(getLogEntriesForMedia(anilistId, 'anime'));
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

  const cast = detail.characters?.edges?.slice(0, 10) ?? [];
  const similar = getSimilarAnime(detail);
  const isOngoing = detail.status === 'RELEASING';

  const listHeader = (
    <>
      <View style={styles.heroWrapper}>
        <Image
          source={{ uri: backdropUrl(detail.coverImage.large) ?? undefined }}
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
        <Text style={[styles.title, { color: colors.label }]}>{animeTitle(detail.title)}</Text>
        <View style={styles.tagsRow}>
          {detail.genres[0] ? (
            <Text style={[styles.tag, { color: colors.secondaryLabel }]}>{detail.genres[0].toUpperCase()}</Text>
          ) : null}
          {startYear(detail) ? (
            <Text style={[styles.tag, { color: colors.secondaryLabel }]}>{startYear(detail)}</Text>
          ) : null}
          <View
            style={[
              styles.statusPill,
              { borderColor: isOngoing ? colors.accent : colors.tertiaryLabel },
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                { color: isOngoing ? colors.accent : colors.tertiaryLabel },
              ]}
            >
              {isOngoing ? 'ONGOING' : (detail.status?.replace(/_/g, ' ') ?? 'UNKNOWN')}
            </Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <ToggleButton type="like" isActive={liked} onToggle={handleToggleLike} />
          <ToggleButton type="watchlist" isActive={watchlisted} onToggle={handleToggleWatchlist} />
        </View>

        <Text style={[styles.overview, { color: colors.secondaryLabel }]} numberOfLines={3}>
          {cleanDescription(detail.description) ?? ''}
        </Text>
      </View>

      <RowHeader title="Episodes" />
    </>
  );

  const listFooter = (
    <>
      <View style={styles.content}>
        <Text style={[styles.sectionTitle, { color: colors.label }]}>Your Rating</Text>
        <StarRatingControl value={localAnime?.my_rating ?? null} onChange={handleRatingChange} />
      </View>

      {cast.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.label }]}>Cast</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.castRow}
          >
            {cast.map((edge) => (
              <View key={edge.node.id} style={styles.castMember}>
                <View
                  style={[
                    styles.castAvatar,
                    { backgroundColor: colors.tertiaryBackground },
                  ]}
                >
                  {edge.node.image.medium ? (
                    <Image
                      source={{ uri: posterUrl(edge.node.image.medium) ?? '' }}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                    />
                  ) : (
                    <SymbolView name="person.fill" size={24} tintColor={colors.secondaryLabel} />
                  )}
                </View>
                <Text style={[styles.castName, { color: colors.label }]} numberOfLines={1}>
                  {edge.node.name.full}
                </Text>
                <Text style={[styles.castRole, { color: colors.secondaryLabel }]} numberOfLines={1}>
                  {edge.role}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

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
                title={animeTitle(item.title)}
                posterPath={item.coverImage.large}
                releaseYear={item.startDate.year}
                onPress={() => router.push(`/anime/${item.id}`)}
              />
            )}
          />
        </View>
      )}

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
          placeholder="Share your thoughts on this anime..."
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
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <FlashList
        data={episodes}
        keyExtractor={(episode) => String(episode.id)}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        contentContainerStyle={styles.episodeList}
        renderItem={({ item: episode }) => (
          <EpisodeRow
            episodeNumber={episode.episode_number}
            title={episode.title ?? `Episode ${episode.episode_number}`}
            stillPath={episode.thumbnail}
            runtimeMinutes={null}
            watched={!!episode.watched}
            showSeasonPrefix={false}
            onToggleWatched={() => handleToggleEpisodeWatched(episode)}
            onPress={() => {}}
          />
        )}
      />
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
