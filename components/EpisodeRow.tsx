import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Radius, Spacing, FontSize, FontWeight, stillUrl } from '@/constants/tokens';
import { useTheme } from '@/context/ThemeContext';
import { AnimatedPressable } from '@/components/AnimatedPressable';

interface EpisodeRowProps {
  episodeNumber: number;
  title: string;
  stillPath: string | null;
  runtimeMinutes: number | null;
  watched: boolean;
  /** 0-1 in-progress fraction. When set, renders a progress bar instead of the runtime caption. */
  progressFraction?: number | null;
  onToggleWatched: () => void;
  onPress: () => void;
}

export function EpisodeRow({
  episodeNumber,
  title,
  stillPath,
  runtimeMinutes,
  watched,
  progressFraction,
  onToggleWatched,
  onPress,
}: EpisodeRowProps) {
  const { colors } = useTheme();
  const imageUrl = stillUrl(stillPath, 'w300');

  return (
    <AnimatedPressable
      onPress={onPress}
      style={styles.container}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={`Episode ${episodeNumber}, ${title}`}
    >
      <View
        style={[
          styles.thumbnail,
          {
            backgroundColor: colors.secondaryBackground,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.10)',
          },
        ]}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        ) : null}
      </View>

      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: colors.label }]} numberOfLines={1}>
          {`S·E${episodeNumber} — ${title}`}
        </Text>
        {progressFraction != null ? (
          <View style={[styles.progressTrack, { backgroundColor: colors.tertiaryBackground }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: colors.accent, width: `${Math.round(progressFraction * 100)}%` },
              ]}
            />
          </View>
        ) : runtimeMinutes != null ? (
          <Text style={[styles.meta, { color: colors.secondaryLabel }]}>{`${runtimeMinutes}m`}</Text>
        ) : null}
      </View>

      <AnimatedPressable onPress={onToggleWatched} style={styles.watchedToggle} scaleTo={0.85} accessibilityRole="button" accessibilityLabel={watched ? 'Mark unwatched' : 'Mark watched'}>
        <SymbolView
          name={watched ? 'checkmark.circle.fill' : 'circle'}
          size={26}
          tintColor={watched ? colors.accent : colors.tertiaryLabel}
          weight="regular"
        />
      </AnimatedPressable>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  thumbnail: {
    width: 96,
    height: 54, // 16:9
    borderRadius: Radius.small,
    overflow: 'hidden',
    // @ts-ignore
    borderCurve: 'continuous',
  },
  textContainer: {
    flex: 1,
    gap: Spacing.xxs,
  },
  title: {
    fontSize: FontSize.subheadline,
    fontWeight: FontWeight.semibold,
  },
  meta: {
    fontSize: FontSize.caption1,
  },
  progressTrack: {
    height: 4,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    marginTop: Spacing.xxs,
  },
  progressFill: {
    height: 4,
    borderRadius: Radius.pill,
  },
  watchedToggle: {
    padding: Spacing.xs,
  },
});
