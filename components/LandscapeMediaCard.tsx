import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useTheme } from '@/context/ThemeContext';
import { FontSize, FontWeight, Radius, Spacing, backdropUrl, posterUrl } from '@/constants/tokens';
import { AnimatedPressable } from '@/components/AnimatedPressable';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(260, Math.round(SCREEN_WIDTH * 0.65));

interface LandscapeMediaCardProps {
  title: string;
  backdropPath?: string | null;
  posterPath?: string | null;
  progressPercent?: number; // 0 to 100
  subtitle?: string;
  onPress: () => void;
}

export function LandscapeMediaCard({
  title,
  backdropPath,
  posterPath,
  progressPercent = 65,
  subtitle = '42m left',
  onPress,
}: LandscapeMediaCardProps) {
  const { colors, colorScheme } = useTheme();
  const imageUrl = backdropUrl(backdropPath, 'w780') ?? posterUrl(posterPath, 'w780');

  return (
    <AnimatedPressable
      style={styles.container}
      onPress={onPress}
      scaleTo={0.94}
      accessibilityRole="button"
      accessibilityLabel={`Continue watching ${title}`}
    >
      {/* Landscape Image Container */}
      <View
        style={[
          styles.imageWrapper,
          {
            backgroundColor: colors.secondaryBackground,
            borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.06)',
            borderWidth: 1,
            ...colors.cardShadow,
          },
        ]}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
          />
        ) : null}

        {/* Dark Scrim */}
        <View style={[StyleSheet.absoluteFill, styles.scrim]} />

        {/* Center Frosted Play Button */}
        <View style={styles.playButtonWrapper}>
          <View style={styles.playButton}>
            <SymbolView name="play.fill" size={16} tintColor="#FFFFFF" weight="heavy" />
          </View>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.tertiaryBackground }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.max(5, Math.min(100, progressPercent))}%`,
              backgroundColor: colors.accent,
            },
          ]}
        />
      </View>

      {/* Title & Subtitle */}
      <View style={styles.textRow}>
        <Text style={[styles.title, { color: colors.label }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.subtitle, { color: colors.secondaryLabel }]}>
          {subtitle}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    marginRight: Spacing.sm + 2,
  },
  imageWrapper: {
    width: CARD_WIDTH,
    height: Math.round(CARD_WIDTH * 0.5625), // 16:9 aspect ratio
    borderRadius: Radius.medium,
    overflow: 'hidden',
    // @ts-ignore
    borderCurve: 'continuous',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrim: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  playButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  progressTrack: {
    height: 3.5,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: Spacing.xs + 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    paddingHorizontal: 2,
    gap: Spacing.xs,
  },
  title: {
    flex: 1,
    fontSize: FontSize.subheadline,
    fontWeight: FontWeight.semibold,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: FontSize.caption1,
    fontWeight: FontWeight.medium,
  },
});
