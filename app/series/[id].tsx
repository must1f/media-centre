import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';

import { ToggleButton } from '@/components/ToggleButton';
import { StarRatingControl } from '@/components/StarRatingControl';
import { SeasonPillSelector } from '@/components/SeasonPillSelector';
import { EpisodeRow } from '@/components/EpisodeRow';
import { RowHeader } from '@/components/RowHeader';
import { ErrorState } from '@/components/ErrorState';
import { useTheme } from '@/context/ThemeContext';
import { FontSize, FontWeight, Radius, Spacing, backdropUrl } from '@/constants/tokens';
import { getSeriesDetails, getSeasonDetails, firstAirYear, type TmdbSeriesDetail } from '@/services/tmdbTv';
import { upsertSeries, getSeries, setSeriesRating, type Series } from '@/db/series';
import { upsertSeason, getSeasonsForSeries } from '@/db/seasons';
import { upsertEpisode, getEpisodesForSeason, setEpisodeWatched, type Episode } from '@/db/episodes';
import { isLiked, toggleLike } from '@/db/likes';
import { isOnWatchlist, toggleWatchlist } from '@/db/watchlist';
import { logWatch } from '@/db/logEntries';

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
      setLocalSeries(getSeries(data.id));
      setLiked(isLiked(data.id, 'series'));
      setWatchlisted(isOnWatchlist(data.id, 'series'));

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
});
